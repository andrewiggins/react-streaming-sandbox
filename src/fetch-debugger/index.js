import { createRequestControllerClient } from "./client.js";
import { installFetchDebugger } from "./mockFetchDebugger.js";

async function main() {
	localStorage.debug = "RSS:*";

	if (!window.RCID) return;
	const rcClient = await createRequestControllerClient(window.RCID);

	installFetchDebugger();
	const fetchDebugger = /** @type {import('./mockFetchDebugger.js').MockFetchDebugger} */ (document.createElement("mock-fetch-debugger"));
	const dialog = document.createElement("draggable-dialog");
	dialog.appendChild(fetchDebugger);
	dialog.style.setProperty("color", "var(--color-debuggerText)");
	dialog.style.setProperty("background-color", "var(--color-debuggerBg)");
	document.body.prepend(dialog);

	fetchDebugger.addEventListener("request-pause", (event) => {
		rcClient.send(JSON.stringify(event));
	});
	fetchDebugger.addEventListener("request-resume", (event) => {
		rcClient.send(JSON.stringify(event));
	});

	rcClient.addEventListener("message", (event) => {
		console.log(event);

		/** @type {MockRequestEventMap[keyof MockRequestEventMap]} */
		const data = JSON.parse(event.data);
		if (data.type === "sync") {
			data.detail.requests.forEach(([id, request]) => {
				fetchDebugger.addRequest(request);
			});
		} else if (data.type === "new-request") {
			fetchDebugger.addRequest(data.detail.request);
		} else if (data.type === "request-pause") {
			fetchDebugger.pauseRequest(data.detail.request);
		} else if (data.type === "request-resume") {
			fetchDebugger.resumeRequest(data.detail.request);
		} else if (data.type === "request-complete") {
			fetchDebugger.completeRequest(data.detail.request);
		}
	});

	rcClient.send(`{"type":"ping"}`);

	/** @type {any}*/ (globalThis).rcClient;
}

main();
