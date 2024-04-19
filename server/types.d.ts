interface Environment {
	ASSETS: {
		fetch: typeof import("@cloudflare/workers-types").fetch;
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
