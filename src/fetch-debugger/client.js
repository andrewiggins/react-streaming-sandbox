import debug from "debug";
import { RCIDName } from "../../shared/constants.js";
import { MockFetchDebugger, installFetchDebugger } from "./mockFetchDebugger.js";

/** @type {MockFetchDebugger | null} */
let _fetchDebugger = null;
function getFetchDebugger() {
	if (!_fetchDebugger) {
		installFetchDebugger();

		_fetchDebugger = /** @type {MockFetchDebugger} */ (document.createElement("mock-fetch-debugger"));
		const dialog = document.createElement("draggable-dialog");
		dialog.appendChild(_fetchDebugger);
		dialog.style.setProperty("color", "var(--color-debuggerText)");
		dialog.style.setProperty("background-color", "var(--color-debuggerBg)");
		document.body.prepend(dialog);
	}

	return _fetchDebugger;
}

/** @type {(path: string) => Promise<WebSocket>} */
function createWebSocket(path) {
	return new Promise((resolve, reject) => {
		const wss = document.location.protocol === "http:" ? "ws://" : "wss://";
		const wssURL = new URL(wss + "localhost:8787" + path);
		const websocket = new WebSocket(wssURL);
		const cleanup = () => {
			websocket.removeEventListener("open", onOpen);
			websocket.removeEventListener("close", onClose);
			websocket.removeEventListener("error", reject);
		};
		const onOpen = () => {
			cleanup();
			resolve(websocket);
		};
		const onClose = () => {
			cleanup();
			reject(new Error("WebSocket closed"));
		};
		/** @type {(e: any) => void} */
		const onError = (e) => {
			cleanup();
			reject(e.error || new Error("WebSocket error"));
		};

		websocket.addEventListener("open", onOpen);
		websocket.addEventListener("close", onClose);
		websocket.addEventListener("error", onError);
	});
}

const remoteLog = debug("RSS:RemoteRequestController");

/** @implements {RequestControllerFacade} */
class RemoteRequestController extends EventTarget {
	/**
	 * @param {string} rcId
	 * @param {WebSocket} webSocket
	 */
	constructor(rcId, webSocket) {
		super();

		/** @type {string} */
		this.rcId = rcId;
		/** @type {WebSocket} */
		this.webSocket = webSocket;

		this.webSocket.addEventListener("message", (event) => {
			remoteLog("Received message %o", event.data);

			const data = JSON.parse(event.data);
			/** @type {MockRequestEventMap[keyof MockRequestEventMap]} */
			const requestEvent = new CustomEvent(data.type, { detail: data.detail });
			this.dispatchEvent(requestEvent);
		});

		this.webSocket.send(`{"type":"ping"}`);
	}

	/** @type {(id: string) => void} */
	pause(id) {
		/** @type {FetchDebuggerEventMap["request-pause"]} */
		const event = new CustomEvent("request-pause", { detail: { requestId: id } });
		this.webSocket.send(JSON.stringify(event));
	}

	/** @type {(id: string) => void} */
	resume(id) {
		/** @type {FetchDebuggerEventMap["request-resume"]} */
		const event = new CustomEvent("request-resume", { detail: { requestId: id } });
		this.webSocket.send(JSON.stringify(event));
	}
}

/** @type {(rcId: string) => Promise<RequestControllerFacade>} */
export async function createRemoteRequestController(rcId) {
	const webSocket = await createWebSocket(`/request-controller?${RCIDName}=${rcId}`);
	return new RemoteRequestController(rcId, webSocket);
}

/** @type {(requestController: RequestControllerFacade) => void} */
export function attachRequestController(requestController) {
	const fetchDebugger = getFetchDebugger();

	fetchDebugger.addEventListener("request-pause", (event) => {
		requestController.pause(event.detail.requestId);
	});

	fetchDebugger.addEventListener("request-resume", (event) => {
		requestController.resume(event.detail.requestId);
	});

	requestController.addEventListener("new-request", (event) => {
		fetchDebugger.addRequest(event.detail.request);
	});

	requestController.addEventListener("pause-request", (event) => {
		fetchDebugger.pauseRequest(event.detail.request);
	});

	requestController.addEventListener("resume-request", (event) => {
		fetchDebugger.resumeRequest(event.detail.request);
	});

	requestController.addEventListener("complete-request", (event) => {
		fetchDebugger.completeRequest(event.detail.request);
	});

	requestController.addEventListener("sync-state", (event) => {
		fetchDebugger.areNewRequestsPaused = event.detail.areNewRequestsPaused;
		fetchDebugger.latencyMs = event.detail.latency;
		event.detail.requests.forEach(([id, request]) => {
			fetchDebugger.addRequest(request);
		});
	});
}
