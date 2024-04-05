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
