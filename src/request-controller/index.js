import { createRequestControllerClient } from "./client.js";

async function main() {
	const rcClient = await createRequestControllerClient();

	// Simple test
	rcClient.addEventListener("message", (event) => {
		console.log(event.data);
	});
	rcClient.send("Hello, world!");

	/** @type {any}*/ (globalThis).rcClient;
}

main();
