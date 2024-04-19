import debug from "debug";
import viteManifest from "../dist/src/.vite/manifest.json";
import renderIndex from "../src/index.jsx";
import helloWorldStringRender from "../src/routes/hello-world-string/entry-server.jsx";
import helloWorldStreamRender from "../src/routes/hello-world-stream/entry-server.jsx";
import fixturesSsrRender from "../src/routes/fixtures-ssr/entry-server.jsx";
import fixturesSsr2Render from "../src/routes/fixtures-ssr2/entry-server.jsx";
import movieAppRender from "../src/routes/movie-app/entry-server.jsx";
import { RCIDName } from "./constants.js";
import { RequestController } from "./RequestController.js";
import { fetchStore } from "./fetch.js";

debug.enable("RSS:*");
const workerLog = debug("RSS:_worker");
const webSocketLog = debug("RSS:webSocket");

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

/** @type {Map<string, RequestController>} */
const requestControllers = new Map();

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

		// setTimeout(() => {
		// 	console.log("=".repeat(40));
		// }, 1);

		if (pathname === "/request-controller") {
			return handleErrors(request, async () => {
				const url = new URL(request.url);

				const rcId = url.searchParams.get(RCIDName);
				if (!rcId) {
					return new Response("Missing rcId param", { status: 400 });
				}

				const rc = requestControllers.get(rcId);
				if (!rc) {
					return new Response("No request controller found", { status: 404 });
				}

				// Expect to receive a WebSocket Upgrade request.
				// If there is one, accept the request and return a WebSocket Response.
				const upgradeHeader = request.headers.get("Upgrade");
				if (!upgradeHeader || upgradeHeader !== "websocket") {
					return new Response("Expected Upgrade: websocket", { status: 426 });
				}

				// Creates two ends of a WebSocket connection.
				const webSocketPair = new WebSocketPair();
				const [client, server] = Object.values(webSocketPair);

				webSocketLog("Accepted WebSocket connection %s", rcId);
				server.accept();

				server.addEventListener("open", () => {
					webSocketLog("Connection opened %s", rcId);
				});
				server.addEventListener("message", async (event) => {
					await handleWebSocketMessage(rcId, server, event.data);
				});
				server.addEventListener("close", (event) => {
					webSocketLog("Closing %s", rcId);
					// TODO: Should I do this??
					// requestControllers.delete(rcId);
				});
				server.addEventListener("error", (event) => {
					webSocketLog("Error: %s", event.error.stack);
					// TODO: Should I do this??
					// requestControllers.delete(rcId);
				});

				rc.addEventListener("new-request", async (event) => {
					let strEvent = "";
					try {
						webSocketLog("Serializing new request %s", event.request.id);
						strEvent = JSON.stringify(event);

						// setTimeout(() => {
						try {
							console.log("=".repeat(40));
							webSocketLog("Sending new request %s", strEvent);
							server.send(strEvent);
						} catch (e) {
							webSocketLog("Send Error: %s", e.stack);
						}
						// }, 1);
					} catch (e) {
						webSocketLog("JSON Error: %s", e.stack);
					}
				});
				rc.addEventListener("request-complete", async (event) => {
					let strEvent = "";
					try {
						webSocketLog("Serializing request complete %s", event.request.id);
						strEvent = JSON.stringify(event);

						// setTimeout(() => {
						try {
							console.log("=".repeat(40));
							webSocketLog("Sending request complete %s", strEvent);
							server.send(strEvent);
						} catch (e) {
							webSocketLog("Send Error: %s", e.stack);
						}
						// }, 1);
					} catch (e) {
						webSocketLog("JSON Error: %s", e.stack);
					}
				});

				return new Response(null, {
					status: 101,
					webSocket: client,
				});
			});
		} else if (pathname === "/favicon.ico" || pathname.startsWith("/src/")) {
			return env.ASSETS.fetch(request);
		} else if (pathname === "/") {
			return createHtmlResponse(await renderIndex(routes));
		} else if (pathname in routes) {
			const route = routes[pathname];
			const rcId = crypto.randomUUID();
			const rc = new RequestController(rcId);
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

/** @type {(rcId: string, ws: WebSocket, message: ArrayBuffer | string) => Promise<void>} */
async function handleWebSocketMessage(rcId, ws, message) {
	try {
		/** @type {RequestControllerClientEvent | { type: "ping" } | undefined} */
		let event;
		try {
			event = JSON.parse(message.toString());
		} catch {}

		const requestController = requestControllers.get(rcId);

		if (!event) {
			webSocketLog(`Received ${JSON.stringify(message)} which is not an JSON object. Ignoring...`);
			return;
		} else if (!requestController) {
			webSocketLog(`Received ${JSON.stringify(event?.type ?? message)} but no request controller set. Ignoring...`);
			return;
		}

		webSocketLog(`Received message %s`, event);

		// Handle the message.
		if (event.type === "ping") {
			webSocketLog("Sending pong...");
			ws.send(JSON.stringify({ type: "pong" }));
		} else if (event.type === "request-pause") {
			requestController.pause(event.requestId);
		} else if (event.type === "request-resume") {
			requestController.resume(event.requestId);
		} else if (event.type === "pause-new-requests") {
			requestController.areNewRequestsPaused = event.value;
		}
	} catch (e) {
		// Report any exceptions directly back to the client. As with our handleErrors() this
		// probably isn't what you'd want to do in production, but it's convenient when testing.
		const error = /** @type {Error} */ (e);
		webSocketLog("Error: %s", error.stack);
		ws.send(JSON.stringify({ error: error.stack }));
	}
}

/**
 * `handleErrors()` is a little utility function that can wrap an HTTP request
 * handler in a try/catch and return errors to the client. You probably wouldn't
 * want to use this in production code but it is convenient when debugging and
 * iterating.
 * @param {Request} request
 * @param {() => Promise<Response>} func
 * @returns {Promise<Response>}
 */
async function handleErrors(request, func) {
	try {
		return await func();
	} catch (err) {
		const error = /** @type {Error} */ (err);
		if (request.headers.get("Upgrade") == "websocket") {
			// Annoyingly, if we return an HTTP error in response to a WebSocket request, Chrome devtools
			// won't show us the response body! So... let's send a WebSocket response with an error
			// frame instead.
			let pair = new WebSocketPair();
			pair[1].accept();
			pair[1].send(JSON.stringify({ error: error.stack }));
			pair[1].close(1011, "Uncaught exception during session setup");
			return new Response(null, { status: 101, webSocket: pair[0] });
		} else {
			return new Response(error.stack, { status: 500 });
		}
	}
}
