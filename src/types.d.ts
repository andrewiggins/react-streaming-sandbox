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
	export const renderToReadableStream: typeof import("react-dom/server").renderToReadableStream;
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
