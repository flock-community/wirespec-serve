import {community} from '@flock/wirespec';
import {error, IRequest, json, Route, Router} from 'itty-router'
import WsSegment = community.flock.wirespec.compiler.lib.WsSegment;
import WsParam = community.flock.wirespec.compiler.lib.WsParam;
import WsLiteral = community.flock.wirespec.compiler.lib.WsLiteral;
import WsEndpoint = community.flock.wirespec.compiler.lib.WsEndpoint;
import WsReference = community.flock.wirespec.compiler.lib.WsReference;
import WsResponse = community.flock.wirespec.compiler.lib.WsResponse;
import WsCustom = community.flock.wirespec.compiler.lib.WsCustom;

const {parse, generate} = community.flock.wirespec.plugin.npm;

type AST = Array<community.flock.wirespec.compiler.lib.WsNode>

export interface Env {
    WIRESPEC: KVNamespace;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const chunks = url.hostname?.split('.');
        const wirespec = await env.WIRESPEC.get(chunks[0]);

        if (!wirespec) {
            const body = await request.blob();
            const text = await body.text();
            const ast = parse(text.trim());
            if (ast.result) {
                const hash = await getSHA256Hash(text);
                await env.WIRESPEC.put(hash, text);
                return new Response(hash);
            }
            if (ast.errors) {
                return new Response(
                    ast?.errors?.map(it => it.value).join(),
                    {status: 500}
                );
            }
            return new Response("Cannot read wirespec", {status: 500});
        } else {
            const ast = parse(wirespec);
            if (ast.result) {
                const handle = (res: WsResponse): Response => {
                    const reference = res.content?.reference
                    if (reference && reference instanceof WsCustom) {
                        const ref = reference.value + (reference.isIterable ? "[]" : "")
                        const res = generate(wirespec, ref).result ?? "{}"
                        return json(JSON.parse(res));
                    } else {
                        return error(404)
                    }
                    return new Response("wirespec");
                }

                return router(ast.result)(handle).fetch(request)
            }
            if (ast.errors) {
                const error = ast?.errors?.map(it => it.value).join();
                return new Response(error, {status: 500});
            }
            return new Response(wirespec);

        }

    }
};

const getSHA256Hash = async (str: string) => {
    const textAsBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
        .map((item) => item.toString(16).padStart(2, '0'))
        .join('');
};

const router = (ast: AST) => (handle: (res: WsResponse) => Response) => {

    return ast
        .reduce((router, definition) => {
            const mapRouter: Record<string, Route<IRequest, Array<any>>> = {
                "DELETE": router.delete,
                "GET": router.get,
                "HEAD": router.head,
                "OPTIONS": router.options,
                "PATCH": router.patch,
                "POST": router.post,
                "PUT": router.put,
            }

            if (definition instanceof WsEndpoint) {
                const path = buildPath(definition.path)
                const route = mapRouter[definition.method.name]
                return route.call(router, path, async () => {
                    const response = definition.responses.find(it => it.status === "200")
                    if (response) {
                        return handle(response);
                    } else {
                        return error(404);
                    }
                })
            }

            return router;
        }, Router())
        .all('*', () => error(404))
}

const buildPath = (path: WsSegment[]) => {
    return "/" + path
        .map(it => {
            if (it instanceof WsParam) return ":" + it.identifier.value
            if (it instanceof WsLiteral) return it.value
        })
        .join("/")
}

const generateMock = (src: string, reference: WsReference) => {
    if (reference instanceof WsCustom) {
        return generate(src, reference.value)
    }

}
