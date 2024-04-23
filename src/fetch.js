import { RequestController } from "../shared/RequestController.js";

/**
 * @typedef {(input: string | URL | Request, init?: RequestInit) => Promise<Response>} Fetch
 * @typedef {{ getStore(): Fetch | undefined }} FetchStore
 * @type {FetchStore | undefined} */
let fetchStore;

/** @type {(store: FetchStore) => void} */
export function setMockFetchStore(store) {
	fetchStore = store;
}

/** @type {RequestController | null} */
let requestController = null;

/** @type {Fetch} */
function defaultMockFetch(input) {
	if (typeof window === "undefined") {
		return Promise.resolve(new Response());
	}

	if (!requestController) {
		requestController = new RequestController(crypto.randomUUID(), "client");
		window.fetchDebugger.attachRequestController(requestController);
	}

	return requestController.fetch(input);
}

/** @type {() => Fetch} */
export function getMockFetch() {
	return fetchStore?.getStore() ?? defaultMockFetch;
}
