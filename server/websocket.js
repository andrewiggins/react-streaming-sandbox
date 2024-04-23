import debug from "debug";
import { requestControllers } from "./server.js";

const webSocketLog = debug("RSS:webSocket");

/** @type {(ws: import('ws').WebSocket, url: URL) => void} */
export function setupWebSocket(ws, url) {
	const rcId = url.searchParams.get("rcId");
	if (!rcId) throw new Error("Missing rcId param");

	const rc = requestControllers.get(rcId);
	if (!rc) {
		console.warn("No request controller found for %s", rcId);
		return;
	}

	webSocketLog("Accepted WebSocket connection %s", rcId);

	ws.addEventListener("open", () => {
		webSocketLog("Connection opened %s", rcId);
	});
	ws.addEventListener("message", async (event) => {
		await handleWebSocketMessage(rcId, ws, event.data);
	});
	ws.addEventListener("close", (event) => {
		webSocketLog("Closing %s", rcId);
	});
	ws.addEventListener("error", (event) => {
		webSocketLog("Error: %s", event.error.stack);
	});

	rc.addEventListener("new-request", async (event) => {
		webSocketLog("Sending new request %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});
	rc.addEventListener("pause-request", async (event) => {
		webSocketLog("Sending request pause %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});
	rc.addEventListener("resume-request", async (event) => {
		webSocketLog("Sending request resume %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});
	rc.addEventListener("complete-request", async (event) => {
		webSocketLog("Sending request complete %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});

	/** @type {SyncEvent} */
	const syncEvent = new CustomEvent("sync-state", {
		detail: { requests: Array.from(rc.requests.entries()), latency: rc.latency, areNewRequestsPaused: rc.areNewRequestsPaused },
	});
	ws.send(JSON.stringify(syncEvent));
}

/** @type {(rcId: string, ws: import('ws').WebSocket, message: Buffer[] | ArrayBuffer | string) => Promise<void>} */
async function handleWebSocketMessage(rcId, ws, message) {
	try {
		/** @type {MockFetchDebuggerEventMap[MockFetchDebuggerEventType] | { type: "ping" } | undefined} */
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

		webSocketLog(`Received message %s`, message);

		// Handle the message.
		if (event.type === "ping") {
			webSocketLog("Sending pong...");
			ws.send(JSON.stringify({ type: "pong" }));
		} else if (event.type === "request-pause") {
			requestController.pause(event.detail.requestId);
		} else if (event.type === "request-resume") {
			requestController.resume(event.detail.requestId);
		} else if (event.type === "request-new-request-paused") {
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
