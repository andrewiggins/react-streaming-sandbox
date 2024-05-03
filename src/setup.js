import { setFetchCacheStore } from "../shared/cache.js";
import { createCachedFetch, setMockFetchStore } from "../shared/fetch.js";
import { RequestController } from "../shared/RequestController.js";

// Use localStorage to map URLs to keys in the cache. Useful for
// debugging/modifying the cache in the browse without having to enter into the
// debugger or modify the cache directly.
const keyMap = sessionStorage;
/** @type {FetchCache} */
const cache = new Map();

/** @type {FetchCache} */
const clientFetchCache = {
	has(url) {
		return keyMap.getItem(url) !== null;
	},
	get(url) {
		const cacheKey = keyMap.getItem(url);
		if (!cacheKey) return undefined;
		return cache.get(cacheKey);
	},
	set(url, responsePromise) {
		const cacheKey = crypto.randomUUID();
		keyMap.setItem(url, cacheKey);
		cache.set(cacheKey, responsePromise);
	},
	delete(url) {
		const cacheKey = keyMap.getItem(url);
		if (!cacheKey) return;
		keyMap.removeItem(url);
		cache.delete(cacheKey);
	},
	clear() {
		keyMap.clear();
		cache.clear();
	},
};

/** @type {RequestController | null} */
let clientRequestController = null;

/** @type {Fetch} */
async function mockFetch(input) {
	if (!clientRequestController) {
		clientRequestController = new RequestController(crypto.randomUUID(), "client");
		await window.fetchDebugger?.attachRequestController(clientRequestController);
	}

	return clientRequestController.fetch(input);
}

export function installMockFetch() {
	const cachedMockFetch = createCachedFetch(mockFetch);
	setFetchCacheStore({ getStore: () => clientFetchCache });
	setMockFetchStore({ getStore: () => cachedMockFetch });

	window.addEventListener("beforeunload", () => {
		clientFetchCache.clear();
	});
}
