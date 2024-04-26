declare module "*.html" {
	const content: string;
	export default content;
}

declare module "react-dom/server.edge" {
	export interface ScriptConfig {
		src: string;
		integrity: string;
		crossOrigin?: "" | "use-credentials" | "anonymous";
	}

	export interface RenderToReadableStreamOptions {
		identifierPrefix?: string;
		namespaceURI?: string;
		nonce?: string;
		bootstrapScriptContent?: string;
		bootstrapScripts?: string[];
		bootstrapModules?: string[];
		progressiveChunkSize?: number;
		signal?: AbortSignal;
		onError?: (error: unknown, errorInfo: ErrorInfo) => string | void;
	}

	export interface ReactDOMServerReadableStream extends ReadableStream {
		allReady: Promise<void>;
	}

	/**
	 * Only available in the environments with [Web Streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) (this includes browsers, Deno, and some modern edge runtimes).
	 *
	 * @see [API](https://reactjs.org/docs/react-dom-server.html#rendertoreadablestream)
	 */
	export function renderToReadableStream(
		children: ReactNode,
		options?: RenderToReadableStreamOptions,
	): Promise<ReactDOMServerReadableStream>;
}

interface Window {
	RCID?: string;
	scrollTo(x: number, y: number): void;
}

interface Assets {
	js: string;
	css: string[];
}

interface RootProps {
	assets: Assets;
	rcId?: string;
}

interface Routes {
	[routePath: string]: {
		label: string;
		render(props: RootProps): Promise<string | import("react-dom/server.edge").ReactDOMServerReadableStream>;
		assets: Assets;
	};
}

interface FetchCache<K, V> {
	/**
	 * Removes the specified element from the WeakMap.
	 * @returns true if the element was successfully removed, or false if it was not present.
	 */
	delete(key: K): boolean;
	/**
	 * @returns a specified element.
	 */
	get(key: K): V | undefined;
	/**
	 * @returns a boolean indicating whether an element with the specified key exists or not.
	 */
	has(key: K): boolean;
	/**
	 * Adds a new element with a specified key and value.
	 * @param key Must be an object or symbol.
	 */
	set(key: K, value: V): this;
}
