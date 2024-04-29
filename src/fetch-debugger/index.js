import { createRemoteRequestController } from "./client.js";
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

async function main() {
	localStorage.debug = "RSS:*";

	if (!window.RCID) return;
	window.fetchDebugger = getFetchDebugger();

	const serverRequestController = await createRemoteRequestController(window.RCID);
	window.fetchDebugger.attachRequestController(serverRequestController);
}

main();
