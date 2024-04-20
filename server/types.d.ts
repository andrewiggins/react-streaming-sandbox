interface Environment {
	ASSETS: {
		fetch: typeof fetch;
	};
}

declare var window: undefined;

/**
 * This class creates stores that stay coherent through asynchronous operations.
 *
 * While you can create your own implementation on top of the `node:async_hooks`module, `AsyncLocalStorage` should be preferred as it is a performant and memory
 * safe implementation that involves significant optimizations that are non-obvious
 * to implement.
 *
 * The following example uses `AsyncLocalStorage` to build a simple logger
 * that assigns IDs to incoming HTTP requests and includes them in messages
 * logged within each request.
 *
 * ```js
 * import http from 'node:http';
 * import { AsyncLocalStorage } from 'node:async_hooks';
 *
 * const asyncLocalStorage = new AsyncLocalStorage();
 *
 * function logWithId(msg) {
 *   const id = asyncLocalStorage.getStore();
 *   console.log(`${id !== undefined ? id : '-'}:`, msg);
 * }
 *
 * let idSeq = 0;
 * http.createServer((req, res) => {
 *   asyncLocalStorage.run(idSeq++, () => {
 *     logWithId('start');
 *     // Imagine any chain of async operations here
 *     setImmediate(() => {
 *       logWithId('finish');
 *       res.end();
 *     });
 *   });
 * }).listen(8080);
 *
 * http.get('http://localhost:8080');
 * http.get('http://localhost:8080');
 * // Prints:
 * //   0: start
 * //   1: start
 * //   0: finish
 * //   1: finish
 * ```
 *
 * Each instance of `AsyncLocalStorage` maintains an independent storage context.
 * Multiple instances can safely exist simultaneously without risk of interfering
 * with each other's data.
 * @since v13.10.0, v12.17.0
 */
class AsyncLocalStorage<T> {
	/**
	 * Binds the given function to the current execution context.
	 * @since v19.8.0
	 * @experimental
	 * @param fn The function to bind to the current execution context.
	 * @return A new function that calls `fn` within the captured execution context.
	 */
	static bind<Func extends (...args: any[]) => any>(fn: Func): Func;
	/**
	 * Captures the current execution context and returns a function that accepts a
	 * function as an argument. Whenever the returned function is called, it
	 * calls the function passed to it within the captured context.
	 *
	 * ```js
	 * const asyncLocalStorage = new AsyncLocalStorage();
	 * const runInAsyncScope = asyncLocalStorage.run(123, () => AsyncLocalStorage.snapshot());
	 * const result = asyncLocalStorage.run(321, () => runInAsyncScope(() => asyncLocalStorage.getStore()));
	 * console.log(result);  // returns 123
	 * ```
	 *
	 * AsyncLocalStorage.snapshot() can replace the use of AsyncResource for simple
	 * async context tracking purposes, for example:
	 *
	 * ```js
	 * class Foo {
	 *   #runInAsyncScope = AsyncLocalStorage.snapshot();
	 *
	 *   get() { return this.#runInAsyncScope(() => asyncLocalStorage.getStore()); }
	 * }
	 *
	 * const foo = asyncLocalStorage.run(123, () => new Foo());
	 * console.log(asyncLocalStorage.run(321, () => foo.get())); // returns 123
	 * ```
	 * @since v19.8.0
	 * @experimental
	 * @return A new function with the signature `(fn: (...args) : R, ...args) : R`.
	 */
	static snapshot(): <R, TArgs extends any[]>(fn: (...args: TArgs) => R, ...args: TArgs) => R;
	/**
	 * Returns the current store.
	 * If called outside of an asynchronous context initialized by
	 * calling `asyncLocalStorage.run()` or `asyncLocalStorage.enterWith()`, it
	 * returns `undefined`.
	 * @since v13.10.0, v12.17.0
	 */
	getStore(): T | undefined;
	/**
	 * Runs a function synchronously within a context and returns its
	 * return value. The store is not accessible outside of the callback function.
	 * The store is accessible to any asynchronous operations created within the
	 * callback.
	 *
	 * The optional `args` are passed to the callback function.
	 *
	 * If the callback function throws an error, the error is thrown by `run()` too.
	 * The stacktrace is not impacted by this call and the context is exited.
	 *
	 * Example:
	 *
	 * ```js
	 * const store = { id: 2 };
	 * try {
	 *   asyncLocalStorage.run(store, () => {
	 *     asyncLocalStorage.getStore(); // Returns the store object
	 *     setTimeout(() => {
	 *       asyncLocalStorage.getStore(); // Returns the store object
	 *     }, 200);
	 *     throw new Error();
	 *   });
	 * } catch (e) {
	 *   asyncLocalStorage.getStore(); // Returns undefined
	 *   // The error will be caught here
	 * }
	 * ```
	 * @since v13.10.0, v12.17.0
	 */
	run<R>(store: T, callback: () => R): R;
	run<R, TArgs extends any[]>(store: T, callback: (...args: TArgs) => R, ...args: TArgs): R;
	/**
	 * Runs a function synchronously outside of a context and returns its
	 * return value. The store is not accessible within the callback function or
	 * the asynchronous operations created within the callback. Any `getStore()`call done within the callback function will always return `undefined`.
	 *
	 * The optional `args` are passed to the callback function.
	 *
	 * If the callback function throws an error, the error is thrown by `exit()` too.
	 * The stacktrace is not impacted by this call and the context is re-entered.
	 *
	 * Example:
	 *
	 * ```js
	 * // Within a call to run
	 * try {
	 *   asyncLocalStorage.getStore(); // Returns the store object or value
	 *   asyncLocalStorage.exit(() => {
	 *     asyncLocalStorage.getStore(); // Returns undefined
	 *     throw new Error();
	 *   });
	 * } catch (e) {
	 *   asyncLocalStorage.getStore(); // Returns the same object or value
	 *   // The error will be caught here
	 * }
	 * ```
	 * @since v13.10.0, v12.17.0
	 * @experimental
	 */
	exit<R, TArgs extends any[]>(callback: (...args: TArgs) => R, ...args: TArgs): R;
}

declare module "node:async_hooks" {
	export { AsyncLocalStorage };
}

declare class Event<EventType> {
	constructor(type: EventType, init?: EventInit);
	/**
	 * Returns the type of event, e.g. "click", "hashchange", or "submit".
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/type)
	 */
	readonly type: EventType;
	/**
	 * Returns the event's phase, which is one of NONE, CAPTURING_PHASE, AT_TARGET, and BUBBLING_PHASE.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/eventPhase)
	 */
	readonly eventPhase: number;
	/**
	 * Returns true or false depending on how event was initialized. True if event invokes listeners past a ShadowRoot node that is the root of its target, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/composed)
	 */
	readonly composed: boolean;
	/**
	 * Returns true or false depending on how event was initialized. True if event goes through its target's ancestors in reverse tree order, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/bubbles)
	 */
	readonly bubbles: boolean;
	/**
	 * Returns true or false depending on how event was initialized. Its return value does not always carry meaning, but true can indicate that part of the operation during which event was dispatched, can be canceled by invoking the preventDefault() method.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/cancelable)
	 */
	readonly cancelable: boolean;
	/**
	 * Returns true if preventDefault() was invoked successfully to indicate cancelation, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/defaultPrevented)
	 */
	readonly defaultPrevented: boolean;
	/**
	 * @deprecated
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/returnValue)
	 */
	readonly returnValue: boolean;
	/**
	 * Returns the object whose event listener's callback is currently being invoked.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/currentTarget)
	 */
	readonly currentTarget?: EventTarget;
	/**
	 * @deprecated
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/srcElement)
	 */
	readonly srcElement?: EventTarget;
	/**
	 * Returns the event's timestamp as the number of milliseconds measured relative to the time origin.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/timeStamp)
	 */
	readonly timeStamp: number;
	/**
	 * Returns true if event was dispatched by the user agent, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/isTrusted)
	 */
	readonly isTrusted: boolean;
	/**
	 * @deprecated
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/cancelBubble)
	 */
	cancelBubble: boolean;
	/**
	 * Invoking this method prevents event from reaching any registered event listeners after the current one finishes running and, when dispatched in a tree, also prevents event from reaching any other objects.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/stopImmediatePropagation)
	 */
	stopImmediatePropagation(): void;
	/**
	 * If invoked when the cancelable attribute value is true, and while executing a listener for the event with passive set to false, signals to the operation that caused event to be dispatched that it needs to be canceled.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/preventDefault)
	 */
	preventDefault(): void;
	/**
	 * When dispatched in a tree, invoking this method prevents event from reaching any objects other than the current object.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/stopPropagation)
	 */
	stopPropagation(): void;
	/**
	 * Returns the invocation target objects of event's path (objects on which listeners will be invoked), except for any nodes in shadow trees of which the shadow root's mode is "closed" that are not reachable from event's currentTarget.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/composedPath)
	 */
	composedPath(): EventTarget[];
	static readonly NONE: number;
	static readonly CAPTURING_PHASE: number;
	static readonly AT_TARGET: number;
	static readonly BUBBLING_PHASE: number;
}

type EventListener<EventType extends Event = Event> = (event: EventType) => void;
interface EventListenerObject<EventType extends Event = Event> {
	handleEvent(event: EventType): void;
}
type EventListenerOrEventListenerObject<EventType extends Event = Event> = EventListener<EventType> | EventListenerObject<EventType>;

class EventTarget<EventMap extends Record<string, Event> = Record<string, Event>> {
	constructor();
	/**
	 * Appends an event listener for events whose type attribute value is type. The callback argument sets the callback that will be invoked when the event is dispatched.
	 *
	 * The options argument sets listener-specific options. For compatibility this can be a boolean, in which case the method behaves exactly as if the value was specified as options's capture.
	 *
	 * When set to true, options's capture prevents callback from being invoked when the event's eventPhase attribute value is BUBBLING_PHASE. When false (or not present), callback will not be invoked when event's eventPhase attribute value is CAPTURING_PHASE. Either way, callback will be invoked if event's eventPhase attribute value is AT_TARGET.
	 *
	 * When set to true, options's passive indicates that the callback will not cancel the event by invoking preventDefault(). This is used to enable performance optimizations described in § 2.8 Observing event listeners.
	 *
	 * When set to true, options's once indicates that the callback will only be invoked once after which the event listener will be removed.
	 *
	 * If an AbortSignal is passed for options's signal, then the event listener will be removed when signal is aborted.
	 *
	 * The event listener is appended to target's event listener list and is not appended if it has the same type, callback, and capture.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener)
	 */
	addEventListener<Type extends keyof EventMap>(
		type: Type,
		handler: EventListenerOrEventListenerObject<EventMap[Type]>,
		options?: EventTargetAddEventListenerOptions | boolean,
	): void;
	/**
	 * Removes the event listener in target's event listener list with the same type, callback, and options.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener)
	 */
	removeEventListener<Type extends keyof EventMap>(
		type: Type,
		handler: EventListenerOrEventListenerObject<EventMap[Type]>,
		options?: EventTargetEventListenerOptions | boolean,
	): void;
	/**
	 * Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/dispatchEvent)
	 */
	dispatchEvent(event: EventMap[keyof EventMap]): boolean;
}
interface EventTargetEventListenerOptions {
	capture?: boolean;
}
interface EventTargetAddEventListenerOptions {
	capture?: boolean;
	passive?: boolean;
	once?: boolean;
	signal?: AbortSignal;
}
interface EventTargetHandlerObject {
	handleEvent: (event: Event) => any | undefined;
}
