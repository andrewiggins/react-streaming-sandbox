import { setFetchCacheStore } from "../shared/cache.js";
import { createCachedFetch, setMockFetchStore } from "../shared/fetch.js";
import { RequestController } from "../shared/RequestController.js";

// Use localStorage to map URLs to keys in the cache. Useful for
// debugging/modifying the cache in the browser without having to enter into the
// debugger or modify the cache directly.
const keyMap = sessionStorage;
/** @type {FetchCache} */
const cache = new Map();

/** @type {(key: string) => string} */
const getSessionStorageKey = (key) => `[rss-cache]${key}`;

/** @type {FetchCache} */
const clientFetchCache = {
	has(url) {
		const ssKey = getSessionStorageKey(url);
		return keyMap.getItem(ssKey) !== null;
	},
	get(url) {
		const ssKey = getSessionStorageKey(url);
		const cacheKey = keyMap.getItem(ssKey);
		if (!cacheKey) return undefined;
		return cache.get(cacheKey);
	},
	set(url, responsePromise) {
		const ssKey = getSessionStorageKey(url);
		const cacheKey = crypto.randomUUID();
		keyMap.setItem(ssKey, cacheKey);
		cache.set(cacheKey, responsePromise);
	},
	delete(url) {
		const ssKey = getSessionStorageKey(url);
		const cacheKey = keyMap.getItem(url);
		if (!cacheKey) return;
		keyMap.removeItem(ssKey);
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
