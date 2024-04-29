/**
 * @typedef {{ getStore(): FetchCache | undefined }} FetchCacheStore
 * @type {FetchCacheStore | undefined}
 */
let cacheStore;

/** @type {(store: cacheStore | undefined) => void} */
export function setFetchCacheStore(store) {
	cacheStore = store;
}

/** @type {() => FetchCache} */
export function getFetchCache() {
	const cache = cacheStore?.getStore();
	if (!cache) throw new Error("Fetch cache not set");
	return cache;
}
