interface Environment {
	// From node_modules/@cloudflare/workers-types/index.d.ts
	ASSETS: {
		fetch: typeof fetch;
	};
}

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

interface Assets {
	js: string;
	css: string[];
}

interface Routes {
	[routePath: string]: {
		label: string;
		render(props: { assets: Assets }): Promise<string | ReadableStream>;
		assets: Assets;
	};
}
