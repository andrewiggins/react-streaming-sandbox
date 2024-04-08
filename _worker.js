import viteManifest from "./dist/src/.vite/manifest.json";
import renderIndex from "./src/index.jsx";
import helloWorldStringRender from "./src/routes/hello-world-string/entry-server.jsx";
import helloWorldStreamRender from "./src/routes/hello-world-stream/entry-server.jsx";

/** @type {(body: BodyInit | null | undefined) => Response} */
function createHtmlResponse(body) {
	return new Response(body, {
		headers: {
			"content-type": "text/html; charset=utf-8",
		},
	});
}

/** @type {(entry: keyof typeof viteManifest) => string} */
function getClientSrc(entry) {
	return "/src/" + viteManifest[entry].file;
}

/** @type {Routes} */
const routes = {
	"/hello-world-string": {
		label: "Hello world string SSR",
		render: helloWorldStringRender,
		clientSrc: getClientSrc("src/routes/hello-world-string/entry-client.jsx"),
	},
	"/hello-world-stream": {
		label: "Hello world streaming SSR",
		render: helloWorldStreamRender,
		clientSrc: getClientSrc("src/routes/hello-world-stream/entry-client.jsx"),
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
			return createHtmlResponse(await route.render({ clientSrc: route.clientSrc }));
		} else {
			return new Response("Not found", { status: 404 });
		}
	},
};
