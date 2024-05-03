const hasOwn = Object.prototype.hasOwnProperty;

/**
 * @param {string} tag
 * @param {Record<string, boolean | number | string | Function> | null} [attributes]
 * @param  {Array<HTMLElement | string>} children
 * @returns {HTMLElement}
 */
function h(tag, attributes, ...children) {
	const element = document.createElement(tag);

	if (attributes) {
		for (let attr in attributes) {
			if (hasOwn.call(attributes, attr)) {
				const value = attributes[attr];
				if (attr in element) {
					// @ts-expect-error It's fine
					element[attr] = value;
				} else if (typeof value === "string") {
					element.setAttribute(attr, value);
				}
			}
		}
	}

	for (let child of children) {
		if (typeof child == "string") {
			element.appendChild(document.createTextNode(child));
		} else {
			element.appendChild(child);
		}
	}

	return element;
}

class DraggableDialog extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);

		const style = document.createElement("style");
		style.innerHTML = `
			:host {
				display: block;
				position: fixed;
				top: 0;
				left: 0;
				z-index: 9999;

				border: 1px solid black;
				border-radius: 8px;
				background-color: white;

				/* https://getcssscan.com/css-box-shadow-examples */
				box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
			}

			:host([hidden]) { display: none; }

			button {
				display: inline-block;
				border: 0;
				padding: 0;
				background: none;
				font-size: inherit;
				font-family: -apple-system,system-ui,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif;
			}

			.drag-handle {
				display: block;
				width: 100%;
				height: 1.1rem;
				text-align: center;
				cursor: move;
				border-radius: 8px 8px 0 0;
			}

			.drag-handle:hover,
			.drag-handle.moving {
				background-color: #ccc;
			}

			.drag-handle-icon {
				display: inline-block;
				transform: rotate(90deg);
			}

		`;
		shadowRoot.appendChild(style);

		const body = h(
			"button",
			{
				class: "drag-handle",
				type: "button",
				"aria-label": "Move dialog",
				onpointerdown: this.#onInitializeMove.bind(this),
			},
			h("span", { class: "drag-handle-icon", "aria-hidden": "true" }, "||"),
		);

		shadowRoot.appendChild(body);
		shadowRoot.appendChild(document.createElement("slot"));
	}

	connectedCallback() {
		const defaultX = window.innerWidth - 200 - 24;
		const defaultY = 24;
		let { x: translateX, y: translateY } = this.#getTransform();

		const host = /** @type {HTMLElement} */ (this.shadowRoot?.host);
		// If the transform value isn't set or if the dialog is positioned off
		// screen due to a screen resize, reconnecting the dialog should reset it's
		// position
		if (host.style.transform == "" || translateX + 24 > window.innerWidth || translateY + 24 > window.innerHeight) {
			this.#setTransform(defaultX, defaultY);
		}
	}

	/** @param {PointerEvent} initialEvent */
	#onInitializeMove(initialEvent) {
		initialEvent.preventDefault();

		const dragHandle = this.shadowRoot?.querySelector(".drag-handle");
		dragHandle?.classList.add("moving");

		const prevCursor = document.body.style.cursor;
		document.body.style.cursor = "move";

		let prevClientX = initialEvent.clientX;
		let prevClientY = initialEvent.clientY;
		let { x: prevTranslateX, y: prevTranslateY } = this.#getTransform();

		/** @param {PointerEvent} moveEvent */
		const onMove = (moveEvent) => {
			moveEvent.preventDefault();

			let moveX = moveEvent.clientX - prevClientX;
			let moveY = moveEvent.clientY - prevClientY;

			let newTranslateX = prevTranslateX + moveX;
			let newTranslateY = prevTranslateY + moveY;

			if (
				// Outside bottom/right edge
				moveEvent.clientX + 24 < window.innerWidth &&
				newTranslateY + 24 < window.innerHeight &&
				// Outside top/left edge
				moveEvent.clientX - 24 > 0 &&
				newTranslateY > 0
			) {
				this.#setTransform(newTranslateX, newTranslateY);
			}

			prevClientX = moveEvent.clientX;
			prevClientY = moveEvent.clientY;
			prevTranslateX = newTranslateX;
			prevTranslateY = newTranslateY;
		};

		const onMoveEnd = () => {
			document.body.style.cursor = prevCursor;
			this.shadowRoot?.querySelector(".drag-handle")?.classList.remove("moving");
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onMoveEnd);
		};

		document.addEventListener("pointermove", onMove);
		document.addEventListener("pointerup", onMoveEnd);
	}

	#getTransform() {
		const host = /** @type {HTMLElement} */ (this);
		const transform = host.style.transform;

		const match = transform.match(/translate3d\((-?[0-9.]+)px, (-?[0-9.]+)px, 0px\)/);
		if (match) {
			return {
				x: parseInt(match[1], 10),
				y: parseInt(match[2], 10),
			};
		} else {
			return { x: 0, y: 0 };
		}
	}

	/** @param {number} x @param {number} y */
	#setTransform(x, y) {
		const host = /** @type {HTMLElement} */ (this);
		host.style.transform = `translate3d(${x}px, ${y}px, 0)`;
	}
}

const fadeOutDuration = 7000;
const fadeOutDelay = 3000;
const fadeOutTotalTime = fadeOutDuration + fadeOutDelay;
/** @type {(cb: FrameRequestCallback) => void} */
function afterNextFrame(cb) {
	requestAnimationFrame(() => requestAnimationFrame(cb));
}

/** @type {(request: MockRequest) => string} */
const getRequestName = (request) => `${request.method} ${request.url}`;

export class MockFetchDebugger extends HTMLElement {
	/** @type {number} */
	#latencyMs = 3 * 1000;
	/** @type {boolean} */
	#areNewRequestsPaused = false;
	/**	@type {boolean} */
	#animationsEnabled = true;

	/** @type {Map<string, MockRequest>} */
	requests = new Map();
	/** @type {Map<string, RequestControllerFacade>} */
	requestControllers = new Map();

	constructor() {
		super();
		this.attachShadow({ mode: "open" });

		const style = document.createElement("style");
		style.innerHTML = `
			:host {
				display: block;
				padding: 0.125rem 0.5rem 1.1rem 0.5rem;
				/* min-width: 200px; */
				width: 200px;
			}

			:host([hidden]) { display: none; }

			:host * {
				box-sizing: border-box;
			}

			button {
				display: inline-block;
				border: 0;
				padding: 0;
				background: none;
				font-size: inherit;
				font-family: -apple-system,system-ui,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif;
			}

			label {
				display: block;
			}

			input#latency {
				display: block;
				width: 100%;
			}

			h2 {
				font-size: 20px;
				margin: 0;
				margin-top: 0.5rem;
			}

			ul {
				margin: 0;
				padding: 0;
				list-style: none;
			}

			ul:empty::after {
				content: "(Empty)";
				display: block;
				min-height: 22px;
				margin: 0.15rem 0;
			}

			.inflight .request {
				display: grid;
				min-height: 22px;
				margin: 0.15rem 0;
			}

			.inflight .request-btn {
				display: flex;
				grid-row: 1;
				grid-column: 1;
				padding: 0 4px;
				text-align: left;
				cursor: pointer;
			}

			.inflight .request-label {
				margin-right: auto;
			}

			.inflight .status {
				font-family: Segoe UI Symbol,-apple-system,system-ui,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif;
			}

			.inflight progress {
				display: block;
				height: 100%;
				width: 100%;
				-webkit-appearance: none;
				-moz-appearance: none;
				appearance: none;
				border: none;
				grid-row: 1;
				grid-column: 1;
			}

			.inflight progress::-webkit-progress-bar {
				background-color: #eee;
  			/* border-radius: 2px; */
  			/* box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25) inset; */
			}

			.inflight progress::-webkit-progress-value {
				background-color: lightblue;
    		border-radius: 2px;
    		background-size: 35px 20px, 100% 100%, 100% 100%;
			}

			.inflight progress::-moz-progress-bar {
				background-color: lightblue;
    		border-radius: 2px;
    		background-size: 35px 20px, 100% 100%, 100% 100%;
			}

			#completed li {
				transition: opacity ${fadeOutDelay}ms ease-in ${fadeOutDuration}ms;
				opacity: 1;
				min-height: 22px;
				margin: 0.15rem 0;
			}
		`;
		this.shadowRoot?.appendChild(style);

		const body = [
			h("label", { for: "latency" }, "Latency: ", h("span", { id: "latency-label" })),
			h(
				"div",
				null,
				h("input", {
					id: "latency",
					type: "range",
					min: "0",
					max: "10000",
					step: "500",
					value: this.#latencyMs,
					oninput: () => this.#updateLatency(),
				}),
			),
			h(
				"label",
				null,
				h("input", {
					id: "pause-new",
					type: "checkbox",
					/** @type {(event: any) => void} */
					oninput: (event) => {
						const target = event.currentTarget;
						this.areNewRequestsPaused = target.checked;
					},
					checked: this.#areNewRequestsPaused,
				}),
				"Pause new requests",
			),
			h("div", { id: "inflight-container" }),
			h("h2", null, "Recently done"),
			h("ul", { id: "completed" }),
		];

		body.forEach((child) => this.shadowRoot?.appendChild(child));
		this.#updateLatency();
		this.#scheduleUpdate();
	}

	get animationEnabled() {
		return this.#animationsEnabled;
	}
	set animationEnabled(newAnimation) {
		this.#animationsEnabled = newAnimation;
		this.#scheduleUpdate();
	}

	get latencyMs() {
		return this.#latencyMs;
	}
	set latencyMs(newLatency) {
		this.#latencyMs = newLatency;
		this.#scheduleUpdate();
	}

	get areNewRequestsPaused() {
		return this.#areNewRequestsPaused;
	}
	set areNewRequestsPaused(newPaused) {
		this.#areNewRequestsPaused = newPaused;
		this.#scheduleUpdate();
	}

	connectedCallback() {
		this.#scheduleUpdate();
	}

	disconnectedCallback() {
		this.#scheduleUpdate();
	}

	/** @type {(request: MockRequest) => Promise<void>} */
	async onToggleRequest(request) {
		const requestController = this.requestControllers.get(request.rcId);
		if (!requestController) throw new Error(`No request controller found for ${request.rcId}`);

		if (request.expiresAt == null) {
			const newRequest = await requestController.resume(request.id);
			if (!newRequest) throw new Error(`No request with id "${request.id}" exists.`);
			this.#resumeRequest(newRequest);
		} else {
			const newRequest = await requestController.pause(request.id);
			if (!newRequest) throw new Error(`No request with id "${request.id}" exists.`);
			this.#pauseRequest(newRequest);
		}
	}

	/** @type {(requestController: RequestControllerFacade) => void} */
	attachRequestController(requestController) {
		this.requestControllers.set(requestController.rcId, requestController);

		requestController.addEventListener("new-request", (event) => {
			this.#addRequest(event.detail.request);
		});

		requestController.addEventListener("complete-request", (event) => {
			this.#completeRequest(event.detail.request);
		});

		requestController.addEventListener("sync-requests", (event) => {
			event.detail.requests.forEach(([id, request]) => {
				const existingRequest = this.requests.get(id);
				if (!existingRequest) {
					this.#addRequest(request);
				} else {
					this.requests.set(existingRequest.id, { ...existingRequest, ...request });
				}
			});

			this.#scheduleUpdate();
		});
	}

	/** @type {(request: MockRequest) => void} */
	#addRequest(request) {
		if (this.requests.has(request.id)) {
			console.warn(`Request with id "${request.id}" already exists.`);
			this.requests.delete(request.id);
		}

		this.requests.set(request.id, request);
		this.#scheduleUpdate();
	}

	/** @type {(request: MockRequest) => void} */
	#pauseRequest(r) {
		const request = this.#getInternalRequest(r);

		request.expiresAt = null;
		this.#scheduleUpdate();
	}

	/** @type {(request: MockRequest) => void} */
	#resumeRequest(r) {
		const request = this.#getInternalRequest(r);
		request.expiresAt = r.expiresAt;
		this.#scheduleUpdate();
	}

	/** @type {(request: MockRequest) => void} */
	#completeRequest(r) {
		const request = this.#getInternalRequest(r);

		request.expiresAt = 0;
		this.#scheduleUpdate();
	}

	/** @type {(r: MockRequest) => MockRequest} */
	#getInternalRequest(r) {
		const request = this.requests.get(r.id);
		if (request) return request;

		console.warn(`No request with id "${r.id}" exists.`);
		this.requests.set(r.id, r);
		return r;
	}

	/** @type {(rcId: string) => Element} */
	#getOrCreateInflightSection(rcId) {
		const inflightContainer = this.shadowRoot?.getElementById("inflight-container");
		if (!inflightContainer) throw new Error("inflightContainer not found");

		const list = inflightContainer.querySelector(`.inflight.rcId--${rcId}`);
		if (list) return list;

		const requestController = this.requestControllers.get(rcId);
		if (!requestController) throw new Error(`No request controller found for ${rcId}`);
		const rcName = requestController.name;

		inflightContainer.appendChild(h("h2", null, `Inflight (${rcName})`));
		const newList = h("ul", { class: `inflight rcId--${rcId}` });
		inflightContainer.appendChild(newList);
		return newList;
	}

	#updateLatency() {
		/** @type {HTMLInputElement} */
		// @ts-expect-error
		const latency = this.shadowRoot?.getElementById("latency");
		this.#latencyMs = latency.valueAsNumber;
		const latencySec = (latency.valueAsNumber / 1000).toFixed(1);
		const latencyLabel = this.shadowRoot?.getElementById("latency-label");
		const pluralEnding = latencySec == "1.0" ? "" : "s";

		if (!latencyLabel) throw new Error("latencyLabel not found");
		latencyLabel.textContent = `${latencySec} second${pluralEnding}`;
	}

	/** @type {boolean} */
	#isUpdateScheduled = false;
	#scheduleUpdate() {
		if (this.#isUpdateScheduled) return;
		this.#isUpdateScheduled = true;
		requestAnimationFrame(() => {
			this.#isUpdateScheduled = false;
			this.#update();
		});
	}

	#update() {
		if (!this.isConnected) {
			return;
		}

		const requests = this.requests;
		if (requests.size == 0) {
			return;
		}

		const shadowRoot = /** @type {ShadowRoot} */ (this.shadowRoot);

		/** @type {MockRequest[]} */
		const finished = [];
		const now = Date.now();
		let isRunning = false; // Track if any requests are running

		// Update requests already in list
		const inflightLists = Array.from(shadowRoot.querySelectorAll(".inflight"));
		const inflightItems = inflightLists.flatMap((list) => Array.from(list.children));

		for (const listItem of inflightItems) {
			const requestId = listItem.getAttribute("data-req-id");
			if (!requestId) throw new Error("requestId not found");

			const request = requests.get(requestId);
			if (request) {
				const requestName = getRequestName(request);
				const isPaused = request.expiresAt == null;

				const btn = /** @type {HTMLElement} */ (listItem.querySelector(".request-btn"));
				const progress = /** @type {HTMLProgressElement} */ (listItem.querySelector("progress"));
				const status = /** @type {HTMLElement} */ (btn.querySelector(".status"));

				if (btn.getAttribute("data-paused") !== isPaused.toString()) {
					btn.setAttribute("data-paused", isPaused.toString());

					if (isPaused) {
						btn.title = "Resume request";
						btn.setAttribute("aria-label", `Resume request ${requestName}`);
						status.textContent = "▶";
					} else {
						btn.title = "Pause request";
						btn.setAttribute("aria-label", `Pause request ${requestName}`);
						status.textContent = "⏸";
					}
				}

				if (!isPaused) {
					if (request.expiresAt === 0) {
						finished.push(request);
					} else {
						const timeLeft = (request.expiresAt || 0) - now;
						if (timeLeft <= 0) {
							progress.value = 100;
						} else {
							isRunning = true;
							progress.value = ((request.latency - timeLeft) / request.latency) * 100;
						}
					}
				}
			} else {
				// Huh... shouldn't happen but let's go ahead and clean up the UI
				listItem.remove();
			}
		}

		// Add new requests
		for (const request of requests.values()) {
			const isPaused = request.expiresAt == null;
			let existingItem = shadowRoot.querySelector(`[data-req-id="${request.id}"]`);

			if (!existingItem) {
				if (!isPaused) {
					isRunning = true;
				}

				const requestName = getRequestName(request);
				const inflightList = this.#getOrCreateInflightSection(request.rcId);
				inflightList.appendChild(
					h(
						"li",
						{ class: "request", "data-req-id": request.id },
						h("progress", { value: 0, max: 100 }),
						h(
							"button",
							{
								class: "request-btn",
								"data-paused": isPaused.toString(),
								title: isPaused ? "Resume request" : "Pause request",
								"aria-label": isPaused ? `Resume request ${requestName}` : `Pause request ${requestName}`,
								type: "button",
								onclick: () => this.onToggleRequest(request),
							},
							h("span", { class: "request-label" }, requestName),
							h("span", { class: "status" }, isPaused ? "▶" : "⏸"),
						),
					),
				);
			}
		}

		// Move finished requests
		/** @type {HTMLElement[]} */
		const finishedItems = [];
		const completedList = shadowRoot.getElementById("completed");
		if (!completedList) throw new Error("completedList not found");

		for (let request of finished) {
			const rcName = this.requestControllers.get(request.rcId)?.name ?? "unknown";

			shadowRoot.querySelector(`[data-req-id="${request.id}"]`)?.remove();
			requests.delete(request.id);

			/** @type {(event: { target: Element }) => void} */
			const ontransitionend = (event) => event.target.remove();
			const newItem = h("li", { ontransitionend }, getRequestName(request) + ` (${rcName})`);

			finishedItems.push(newItem);
			completedList.appendChild(newItem);
		}

		if (finishedItems.length) {
			// Firefox requires at least one frame of 100% opacity before it will
			// trigger the transition to 0 opacity
			afterNextFrame(() => finishedItems.forEach((li) => (li.style.opacity = "0")));
			// If the debugger is hidden during the transition, the transition will
			// cancel and the elements will never be removed from the DOM. So we'll go
			// ahead and remove them ourselves after the transition is complete.
			setTimeout(() => {
				finishedItems.forEach((li) => li.remove());
			}, fadeOutTotalTime + 100);
		}

		if (this.#animationsEnabled && isRunning) {
			this.#scheduleUpdate();
		}
	}
}

export function installFetchDebugger() {
	window.customElements.define("draggable-dialog", DraggableDialog);
	window.customElements.define("mock-fetch-debugger", MockFetchDebugger);
}
