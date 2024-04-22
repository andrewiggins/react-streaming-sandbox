import debug from "debug";

/** @type {debug.Debugger} */
let log;

let mockRequestId = 0;

/**
 * @param {string | URL | Request} input Mock URL
 * @param {RequestInit} [init] Mock request options
 * @param {{ latency: number; paused: boolean; }} [mockOptions] Mock request options
 * @returns {MockRequest}
 */
export function createMockRequest(input, init = { method: "GET" }, mockOptions = { latency: 3000, paused: false }) {
	// const request = new Request(input, init);
	// this.request = request;
	const request = { method: init.method, url: input };

	/** @type {string} */
	const id = `${++mockRequestId}`;
	/** @type {string} Display name of the request */
	const name = `${request.method} ${request.url}`;
	/** @type {number | null} When this request should resolve. If null, request is paused and not scheduled to complete */
	const expiresAt = mockOptions.paused ? null : Date.now() + mockOptions.latency;
	/** @type {number} Total time in milliseconds this request should wait */
	const latency = mockOptions.latency;
	/** @type {number} Tracks how much time of duration has elapsed when a request is paused/resumed */
	const elapsedTime = 0;

	return { id, name, expiresAt, latency, elapsedTime };
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
 * @extends {Event<Type>}
 * @template {MockRequestEventType} Type
 */
// Exported primarily for typing
export class MockRequestEvent extends Event {
	/**
	 * @param {Type} type
	 * @param {MockRequest} request
	 */
	constructor(type, request) {
		super(type);

		// Bleh, TypeScript hack
		try {
			this.type = type;
		} catch (e) {}

		this.detail = { request };
	}

	toJSON() {
		return {
			type: this.type,
			detail: this.detail,
		};
	}
}

/** @extends {EventTarget<MockRequestEventMap>} */
export class RequestController extends EventTarget {
	/**
	 * @typedef {{ expiresAt: number; timeoutId: ReturnType<typeof setTimeout>; }} MockFetchTimer
	 * @type {MockFetchTimer | null}
	 */
	#timer = null;

	/** @param {string} rcId The ID for the RequestControllerClientConnection durable object */
	constructor(rcId) {
		super();

		if (!log) {
			log = debug("RSS:RequestController");
		}

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
			latency: this.latency,
			paused: this.areNewRequestsPaused,
		});

		this.requests.set(request.id, request);
		await this.dispatchEvent(new MockRequestEvent("new-request", request));

		if (this.areNewRequestsPaused) {
			this.dispatchEvent(new MockRequestEvent("request-pause", request));
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
			throw new Error(`No request with id "${id}" exists.`);
		}

		const now = Date.now();
		if (request.expiresAt == null || now > request.expiresAt) {
			// Request already paused or completed
			return;
		}

		request.elapsedTime = request.latency - (request.expiresAt - now);
		request.expiresAt = null;

		this.dispatchEvent(new MockRequestEvent("request-pause", request));
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
			throw new Error(`No request with id "${id}" exists.`);
		}

		if (request.expiresAt != null) {
			throw new Error(`Request is not paused. Can not resume it.`);
		}

		const now = Date.now();
		const remainingTime = request.latency - request.elapsedTime;
		request.expiresAt = now + remainingTime;

		this.dispatchEvent(new MockRequestEvent("request-resume", request));
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
				this.dispatchEvent(new MockRequestEvent("request-complete", request));

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
