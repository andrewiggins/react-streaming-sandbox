import { AsyncLocalStorage } from "node:async_hooks";
import { setMockFetchStore } from "../src/fetch.js";

/** @type {AsyncLocalStorage<typeof import('@cloudflare/workers-types').fetch>} */
export const fetchStore = new AsyncLocalStorage();
setMockFetchStore(fetchStore);
