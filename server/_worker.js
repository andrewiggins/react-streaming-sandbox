import viteManifest from "../dist/src/.vite/manifest.json";
import renderIndex from "../src/index.jsx";
import helloWorldStringRender from "../src/routes/hello-world-string/entry-server.jsx";
import helloWorldStreamRender from "../src/routes/hello-world-stream/entry-server.jsx";
import fixturesSsrRender from "../src/routes/fixtures-ssr/entry-server.jsx";
import fixturesSsr2Render from "../src/routes/fixtures-ssr2/entry-server.jsx";
import movieAppRender from "../src/routes/movie-app/entry-server.jsx";

/** @type {(body: BodyInit | null | undefined) => Response} */
function createHtmlResponse(body) {
	return new Response(body, {
		headers: {
			"content-type": "text/html; charset=utf-8",
		},
	});
}

const assetRoot = "/src/";
/** @type {(entry: keyof typeof viteManifest) => Routes[0]["assets"]} */
function getAssets(entry) {
	const entryManifest = viteManifest[entry];
	return {
		js: assetRoot + entryManifest.file,
		css: "css" in entryManifest ? entryManifest.css.map((file) => assetRoot + file) : [],
	};
}

/** @type {Routes} */
const routes = {
	"/hello-world-string/": {
		label: "Hello world string SSR",
		render: helloWorldStringRender,
		assets: getAssets("src/routes/hello-world-string/entry-client.jsx"),
	},
	"/hello-world-stream/": {
		label: "Hello world streaming SSR",
		render: helloWorldStreamRender,
		assets: getAssets("src/routes/hello-world-stream/entry-client.jsx"),
	},
	"/fixtures-ssr/": {
		label: "Fixtures SSR",
		render: fixturesSsrRender,
		assets: getAssets("src/routes/fixtures-ssr/entry-client.jsx"),
	},
	"/fixtures-ssr2/": {
		label: "Fixtures SSR 2",
		render: fixturesSsr2Render,
		assets: getAssets("src/routes/fixtures-ssr2/entry-client.jsx"),
	},
	"/movie-app/": {
		label: "Movie App",
		render: movieAppRender,
		assets: getAssets("src/routes/movie-app/entry-client.jsx"),
	},
};

/**
 * @typedef {Required<ExportedHandler<Environment>>} RequiredExportedHandler
 * @type {{ fetch: RequiredExportedHandler["fetch"] }}
 */
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const pathname = url.pathname;

		if (pathname === "/favicon.ico" || pathname.startsWith("/src/")) {
			return env.ASSETS.fetch(request);
		} else if (pathname === "/") {
			return createHtmlResponse(await renderIndex(routes));
		} else if (pathname in routes) {
			const route = routes[pathname];
			return createHtmlResponse(await route.render({ assets: route.assets }));
		} else {
			return new Response("Not found", { status: 404 });
		}
	},
};
