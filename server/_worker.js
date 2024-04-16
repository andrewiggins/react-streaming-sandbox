import debug from "debug";
import viteManifest from "../dist/src/.vite/manifest.json";
import renderIndex from "../src/index.jsx";
import helloWorldStringRender from "../src/routes/hello-world-string/entry-server.jsx";
import helloWorldStreamRender from "../src/routes/hello-world-stream/entry-server.jsx";
import fixturesSsrRender from "../src/routes/fixtures-ssr/entry-server.jsx";
import fixturesSsr2Render from "../src/routes/fixtures-ssr2/entry-server.jsx";
import movieAppRender from "../src/routes/movie-app/entry-server.jsx";
import { RCIDName } from "./constants.js";
import { MockRequest, MockRequestEvent, RequestController } from "./RequestController.js";
import { fetchStore } from "./fetch.js";

debug.enable("RSS:*");
const log = debug("RSS:_worker");

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

export { RequestControllerClientConnection } from "./RequestControllerClientConnection.js";

/**
 * @typedef {Required<ExportedHandler<Environment>>} RequiredExportedHandler
 * @type {{ fetch: RequiredExportedHandler["fetch"] }}
 */
export default {
	/** @type {RequiredExportedHandler["fetch"]} */
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const pathname = url.pathname;

		if (pathname === "/request-controller") {
			const rcIdParam = url.searchParams.get(RCIDName);
			const rcId = rcIdParam ? env.RequestControllerClient.idFromString(rcIdParam) : env.RequestControllerClient.newUniqueId();
			const rc = env.RequestControllerClient.get(rcId);
			return rc.fetch(request);
		} else if (pathname === "/favicon.ico" || pathname.startsWith("/src/")) {
			return env.ASSETS.fetch(request);
		} else if (pathname === "/") {
			return createHtmlResponse(await renderIndex(routes));
		} else if (pathname in routes) {
			const route = routes[pathname];
			const rcId = env.RequestControllerClient.newUniqueId();
			const rc = new RequestController(rcId);

			const rcc = env.RequestControllerClient.get(rcId);
			await rcc.initialize(async () => {
				var requests = JSON.stringify(Array.from(rc.requests.entries()));
				console.log("requests", requests);
				return requests;
			});

			rc.addEventListener("new-request", async (event) => {
				log("New request %s", event.request.id);
				await rcc.sendRequestEvent(JSON.stringify(event));
			});
			rc.addEventListener("request-complete", async (event) => {
				log("Request complete %s", event.request.id);
				await rcc.sendRequestEvent(JSON.stringify(event));
			});

			return fetchStore.run(rc.fetch, async () => {
				log("Dispatching %s", pathname);
				return createHtmlResponse(await route.render({ assets: route.assets, rcId }));
			});
		} else {
			return new Response("Not found", { status: 404 });
		}
	},
};
