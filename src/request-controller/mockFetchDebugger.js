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
/** @type {(cb: FrameRequestCallback) => void} */
function afterNextFrame(cb) {
	requestAnimationFrame(() => requestAnimationFrame(cb));
}

class MockFetchDebugger extends HTMLElement {
	/** @type {number} */
	#durationMs;
	/** @type {boolean} */
	#areNewRequestsPaused;

	constructor() {
		super();
		this.attachShadow({ mode: "open" });

		/** @type {Map<string, MockRequest>} */
		this.requests = new Map();
		this.#durationMs = 3 * 1000;
		this.#areNewRequestsPaused = false;

		const style = document.createElement("style");
		style.innerHTML = `
			:host {
				display: block;
				padding: 0.125rem 0.5rem 1.1rem 0.5rem
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
			}

			#inflight .request {
				display: grid;
				margin: 0.15rem 0;
			}

			#inflight .request-btn {
				display: flex;
				grid-row: 1;
				grid-column: 1;
				padding: 0 4px;
				text-align: left;
				cursor: pointer;
			}

			#inflight .request-label {
				margin-right: auto;
			}

			#inflight .status {
				font-family: Segoe UI Symbol,-apple-system,system-ui,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif;
			}

			#inflight progress {
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

			#inflight progress::-webkit-progress-bar {
				background-color: #eee;
  			/* border-radius: 2px; */
  			/* box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25) inset; */
			}

			#inflight progress::-webkit-progress-value {
				background-color: lightblue;
    		border-radius: 2px;
    		background-size: 35px 20px, 100% 100%, 100% 100%;
			}

			#inflight progress::-moz-progress-bar {
				background-color: lightblue;
    		border-radius: 2px;
    		background-size: 35px 20px, 100% 100%, 100% 100%;
			}

			#completed li {
				transition: opacity 3s ease-in ${fadeOutDuration}ms;
				opacity: 1;
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
					value: this.#durationMs,
					oninput: () => this.updateLatency(),
				}),
			),
			h(
				"label",
				null,
				h("input", {
					id: "pause-new",
					type: "checkbox",
					/** @type {(event: InputEvent) => void} */
					oninput: (event) => {
						const target = /** @type {HTMLInputElement} */ (event.target);
						this.areNewRequestsPaused = target.checked;
					},
					checked: this.#areNewRequestsPaused,
				}),
				"Pause new requests",
			),
			h("h2", null, "Inflight"),
			h("ul", { id: "inflight" }),
			h("h2", null, "Recently done"),
			h("ul", { id: "completed" }),
		];

		body.forEach((child) => this.shadowRoot?.appendChild(child));
		this.updateLatency();
		this.update();
	}

	get durationMs() {
		return this.#durationMs;
	}
	set durationMs(newDuration) {
		this.#durationMs = newDuration;
		this.update();
	}

	get areNewRequestsPaused() {
		return this.#areNewRequestsPaused;
	}
	set areNewRequestsPaused(newPaused) {
		this.#areNewRequestsPaused = newPaused;
		this.update();
	}

	connectedCallback() {
		this.update();
	}

	disconnectedCallback() {
		this.update();
	}

	/** @type {(request: MockRequest) => void} */
	onToggleRequest(request) {
		if (request.expiresAt == null) {
			this.dispatchEvent(new CustomEvent("request-resume", { detail: { requestId: request.id } }));
		} else {
			this.dispatchEvent(new CustomEvent("request-pause", { detail: { requestId: request.id } }));
		}
	}

	/** @type {(request: MockRequest) => void} */
	addNewRequest(request) {
		this.requests.set(request.id, request);
		this.update();
	}

	updateLatency() {
		/** @type {HTMLInputElement} */
		// @ts-expect-error
		const latency = this.shadowRoot?.getElementById("latency");
		this.#durationMs = latency.valueAsNumber;
		const latencySec = (latency.valueAsNumber / 1000).toFixed(1);
		const latencyLabel = this.shadowRoot?.getElementById("latency-label");
		const pluralEnding = latencySec == "1.0" ? "" : "s";

		if (!latencyLabel) throw new Error("latencyLabel not found");
		latencyLabel.textContent = `${latencySec} second${pluralEnding}`;
	}

	update() {
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
		const inflightList = shadowRoot.getElementById("inflight");
		if (!inflightList) throw new Error("inflightList not found");
		for (const listItem of Array.from(inflightList.children)) {
			const requestId = listItem.getAttribute("data-req-id");
			if (!requestId) throw new Error("requestId not found");

			const request = requests.get(requestId);
			if (request) {
				const isPaused = request.expiresAt == null;

				const btn = /** @type {HTMLElement} */ (listItem.querySelector(".request-btn"));
				const progress = /** @type {HTMLProgressElement} */ (listItem.querySelector("progress"));
				const status = /** @type {HTMLElement} */ (btn.querySelector(".status"));

				if (btn.getAttribute("data-paused") !== isPaused.toString()) {
					btn.setAttribute("data-paused", isPaused.toString());

					if (isPaused) {
						btn.title = "Resume request";
						btn.setAttribute("aria-label", `Resume request ${request.name}`);
						status.textContent = "▶";
					} else {
						btn.title = "Pause request";
						btn.setAttribute("aria-label", `Pause request ${request.name}`);
						status.textContent = "⏸";
					}
				}

				if (!isPaused) {
					isRunning = true;
					const timeLeft = (request.expiresAt || 0) - now;
					if (timeLeft < 16) {
						// If this request will expire within 16 ms of now (or has already
						// expired) then go ahead and mark it as finished
						finished.push(request);
					} else {
						progress.value = ((request.latency - timeLeft) / request.latency) * 100;
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
								"aria-label": isPaused ? `Resume request ${request.name}` : `Pause request ${request.name}`,
								type: "button",
								onclick: () => this.onToggleRequest(request),
							},
							h("span", { class: "request-label" }, request.name),
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
			shadowRoot.querySelector(`[data-req-id="${request.id}"]`)?.remove();
			request.resolve();
			requests.delete(request.id);

			/** @type {(event: { target: Element }) => void} */
			const ontransitionend = (event) => event.target.remove();
			const newItem = h("li", { ontransitionend }, request.name);

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
			}, fadeOutDuration + 100);
		}

		if (isRunning) {
			requestAnimationFrame(() => this.update());
		}
	}
}

export function installFetchDebugger() {
	window.customElements.define("draggable-dialog", DraggableDialog);
	window.customElements.define("mock-fetch-debugger", MockFetchDebugger);
}
