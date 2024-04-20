// Adapted from https://github.com/withastro/astro/blob/2dca81bf2174cd5c27cb63cb0ae081ea2a1ac771/packages/integrations/vercel/src/serverless/request-transform.ts#L2

import { splitCookiesString } from "set-cookie-parser";
import { ReadableStream } from "node:stream/web";

// const clientAddressSymbol = Symbol.for('astro.clientAddress');

/*
  Credits to the SvelteKit team
	https://github.com/sveltejs/kit/blob/8d1ba04825a540324bc003e85f36559a594aadc2/packages/kit/src/exports/node/index.js
*/

/**
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {number} [body_size_limit]
 * @returns {ReadableStream | null}
 */
function get_raw_body(req, body_size_limit) {
	const h = req.headers;

	if (!h["content-type"]) {
		return null;
	}

	const content_length = Number(h["content-length"]);

	// check if no request body
	if ((req.httpVersionMajor === 1 && isNaN(content_length) && h["transfer-encoding"] == null) || content_length === 0) {
		return null;
	}

	let length = content_length;

	if (body_size_limit) {
		if (!length) {
			length = body_size_limit;
		} else if (length > body_size_limit) {
			throw new HTTPError(413, `Received content-length of ${length}, but only accept up to ${body_size_limit} bytes.`);
		}
	}

	if (req.destroyed) {
		const readable = new ReadableStream();
		readable.cancel();
		return readable;
	}

	let size = 0;
	let cancelled = false;

	return new ReadableStream({
		start(controller) {
			req.on("error", (error) => {
				cancelled = true;
				controller.error(error);
			});

			req.on("end", () => {
				if (cancelled) return;
				controller.close();
			});

			req.on("data", (chunk) => {
				if (cancelled) return;

				size += chunk.length;
				if (size > length) {
					cancelled = true;
					controller.error(
						new HTTPError(413, `request body size exceeded ${content_length ? "'content-length'" : "BODY_SIZE_LIMIT"} of ${length}`),
					);
					return;
				}

				controller.enqueue(chunk);

				if (controller.desiredSize === null || controller.desiredSize <= 0) {
					req.pause();
				}
			});
		},

		pull() {
			req.resume();
		},

		cancel(reason) {
			cancelled = true;
			req.destroy(reason);
		},
	});
}

/**
 * @param {string} base
 * @param {import('node:http').IncomingMessage} req
 * @param {number} [bodySizeLimit]
 * @returns {Promise<Request>}
 */
export async function getRequest(base, req, bodySizeLimit) {
	let headers = /** @type {Record<string, string>} */ (req.headers);
	let request = new Request(base + req.url, {
		duplex: "half",
		method: req.method,
		headers,
		body: get_raw_body(req, bodySizeLimit),
	});
	// Reflect.set(request, clientAddressSymbol, headers['x-forwarded-for']);
	return request;
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {Response} response
 * @returns {Promise<void>}
 */
export async function setResponse(res, response) {
	const headers = Object.fromEntries(response.headers);
	/** @type {string[]} */
	let cookies = [];

	if (response.headers.has("set-cookie")) {
		const header = /** @type {string} */ (response.headers.get("set-cookie"));
		const split = splitCookiesString(header);
		cookies = split;
	}

	res.writeHead(response.status, { ...headers, "set-cookie": cookies });

	if (!response.body) {
		res.end();
		return;
	}

	if (response.body.locked) {
		res.write(
			"Fatal error: Response body is locked. " +
				`This can happen when the response was already read (for example through 'response.json()' or 'response.text()').`,
		);
		res.end();
		return;
	}

	const reader = response.body.getReader();

	if (res.destroyed) {
		reader.cancel();
		return;
	}

	/** @type {(error?: Error) => void} */
	const cancel = (error) => {
		res.off("close", cancel);
		res.off("error", cancel);

		// If the reader has already been interrupted with an error earlier,
		// then it will appear here, it is useless, but it needs to be catch.
		reader.cancel(error).catch(() => {});
		if (error) res.destroy(error);
	};

	res.on("close", cancel);
	res.on("error", cancel);

	next();
	async function next() {
		try {
			for (;;) {
				const { done, value } = await reader.read();

				if (done) break;

				if (!res.write(value)) {
					res.once("drain", next);
					return;
				}
			}
			res.end();
		} catch (error) {
			cancel(error instanceof Error ? error : new Error(String(error)));
		}
	}
}

class HTTPError extends Error {
	/** @type {number} */
	status;

	/**
	 * @param {number} status
	 * @param {string} reason
	 */
	constructor(status, reason) {
		super(reason);
		this.status = status;
	}

	get reason() {
		return super.message;
	}
}
