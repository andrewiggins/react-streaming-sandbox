import debug from "debug";
import viteManifest from "../dist/src/.vite/manifest.json";
import renderIndex from "../src/index.jsx";
import helloWorldStringRender from "../src/routes/hello-world-string/entry-server.jsx";
import helloWorldStreamRender from "../src/routes/hello-world-stream/entry-server.jsx";
import fixturesSsrRender from "../src/routes/fixtures-ssr/entry-server.jsx";
import fixturesSsr2Render from "../src/routes/fixtures-ssr2/entry-server.jsx";
import movieAppRender from "../src/routes/movie-app/entry-server.jsx";
import { RequestController } from "../shared/RequestController.js";
import { fetchStore } from "./fetch.js";

debug.enable("RSS:*");
const workerLog = debug("RSS:_worker");

/**
 * @typedef {ReadableStream | string | ArrayBuffer | Blob | URLSearchParams | FormData} BodyInit
 * @type {(body: BodyInit | null | undefined) => Response}
 */
function createHtmlResponse(body) {
	return new Response(/** @type {any} */ (body), {
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

/** @type {Map<string, RequestController>} */
export const requestControllers = new Map();

// export { RequestControllerClientConnection } from "./RequestControllerClientConnection.js";

/**
 * @typedef {import('@cloudflare/workers-types').ExportedHandler<T>} ExportedHandler
 * @template T
 */

export default {
	/** @type {(request: Request, env: Environment, ctx: any) => Promise<Response>} */
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const pathname = url.pathname;

		if (pathname === "/request-controller") {
			throw new Error('Unexpected "/request-controller" request.');
		} else if (pathname === "/favicon.ico" || pathname.startsWith("/src/")) {
			return env.ASSETS.fetch(request);
		} else if (pathname === "/") {
			return createHtmlResponse(await renderIndex(routes));
		} else if (pathname in routes) {
			const route = routes[pathname];
			const rcId = crypto.randomUUID();
			const rc = new RequestController(rcId, "server");
			requestControllers.set(rcId, rc);

			return fetchStore.run(rc.fetch, async () => {
				workerLog("Dispatching %s", pathname);
				const body = await route.render({ assets: route.assets, rcId });
				if (typeof body !== "string") {
					body.allReady.finally(() => {
						workerLog("Closing %s", pathname);
						requestControllers.delete(rcId);
					});
				}

				return createHtmlResponse(body);
			});
		} else {
			return new Response("Not found", { status: 404 });
		}
	},
};

// /**
//  * `handleErrors()` is a little utility function that can wrap an HTTP request
//  * handler in a try/catch and return errors to the client. You probably wouldn't
//  * want to use this in production code but it is convenient when debugging and
//  * iterating.
//  * @param {Request} request
//  * @param {() => Promise<Response>} func
//  * @returns {Promise<Response>}
//  */
// async function handleErrors(request, func) {
// 	try {
// 		return await func();
// 	} catch (err) {
// 		const error = /** @type {Error} */ (err);
// 		if (request.headers.get("Upgrade") == "websocket") {
// 			// Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
// 			// won't show us the response body! So... let's send a WebSocket response with an error
// 			// frame instead.
// 			let pair = new WebSocketPair();
// 			pair[1].accept();
// 			pair[1].send(JSON.stringify({ error: error.stack }));
// 			pair[1].close(1011, "Uncaught exception during session setup");
// 			return new Response(null, { status: 101, webSocket: pair[0] });
// 		} else {
// 			return new Response(error.stack, { status: 500 });
// 		}
// 	}
// }
