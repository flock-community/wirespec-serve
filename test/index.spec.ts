// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Wirespec worker', () => {

	it('responds with todo list', async () => {
		await env.WIRESPEC.put("sha", wirespec);
		const request = new IncomingRequest(
			'http://sha.serve.wirespec.io/todos',
			{
				headers:{
					"x-wirespec-status": "500"
				}
			}
		);
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		const json = await response.json()

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
		expect(JSON.parse(json)).to.be.length(5);
	});
});

const wirespec = `type UUID /^[0-9a-f]{8}\\b-[0-9a-f]{4}\\b-[0-9a-f]{4}\\b-[0-9a-f]{4}\\b-[0-9a-f]{12}$/g
type Name /^[0-9a-zA-Z]{1,50}$/g
type DutchPostalCode /^([0-9]{4}[A-Z]{2})$/g
type Date /^([0-9]{2}-[0-9]{2}-20[0-9]{2})$/g

type Address {
  street: Name,
  houseNumber: Integer,
  postalCode: DutchPostalCode
}

type Person {
  firstname: Name,
  lastName: Name,
  age: Integer,
  address: Address
}

type Todo {
  id: UUID,
  person: Person,
  done: Boolean,
  prio: Integer,
  date: Date
}

type Error {
  reason: String
}

endpoint GetTodos GET /todos -> {
    200 -> Todo[]
}


endpoint GetTodosById GET /todos/{id:UUID} -> {
    200 -> Todo[]
}

endpoint PostTodo POST Todo /todos -> {
    200 -> Todo
}

endpoint PutTodo PUT Todo /todos/{id: UUID} -> {
    200 -> Todo
    404 -> Error
}

endpoint DeleteTodo DELETE /todos/{id: UUID} -> {
    200 -> Todo
    404 -> Error
}`
