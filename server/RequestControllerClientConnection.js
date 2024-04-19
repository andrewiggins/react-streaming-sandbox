import { DurableObject } from "cloudflare:workers";
import debug from "debug";
import { MockRequestEvent, RequestController } from "./RequestController.js";

const log = debug("RSS:RequestControllerClientConnection");

/**
 * @typedef {import("cloudflare:workers").RpcStub<T>} RpcStub
 * @template {Rpc.Stubable} T
 * @typedef {import("./RequestController.js").MockRequestEvents} MockRequestEvents
 * @typedef {import("./RequestController.js").MockRequestEventType} MockRequestEventType
 */

/**
 * `handleErrors()` is a little utility function that can wrap an HTTP request
 * handler in a try/catch and return errors to the client. You probably wouldn't
 * want to use this in production code but it is convenient when debugging and
 * iterating.
 * @param {Request} request
 * @param {() => Promise<Response>} func
 * @returns {Promise<Response>}
 */
async function handleErrors(request, func) {
	try {
		return await func();
	} catch (err) {
		const error = /** @type {Error} */ (err);
		if (request.headers.get("Upgrade") == "websocket") {
			// Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
			// won't show us the response body! So... let's send a WebSocket response with an error
			// frame instead.
			let pair = new WebSocketPair();
			pair[1].accept();
			pair[1].send(JSON.stringify({ error: error.stack }));
			pair[1].close(1011, "Uncaught exception during session setup");
			return new Response(null, { status: 101, webSocket: pair[0] });
		} else {
			return new Response(error.stack, { status: 500 });
		}
	}
}

export class RequestControllerClientConnection extends DurableObject {
	/**
	 * @param {DurableObjectState} ctx
	 * @param {Environment} env
	 */
	constructor(ctx, env) {
		super(ctx, env);
		/** @type {Set<WebSocket>} */
		this.sessions = new Set();
	}

	/** @type {(request: Request) => Promise<Response>} */
	async fetch(request) {
		return handleErrors(request, async () => {
			const url = new URL(request.url);

			if (url.pathname === "/request-controller") {
				// Expect to receive a WebSocket Upgrade request.
				// If there is one, accept the request and return a WebSocket Response.
				const upgradeHeader = request.headers.get("Upgrade");
				if (!upgradeHeader || upgradeHeader !== "websocket") {
					return new Response("Durable Object expected Upgrade: websocket", { status: 426 });
				}

				// Creates two ends of a WebSocket connection.
				const webSocketPair = new WebSocketPair();
				const [client, server] = Object.values(webSocketPair);

				// Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
				// request within the Durable Object. It has the effect of "accepting" the connection,
				// and allowing the WebSocket to send and receive messages.
				// Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
				// is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
				// the connection is open. During periods of inactivity, the Durable Object can be evicted
				// from memory, but the WebSocket connection will remain open. If at some later point the
				// WebSocket receives a message, the runtime will recreate the Durable Object
				// (run the `constructor`) and deliver the message to the appropriate handler.
				this.ctx.acceptWebSocket(server);
				this.sessions.add(server);

				return new Response(null, {
					status: 101,
					webSocket: client,
				});
			}

			return new Response("Not found", { status: 404 });
		});
	}

	/** @type {(ws: WebSocket, message: ArrayBuffer | string) => Promise<void>} */
	async webSocketMessage(ws, message) {
		try {
			/** @type {RequestControllerClientEvent | { type: "ping" } | undefined} */
			let event;
			try {
				event = JSON.parse(message.toString());
			} catch {}

			if (!event) {
				log(`Received ${JSON.stringify(message)} which is not an JSON object. Ignoring...`);
				return;
			} else if (!this.requestController) {
				log(`Received ${JSON.stringify(event?.type ?? message)} but no request controller set. Ignoring...`);
				return;
			}

			log("webSocketMessage %o", event);

			// Handle the message.
			// TODO: Make work
			if (event.type === "ping") {
				ws.send(JSON.stringify({ type: "pong" }));
			} else if (event.type === "request-pause") {
				await this.requestController.pause(event.requestId);
			} else if (event.type === "request-resume") {
				await this.requestController.resume(event.requestId);
			} else if (event.type === "pause-new-requests") {
				// this.requestController.areNewRequestsPaused = event.value;
			}
		} catch (e) {
			// Report any exceptions directly back to the client. As with our handleErrors() this
			// probably isn't what you'd want to do in production, but it's convenient when testing.
			ws.send(JSON.stringify({ error: /** @type {Error} */ (e).stack }));
		}
	}

	/** @type {(ws: WebSocket, code: number, reason: string, wasClean: boolean) => Promise<void>} */
	async webSocketClose(ws, code, reason, wasClean) {
		// If the client closes the connection, the runtime will invoke the webSocketClose() handler.
		ws.close(code, "Durable Object is closing WebSocket");
		this.sessions.delete(ws);
	}

	/** @type {(ws: WebSocket, error: unknown) =>Promise<void>} */
	async webSocketError(ws, error) {
		console.error("WebSocket error:", error);
		ws.close(1011, "WebSocket error");
		this.sessions.delete(ws);
	}

	/** @type {(event: MockRequestEvent<any> | string) => void} */
	sendRequestEvent(event) {
		log(`sendRequestEvent to %d sessions: %o`, this.sessions.size, event);
		this.sessions.forEach((ws) => {
			ws.send(typeof event === "string" ? event : JSON.stringify(event));
		});
	}
}
