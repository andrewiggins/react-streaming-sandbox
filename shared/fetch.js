import debug from "debug";
import { getFetchCache } from "./cache.js";

const fetchCacheLog = debug("RSS:fetchCache");

/** @type {FetchStore | undefined} */
let fetchStore;

/** @type {(store: FetchStore) => void} */
export function setMockFetchStore(store) {
	fetchStore = store;
}

/** @type {() => Fetch} */
export function getMockFetch() {
	const mockFetch = fetchStore?.getStore();
	if (!mockFetch) throw new Error("Mock fetch not set");
	return mockFetch;
}

/** @type {(input: string | URL | Request, requestInit: RequestInit | undefined) => boolean} */
function isGETRequest(input, requestInit) {
	if (input instanceof Request) {
		return input.method === "GET";
	}

	return requestInit == null || requestInit.method == null || requestInit.method === "GET";
}

/** @type {(fetch: Fetch) => Fetch} */
export function createCachedFetch(fetch) {
	return (input, requestInit) => {
		const cache = getFetchCache();
		if (!cache) {
			fetchCacheLog("No cache store found");
			return fetch(input, requestInit);
		}

		const url = input instanceof Request ? input.url : input.toString();
		if (!isGETRequest(input, requestInit)) {
			fetchCacheLog("Not caching non-GET method: %s", url.toString());
			return fetch(input, requestInit);
		}

		const key = url;
		if (cache.has(key)) {
			fetchCacheLog("FetchCache hit %s", key);
			const responsePromise = cache.get(key);
			if (!responsePromise) {
				fetchCacheLog("FetchCache hit %s but no response", key);
				return fetch(input, requestInit);
			}

			// Clone the response so that it can be consumed multiple times
			return responsePromise.then((res) => res.clone());
		}

		fetchCacheLog("FetchCache miss %s", key);
		const responsePromise = fetch(input, requestInit);
		cache.set(key, responsePromise);
		return responsePromise;
	};
}
