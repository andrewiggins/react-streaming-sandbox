import { attachRequestController, createRemoteRequestController } from "./client.js";

async function main() {
	localStorage.debug = "RSS:*";

	if (!window.RCID) return;
	const remoteRequestController = await createRemoteRequestController(window.RCID);
	attachRequestController(remoteRequestController);
}

main();
