import { RCIDName } from "../../shared/constants.js";

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

/** @type {(rcId: string) => Promise<WebSocket>} */
export async function createRequestControllerClient(rcId) {
	const websocket = await createWebSocket(`/request-controller?${RCIDName}=${rcId}`);
	return websocket;
}
