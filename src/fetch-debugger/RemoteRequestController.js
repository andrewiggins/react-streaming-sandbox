const color = "#9900FF";
/** @type {(message: string, ...args: any[]) => void} */
function log(message, ...args) {
	console.log(`%cRSS:RemoteRequestController %c${message}`, `color: ${color}`, `color: inherit`, ...args);
}

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
	 * @typedef {Promise<Request> & { resolve(request: Request): void; reject(error: any): void; }} RPCPromise
	 * @type {Map<string, RPCPromise>}
	 */
	#openRequests = new Map();

	/**
	 * @param {string} name
	 * @param {string} rcId
	 * @param {WebSocket} webSocket
	 */
	constructor(name, rcId, webSocket) {
		super();

		/** @type {string} */
		this.rcId = rcId;
		/** @type {string} */
		this.name = name;
		/** @type {WebSocket} */
		this.webSocket = webSocket;

		this.webSocket.addEventListener("message", (event) => this.#handleMessage(event));

		this.#sendRequest("ping", undefined).then((response) => {
			log(`Ping received "%s"`, response);
		});
	}

	/** @type {(id: string) => Promise<MockRequest | null>} */
	async pause(id) {
		return this.#sendRequest("pause", [id]);
	}

	/** @type {(id: string) => Promise<MockRequest | null>} */
	async resume(id) {
		return this.#sendRequest("resume", [id]);
	}

	/** @type {(value: boolean) => Promise<void>} */
	async setPauseNewRequests(value) {
		return this.#sendRequest("setPauseNewRequests", [value]);
	}

	/** @type {(latency: number) => Promise<void>} */
	async setLatency(latency) {
		return this.#sendRequest("setLatency", [latency]);
	}

	/**
	 * @template {keyof RemoteRequestControllerRPC} Method
	 * @param {Method} method
	 * @param {RemoteRequestControllerRPC[Method]["params"]} params
	 * @returns {Promise<any>}
	 */
	async #sendRequest(method, params) {
		let resolver, rejecter;
		const p = /** @type {RPCPromise} */ (
			new Promise((resolve, reject) => {
				resolver = resolve;
				rejecter = reject;
			})
		);

		p.resolve = /** @type {any} */ (resolver);
		p.reject = /** @type {any} */ (rejecter);

		const id = crypto.randomUUID();
		this.#openRequests.set(id, p);

		this.webSocket.send(JSON.stringify({ id, method, params }));

		return p;
	}

	/** @type {(event: MessageEvent) => void} */
	#handleMessage(event) {
		/** @type {RPCResponse<any> | RequestControllerEventMap[keyof RequestControllerEventMap]} */
		const data = JSON.parse(event.data);
		if ("id" in data) {
			const p = this.#openRequests.get(data.id);
			if (!p) {
				log("Received response for unknown request %s", data.id);
				return;
			}

			if (data.error) {
				/** @type {any} */
				const error = new Error(data.error.message);
				error.data = data.error;
				p.reject(error);
			} else {
				p.resolve(data.result);
			}

			this.#openRequests.delete(data.id);
			return;
		}

		const requestEvent = new CustomEvent(data.type, { detail: data.detail });
		log("Received %s: %o", requestEvent.type, requestEvent.detail);
		this.dispatchEvent(requestEvent);
	}
}

/** @type {(rcId: string) => Promise<RequestControllerFacade>} */
export async function createRemoteRequestController(rcId) {
	const webSocket = await createWebSocket(`/request-controller?rcId=${rcId}`);
	return new RemoteRequestController("server", rcId, webSocket);
}
