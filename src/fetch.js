/**
 * @typedef {(input: string | URL | Request, init?: RequestInit) => Promise<Response>} Fetch
 * @typedef {{ getStore(): Fetch | undefined }} FetchStore
 * @type {FetchStore | undefined} */
let fetchStore;

/** @type {(store: FetchStore) => void} */
export function setMockFetchStore(store) {
	fetchStore = store;
}

function defaultMockFetch() {
	console.log("default mock fetch used");
	return Promise.resolve(new Response());
}

/** @type {() => Fetch} */
export function getMockFetch() {
	return fetchStore?.getStore() ?? defaultMockFetch;
}
