import { createRequestControllerClient } from "./client.js";

async function main() {
	if (!window.RCID) return;

	const rcClient = await createRequestControllerClient(window.RCID);

	// Simple test
	rcClient.addEventListener("message", (event) => {
		console.log(event);
	});
	rcClient.send(`{"type":"ping"}`);

	/** @type {any}*/ (globalThis).rcClient;
}

main();
