/// <reference types="@cloudflare/vitest-pool-workers" />

import { env, createExecutionContext, waitOnExecutionContext, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src";

/**
 * @typedef {unknown} CfHostMetadata
 * @typedef {Request<CfHostMetadata, IncomingRequestCfProperties<CfHostMetadata>>} IncomingRequest
 * @type {(url: string) => IncomingRequest}
 */
function createRequest(url) {
	return /** @type {Request<CfHostMetadata, IncomingRequestCfProperties<CfHostMetadata>>} */ (new Request(url));
}

describe("Hello World worker", () => {
	it("responds with Hello World! (unit style)", async () => {
		const request = createRequest("http://example.com");
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});

	// TODO: Figure this out...
	// it("responds with Hello World! (integration style)", async () => {
	// 	const response = await SELF.fetch(request, env, ctx);
	// 	expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	// });
});
