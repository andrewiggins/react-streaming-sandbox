/**
 * @typedef {(input: RequestInfo, init?: RequestInit) => Promise<Response>} Fetch
 * @typedef {{ getStore(): Fetch | undefined }} FetchStore
 * @type {FetchStore | undefined} */
let fetchStore;

/** @type {(store: FetchStore) => void} */
export function setMockFetchStore(store) {
	fetchStore = store;
}

/** @type {Fetch} */
function defaultMockFetch(input) {
	console.log("Client mock fetching", input);
	return Promise.resolve(new Response());
}

/** @type {() => Fetch} */
export function getMockFetch() {
	return fetchStore?.getStore() ?? defaultMockFetch;
}
