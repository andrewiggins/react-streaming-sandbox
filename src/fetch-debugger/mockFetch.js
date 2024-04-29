import { RequestController } from "../../shared/RequestController.js";
import { setMockFetchStore } from "../../shared/fetch.js";

/** @type {RequestController | null} */
let requestController = null;

/** @type {import('../../shared/fetch.js').Fetch} */
function mockFetch(input) {
	if (typeof window === "undefined") {
		return Promise.resolve(new Response());
	}

	if (!requestController) {
		requestController = new RequestController(crypto.randomUUID(), "client");
		window.fetchDebugger?.attachRequestController(requestController);
	}

	return requestController.fetch(input);
}

export function installMockFetch() {
	setMockFetchStore({ getStore: () => mockFetch });
}
