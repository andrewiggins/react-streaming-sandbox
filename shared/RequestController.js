import debug from "debug";

/** @type {debug.Debugger} */
let log;

let mockRequestId = 0;

/**
 * @param {string | URL | Request} input Mock URL
 * @param {RequestInit} [init] Mock request options
 * @param {{ source: string; latency: number; paused: boolean; }} [mockOptions] Mock request options
 * @returns {MockRequest}
 */
function createMockRequest(input, init = { method: "GET" }, mockOptions = { source: "unknown", latency: 3000, paused: false }) {
	const request = { method: init.method, url: input };
	const { source, latency, paused } = mockOptions;

	const id = `${source}:${++mockRequestId}`;
	const name = `${request.method} ${request.url}`;
	const expiresAt = paused ? null : Date.now() + latency;
	const elapsedTime = 0;

	return { id, source, name, expiresAt, latency, elapsedTime };
}

/**
 * @typedef {Promise<any> & {resolve(): void; reject(): void;}} MockRequestPromise
 * @type {() => MockRequestPromise}
 */
function createMockRequestPromise() {
	let resolve, reject;
	/** @type {Promise<void>} */
	const promise = new Promise((resolver, rejecter) => {
		resolve = () => {
			resolver();
		};

		reject = () => {
			rejecter();
		};
	});

	Object.assign(promise, { resolve, reject });
	return /** @type {any} */ (promise);
}

/**
 * @extends {CustomEvent<{ request: MockRequest }, Type>}
 * @template {MockRequestEventType} Type
 */
// Exported primarily for typing
class MockRequestEvent extends CustomEvent {
	/**
	 * @param {Type} type
	 * @param {MockRequest} request
	 */
	constructor(type, request) {
		super(type, { detail: { request } });
	}
}

/** @extends {EventTarget<MockRequestEventMap>} */
export class RequestController extends EventTarget {
	/**
	 * @typedef {{ expiresAt: number; timeoutId: ReturnType<typeof setTimeout>; }} MockFetchTimer
	 * @type {MockFetchTimer | null}
	 */
	#timer = null;

	/**
	 * @param {string} rcId The ID for the RequestControllerClientConnection durable object
	 * @param {string} [source] The source of the request controller
	 */
	constructor(rcId, source = "unknown") {
		super();

		if (!log) {
			log = debug("RSS:RequestController");
		}

		/** @type {string} */
		this.source = source;
		/** @type {boolean} */
		this.areNewRequestsPaused = false;
		/** @type {number} */
		this.latency = 3 * 1000;
		this.rcId = rcId;

		/** @type {Map<string, MockRequest>} */
		this.requests = new Map();

		/** @type {WeakMap<MockRequest, MockRequestPromise>} */
		this.mockRequestsPromises = new WeakMap();
	}

	// Actual fetch signature:
	// declare function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
	/** @type {(input: string | URL | Request, requestInit?: RequestInit) => Promise<Response>} */
	fetch = async (input, requestInit) => {
		log("fetch %o %o", input, requestInit);

		const request = createMockRequest(input, requestInit, {
			source: this.source,
			latency: this.latency,
			paused: this.areNewRequestsPaused,
		});

		this.requests.set(request.id, request);
		this.dispatchEvent(new MockRequestEvent("new-request", request));

		if (this.areNewRequestsPaused) {
			this.dispatchEvent(new MockRequestEvent("pause-request", request));
		} else {
			this.#scheduleUpdate();
		}

		const requestPromise = createMockRequestPromise();
		this.mockRequestsPromises.set(request, requestPromise);

		return requestPromise.then(() => new Response());
	};

	/**
	 * Pause the given request if it is currently inflight
	 * @param {string} id
	 * @returns {void}
	 */
	pause(id) {
		log("pause %s", id);

		const request = this.requests.get(id);
		if (!request) {
			log(`pause: no request with id "${id}" exists.`);
			return;
		}

		const now = Date.now();
		if (request.expiresAt == null || now > request.expiresAt) {
			// Request already paused or completed
			return;
		}

		request.elapsedTime = request.latency - (request.expiresAt - now);
		request.expiresAt = null;

		this.dispatchEvent(new MockRequestEvent("pause-request", request));
		this.#resolveRequests(now);
	}

	/**
	 * Resume the given request if it was paused
	 * @param {string} id
	 * @returns {void}
	 */
	resume(id) {
		log("resume %s", id);

		const request = this.requests.get(id);
		if (!request) {
			log(`resume: no request with id "${id}" exists.`);
			return;
		}

		if (request.expiresAt != null) {
			throw new Error(`Request is not paused. Can not resume it.`);
		}

		const now = Date.now();
		const remainingTime = request.latency - request.elapsedTime;
		request.expiresAt = now + remainingTime;

		this.dispatchEvent(new MockRequestEvent("resume-request", request));
		this.#resolveRequests(now);
	}

	/**
	 * Resolve any inflight requests that have completed.
	 *
	 * `now` is a parameter to assist in debugging so that time doesn't continue when
	 * debugging. If it did, requests could "expire" while stepping through code
	 * @param {number} now
	 * @returns {void}
	 */
	#resolveRequests(now) {
		log("resolveRequests %d", now);

		/** @type {MockRequest[]} */
		const toRemove = [];

		for (let [_, request] of this.requests.entries()) {
			if (request.expiresAt == null) {
				continue;
			} else if (request.expiresAt - now < 16) {
				// If this request will expire within 16 ms of now (or has already expired)
				// then go ahead and resolve it
				const requestPromise = this.mockRequestsPromises.get(request);
				if (!requestPromise) {
					throw new Error(`Request promise for request "${request.id}" not found`);
				}

				requestPromise.resolve();
				this.dispatchEvent(new MockRequestEvent("complete-request", request));

				toRemove.push(request);
			}
		}

		for (let request of toRemove) {
			this.requests.delete(request.id);
			this.mockRequestsPromises.delete(request);
		}

		this.#scheduleUpdate();
	}

	/**
	 * Schedule the next timeout to resolve the next set of requests to complete
	 * @returns {void}
	 */
	#scheduleUpdate() {
		// TODO: Do we need a mode? The controller should solely own the request state
		// if (this.requests.size == 0 || this.mode !== "auto") {
		// 	return;
		// }

		if (this.requests.size == 0) {
			return;
		}

		log("scheduleUpdate");

		/** @type {number | null} The expiration time of the request that will expire soonest */
		let nextExpiration = null;
		for (let request of this.requests.values()) {
			if (request.expiresAt != null && (nextExpiration == null || request.expiresAt < nextExpiration)) {
				nextExpiration = request.expiresAt;
			}
		}

		if (this.#timer && (nextExpiration == null || nextExpiration !== this.#timer.expiresAt)) {
			// If there is an existing timer, and no next request or the timer expires a
			// different time than the next request, clear the exiting timer.
			log("scheduleUpdate: clearing existing timer (%d)", this.#timer.timeoutId);
			clearTimeout(this.#timer.timeoutId);
			this.#timer = null;
		}

		// TODO: Does this equal `nextExpiration === this.#timer?.expiresAt`?
		if (nextExpiration == null || (this.#timer && nextExpiration === this.#timer.expiresAt)) {
			log("scheduleUpdate: No new timer needed");
			return;
		}

		const timeout = nextExpiration - Date.now();
		/** @type {any} */
		let timeoutId;
		timeoutId = setTimeout(() => {
			log("scheduleUpdate: timer expired (%d)", timeoutId);
			this.#timer = null;
			this.#resolveRequests(Date.now());
		}, timeout);
		log("scheduleUpdate: created timer (%d) for %d ms", timeoutId, timeout);
		this.#timer = { timeoutId, expiresAt: nextExpiration };
	}
}
