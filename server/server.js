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

const workerLog = debug("RSS:server");

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

/** @type {(request: Request) => Promise<Response>} */
export async function handleRequest(request) {
	const url = new URL(request.url);
	const pathname = url.pathname;

	if (pathname === "/") {
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
}
