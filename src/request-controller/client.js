/** @type {() => Promise<WebSocket>} */
function createWebSocket() {
	return new Promise((resolve, reject) => {
		const wss = document.location.protocol === "http:" ? "ws://" : "wss://";
		const websocket = new WebSocket(wss + "localhost:8787/request-controller");
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
		/** @type {(e: Event) => void} */
		const onError = (e) => {
			cleanup();
			reject(/** @type {ErrorEvent} */ (e).error || new Error("WebSocket error"));
		};

		websocket.addEventListener("open", onOpen);
		websocket.addEventListener("close", onClose);
		websocket.addEventListener("error", onError);
	});
}

export async function createRequestControllerClient() {
	const websocket = await createWebSocket();
	return websocket;
}
