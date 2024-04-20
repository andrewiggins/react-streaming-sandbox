import { createRequestControllerClient } from "./client.js";
import { installFetchDebugger } from "./mockFetchDebugger.js";

async function main() {
	if (!window.RCID) return;

	installFetchDebugger();
	const fetchDebugger = document.createElement("mock-fetch-debugger");
	const dialog = document.createElement("draggable-dialog");
	dialog.appendChild(fetchDebugger);
	dialog.style.setProperty("color", "var(--color-debuggerText)");
	dialog.style.setProperty("background-color", "var(--color-debuggerBg)");
	document.body.prepend(dialog);

	const rcClient = await createRequestControllerClient(window.RCID);

	// Simple test
	rcClient.addEventListener("message", (event) => {
		console.log(event);
	});
	rcClient.send(`{"type":"ping"}`);

	/** @type {any}*/ (globalThis).rcClient;
}

main();
