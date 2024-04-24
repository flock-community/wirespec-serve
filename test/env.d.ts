declare module "cloudflare:test" {
    interface ProvidedEnv {
        WIRESPEC: KVNamespace;
    }
    // ...or if you have an existing `Env` type...
    interface ProvidedEnv extends Env {}
}