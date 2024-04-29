// Defer by a couple frames so as to not mess with the React concurrent
// rendering cycle
/** @type {(cb: () => void) => any} */
const defer = (cb) => setTimeout(cb, 16 * 3);

const debugTracing = false;
function logParentMethod() {
	if (debugTracing) {
		const stack = new Error().stack ?? '';
		console.log(stack.split('\n')[3].trim());
	}
}

// Buffer writes to the console so as not to slow down the React
// render cycle and artifically fragment it. Writing all this to
// the console takes about 10x as long as running the React render

/**
 * @extends {Console}
 */
class ConsoleBuffer {
	constructor() {
		/** @type {Array<[string, any[]]>} */
		this.buffer = [];

		const consoleKeys = /** @type {Array<keyof Console>} */ (
			Object.keys(globalThis.console)
		);
		for (let methodName of consoleKeys) {
			if (typeof console[methodName] === 'function') {
				this[methodName] = this.proxy(methodName);
			}
		}
	}

	/**
	 * @template {keyof Console} T
	 * @param {T} methodName
	 * @returns {(...args: any[]) => void}
	 */
	proxy(methodName) {
		return (...args) => {
			this.buffer.push([methodName, args]);
		};
	}

	flush() {
		let method;
		while ((method = this.buffer.shift())) {
			if (
				ConsoleBuffer.enabled &&
				localStorage.getItem('react-tracer:enabled') !== 'false'
			) {
				let [name, args] = method;
				console[name](...args);
			}
		}
	}
}

ConsoleBuffer.enabled = true;

class MethodTracer {
	/**
	 * @typedef {{ collapsed: boolean; }} MethodConfig Set certain methods to
	 * default to collapsed in the console window
	 * @param {Record<string, MethodConfig>} config
	 */
	constructor(config) {
		/** @type {string[]} */
		this.stack = [];
		this.console = /** @type {ConsoleBuffer & Console} */ (new ConsoleBuffer());
		this.divider = '-';
		this.config = config;
	}

	/**
	 * @param {string} name The name of the method
	 * @param {any} [idParam] An optional parameter to uniquely identify this method call
	 */
	enter(name, idParam) {
		logParentMethod();

		const consoleArgs = [name];
		if (typeof idParam !== 'undefined') {
			consoleArgs.push(this.divider, idParam);
		}

		const methodConfig = this.config[name];
		if (methodConfig && methodConfig.collapsed) {
			this.console.groupCollapsed(...consoleArgs);
		} else {
			this.console.group(...consoleArgs);
		}

		return this.stack.push(this.getId(name, idParam));
	}

	exit() {
		logParentMethod();

		this.console.groupEnd();
		const exitedId = this.stack.pop();

		if (this.stack.length === 0) {
			defer(() => this.console.flush());
		}

		return exitedId ?? '';
	}

	/** @type {(...args: any[]) => void} */
	log(...args) {
		this.console.log(...args);
	}

	/**
	 * @param {any} error The error thrown
	 * @param {string} name The name of the method
	 * @param {any} [idParam] An optional parameter identifying this method call
	 */
	unwindOnError(error, name, idParam) {
		const id = this.getId(name, idParam);
		this.console.log(
			'Error caught in "' + this.lastId() + '". Rewinding to "' + id + '"',
		);
		this.console.log('Error:', error);
		while (this.lastId() !== id && this.lastId() != null) {
			this.exit();
		}
	}

	/**
	 * @private
	 * @param {string} name The name of the method
	 * @param {any} [idParam] An optional parameter identifying this method call
	 */
	getId(name, idParam) {
		return typeof idParam === 'undefined'
			? name
			: [name, this.divider, idParam].join(' ');
	}

	/**
	 * @private
	 */
	lastId() {
		return this.stack[this.stack.length - 1];
	}
}

/** @type {import('./methodTracer.d.ts').MethodTracer} */
export const ReactTracer = new MethodTracer({
	performConcurrentWorkOnRoot: { collapsed: true },
	renderRoot: { collapsed: true },
});

// @ts-ignore
globalThis.ReactTracer = ReactTracer;
