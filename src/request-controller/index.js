import { MockRequestEvent } from "../../server/RequestController.js";
import { createRequestControllerClient } from "./client.js";
import { installFetchDebugger } from "./mockFetchDebugger.js";

async function main() {
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

		/** @type {MockRequestEvents[keyof MockRequestEvents] | InitEvent} */
		const data = JSON.parse(event.data);
		if (data.type === "init") {
			data.requests.forEach(([id, request]) => {
				fetchDebugger.addNewRequest(request);
			});
		} else if (data.type === "new-request") {
			fetchDebugger.addNewRequest(data.request);
		} else if (data.type === "request-complete") {
			fetchDebugger.completeRequest(data.request.id);
		}
	});
	rcClient.send(`{"type":"ping"}`);

	/** @type {any}*/ (globalThis).rcClient;
}

main();
