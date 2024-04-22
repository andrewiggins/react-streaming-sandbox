import { createServer } from "http";
import path from "path";
import sirv from "sirv";
import { WebSocketServer } from "ws";
import { getRequest, setResponse } from "./request-transform.js";
import worker, { requestControllers } from "./_worker.js";
import debug from "debug";
import { RCIDName } from "../shared/constants.js";
import { MockRequestEvent } from "../shared/RequestController.js";

const __dirname = new URL(".", import.meta.url).pathname;
/** @type {(...args: string[]) => string} */
const p = (...args) => path.join(__dirname, "..", ...args);

const port = 8787;
const base = "http://localhost:" + port;

const server = createServer();
const serveStatic = sirv(p("dist"), { dev: true });
const wss = new WebSocketServer({ server });

wss.on("connection", function connection(ws, request) {
	if (!request.url) throw new Error("No request URL");
	const url = new URL(request.url, base);
	setupWebSocket(ws, url);
});

server.on("request", async (incomingMessage, serverRes) => {
	const request = await getRequest(base, incomingMessage);

	let handled = false;
	/** @type {Environment} */
	const environment = {
		ASSETS: {
			async fetch() {
				serveStatic(incomingMessage, serverRes);
				handled = true;
				return new Response();
			},
		},
	};

	const res = await worker.fetch(request, environment, {});
	if (!handled) setResponse(serverRes, res);
});

// TODO: restrict websocket to /request-controller
// server.on("upgrade", function upgrade(request, socket, head) {
// 	const { pathname } = new URL(request.url, "wss://base.url");
//
// 	if (pathname === "/foo") {
// 		wss1.handleUpgrade(request, socket, head, function done(ws) {
// 			wss1.emit("connection", ws, request);
// 		});
// 	} else if (pathname === "/bar") {
// 		wss2.handleUpgrade(request, socket, head, function done(ws) {
// 			wss2.emit("connection", ws, request);
// 		});
// 	} else {
// 		socket.destroy();
// 	}
// });

server.listen(port);

const webSocketLog = debug("RSS:webSocket");

/** @type {(ws: import('ws').WebSocket, url: URL) => void} */
function setupWebSocket(ws, url) {
	const rcId = url.searchParams.get(RCIDName);
	if (!rcId) throw new Error("Missing rcId param");

	const rc = requestControllers.get(rcId);
	if (!rc) throw new Error("No request controller found");

	webSocketLog("Accepted WebSocket connection %s", rcId);

	ws.addEventListener("open", () => {
		webSocketLog("Connection opened %s", rcId);
	});
	ws.addEventListener("message", async (event) => {
		await handleWebSocketMessage(rcId, ws, event.data);
	});
	ws.addEventListener("close", (event) => {
		webSocketLog("Closing %s", rcId);
		// TODO: Should I do this??
		// requestControllers.delete(rcId);
	});
	ws.addEventListener("error", (event) => {
		webSocketLog("Error: %s", event.error.stack);
		// TODO: Should I do this??
		// requestControllers.delete(rcId);
	});

	rc.addEventListener("new-request", async (event) => {
		webSocketLog("Sending new request %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});
	rc.addEventListener("request-complete", async (event) => {
		webSocketLog("Sending request complete %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});

	/** @type {SyncEvent} */
	const initEvent = {
		type: "sync",
		detail: { requests: Array.from(rc.requests.entries()), latency: rc.latency, areNewRequestsPaused: rc.areNewRequestsPaused },
	};
	ws.send(JSON.stringify(initEvent));
}

/** @type {(rcId: string, ws: import('ws').WebSocket, message: Buffer[] | ArrayBuffer | string) => Promise<void>} */
async function handleWebSocketMessage(rcId, ws, message) {
	try {
		/** @type {MockRequestEventMap[keyof MockRequestEventMap] | { type: "ping" } | undefined} */
		let event;
		try {
			event = JSON.parse(message.toString());
		} catch {}

		const requestController = requestControllers.get(rcId);

		if (!event) {
			webSocketLog(`Received ${JSON.stringify(message)} which is not an JSON object. Ignoring...`);
			return;
		} else if (!requestController) {
			webSocketLog(`Received ${JSON.stringify(event?.type ?? message)} but no request controller set. Ignoring...`);
			return;
		}

		webSocketLog(`Received message %s`, event);

		// Handle the message.
		if (event.type === "ping") {
			webSocketLog("Sending pong...");
			ws.send(JSON.stringify({ type: "pong" }));
		} else if (event.type === "request-pause") {
			requestController.pause(event.detail.request.id);
			const response = reflectBackRequestEvent(event, requestController, event.detail.request.id);
			ws.send(JSON.stringify(response));
		} else if (event.type === "request-resume") {
			requestController.resume(event.detail.request.id);
			const response = reflectBackRequestEvent(event, requestController, event.detail.request.id);
			ws.send(JSON.stringify(response));
		} else if (event.type === "pause-new-requests") {
			requestController.areNewRequestsPaused = event.detail.value;
			ws.send(JSON.stringify({ type: "pause-new-requests", detail: { value: requestController.areNewRequestsPaused } }));
		}
	} catch (e) {
		// Report any exceptions directly back to the client. As with our handleErrors() this
		// probably isn't what you'd want to do in production, but it's convenient when testing.
		const error = /** @type {Error} */ (e);
		webSocketLog("Error: %s", error.stack);
		ws.send(JSON.stringify({ error: error.stack }));
	}
}

/**
 * @template {MockRequestEventType} T
 * @param {MockRequestEvent<T>} event
 * @param {import('../shared/RequestController.js').RequestController} requestController
 * @param {string} requestId
 * @returns {MockRequestEvent<T>}
 */
function reflectBackRequestEvent(event, requestController, requestId) {
	const updatedRequest = requestController.requests.get(requestId);
	if (!updatedRequest) throw new Error("Request not found trying to reflect back event: " + event.type);
	return new MockRequestEvent(event.type, updatedRequest);
}
