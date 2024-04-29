/**
 * @typedef {{ getStore(): FetchCache<any, any> | undefined }} CacheStore
 * @type {CacheStore | undefined} */
let cacheStore;

/** @type {(store: cacheStore) => void} */
export function setFetchCacheStore(store) {
	cacheStore = store;
}

const defaultFetchCache = new Map();
function getDefaultFetchCache() {
	console.log("default cache used");
	return defaultFetchCache;
}

/** @type {() => FetchCache<any, any>} */
export function getFetchCache() {
	return cacheStore?.getStore() ?? getDefaultFetchCache();
}
