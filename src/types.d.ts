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
	scrollTo(x: number, y: number): void;
}

interface Assets {
	js: string;
	css: string[];
}

interface RootProps {
	url: string;
	assets: Assets;
	rcId?: string;
}

type Routes = Record<string, Route>;

interface Route {
	label: string;
	pattern: import("urlpattern-polyfill").URLPattern;
	render(props: RootProps): Promise<string | import("react-dom/server.edge").ReactDOMServerReadableStream>;
	assets: Assets;
}
