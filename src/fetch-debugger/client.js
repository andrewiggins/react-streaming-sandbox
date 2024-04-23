// Make CustomEvents serializable.
const proto = /** @type {any} */ (CustomEvent.prototype);
proto.toJSON = function () {
	return {
		type: this.type,
		detail: this.detail,
	};
};

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

/** @implements {RequestControllerFacade} */
class RemoteRequestController extends EventTarget {
	/**
	 * @param {string} rcId
	 * @param {string} name
	 * @param {WebSocket} webSocket
	 */
	constructor(rcId, name, webSocket) {
		super();

		/** @type {string} */
		this.rcId = rcId;
		/** @type {string} */
		this.name = name;
		/** @type {WebSocket} */
		this.webSocket = webSocket;

		this.webSocket.addEventListener("message", (event) => {
			console.log("RSS:RemoteRequestController - Received message %o", event.data);

			const data = JSON.parse(event.data);
			/** @type {RequestControllerEventMap[keyof RequestControllerEventMap]} */
			const requestEvent = new CustomEvent(data.type, { detail: data.detail });
			this.dispatchEvent(requestEvent);
		});

		this.webSocket.send(`{"type":"ping"}`);
	}

	/** @type {(id: string) => void} */
	pause(id) {
		/** @type {MockFetchDebuggerEventMap["request-pause"]} */
		const event = new CustomEvent("request-pause", { detail: { requestId: id } });
		this.webSocket.send(JSON.stringify(event));
	}

	/** @type {(id: string) => void} */
	resume(id) {
		/** @type {MockFetchDebuggerEventMap["request-resume"]} */
		const event = new CustomEvent("request-resume", { detail: { requestId: id } });
		this.webSocket.send(JSON.stringify(event));
	}
}

/** @type {(rcId: string) => Promise<RequestControllerFacade>} */
export async function createRemoteRequestController(rcId) {
	const webSocket = await createWebSocket(`/request-controller?rcId=${rcId}`);
	return new RemoteRequestController(rcId, "client", webSocket);
}
