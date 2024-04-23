import debug from "debug";
import { AsyncLocalStorage } from "node:async_hooks";
import { createServer } from "node:http";
import path from "node:path";
import sirv from "sirv";
import { WebSocketServer } from "ws";
import viteManifest from "../dist/src/.vite/manifest.json";
import { RequestController } from "../shared/RequestController.js";
import { setMockFetchStore } from "../src/fetch.js";
import renderIndex from "../src/index.jsx";
import fixturesSsrRender from "../src/routes/fixtures-ssr/entry-server.jsx";
import fixturesSsr2Render from "../src/routes/fixtures-ssr2/entry-server.jsx";
import helloWorldStreamRender from "../src/routes/hello-world-stream/entry-server.jsx";
import helloWorldStringRender from "../src/routes/hello-world-string/entry-server.jsx";
import movieAppRender from "../src/routes/movie-app/entry-server.jsx";
import { getRequest, setResponse } from "./request-transform.js";

const serverLog = debug("RSS:server");
const webSocketLog = debug("RSS:webSocket");

const fetchStore = new AsyncLocalStorage();

// Make CustomEvents serializable.
const proto = /** @type {any} */ (CustomEvent.prototype);
proto.toJSON = function () {
	return {
		type: this.type,
		detail: this.detail,
	};
};

const __dirname = new URL(".", import.meta.url).pathname;
/** @type {(...args: string[]) => string} */
const p = (...args) => path.join(__dirname, "..", ...args);

const port = 8787;
const base = "http://localhost:" + port;

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
const requestControllers = new Map();

/** @type {(request: Request) => Promise<Response>} */
async function handleRequest(request) {
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
			serverLog("Dispatching %s", pathname);
			const body = await route.render({ assets: route.assets, rcId });
			if (typeof body !== "string") {
				body.allReady.finally(() => {
					serverLog("Closing %s", pathname);
					requestControllers.delete(rcId);
				});
			}

			return createHtmlResponse(body);
		});
	} else {
		return new Response("Not found", { status: 404 });
	}
}

/** @type {(ws: import('ws').WebSocket, url: URL) => void} */
function setupWebSocket(ws, url) {
	const rcId = url.searchParams.get("rcId");
	if (!rcId) throw new Error("Missing rcId param");

	const rc = requestControllers.get(rcId);
	if (!rc) {
		console.warn("No request controller found for %s", rcId);
		return;
	}

	webSocketLog("Accepted WebSocket connection %s", rcId);

	ws.addEventListener("open", () => {
		webSocketLog("Connection opened %s", rcId);
	});
	ws.addEventListener("message", async (event) => {
		await handleWebSocketMessage(rcId, ws, event.data);
	});
	ws.addEventListener("close", (event) => {
		webSocketLog("Closing %s", rcId);
	});
	ws.addEventListener("error", (event) => {
		webSocketLog("Error: %s", event.error.stack);
	});

	rc.addEventListener("new-request", async (event) => {
		webSocketLog("Sending new request %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});
	rc.addEventListener("pause-request", async (event) => {
		webSocketLog("Sending request pause %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});
	rc.addEventListener("resume-request", async (event) => {
		webSocketLog("Sending request resume %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});
	rc.addEventListener("complete-request", async (event) => {
		webSocketLog("Sending request complete %s", event.detail.request.id);
		ws.send(JSON.stringify(event));
	});

	/** @type {SyncEvent} */
	const syncEvent = new CustomEvent("sync-state", {
		detail: { requests: Array.from(rc.requests.entries()), latency: rc.latency, areNewRequestsPaused: rc.areNewRequestsPaused },
	});
	ws.send(JSON.stringify(syncEvent));
}

/** @type {(rcId: string, ws: import('ws').WebSocket, message: Buffer[] | ArrayBuffer | string) => Promise<void>} */
async function handleWebSocketMessage(rcId, ws, message) {
	try {
		/** @type {MockFetchDebuggerEventMap[MockFetchDebuggerEventType] | { type: "ping" } | undefined} */
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

		webSocketLog(`Received message %s`, message);

		// Handle the message.
		if (event.type === "ping") {
			webSocketLog("Sending pong...");
			ws.send(JSON.stringify({ type: "pong" }));
		} else if (event.type === "request-pause") {
			requestController.pause(event.detail.requestId);
		} else if (event.type === "request-resume") {
			requestController.resume(event.detail.requestId);
		} else if (event.type === "request-new-request-paused") {
			requestController.areNewRequestsPaused = event.detail.value;
			ws.send(JSON.stringify({ type: "pause-new-requests", detail: { value: requestController.areNewRequestsPaused } }));
		}
	} catch (e) {
		// Report any exceptions directly back to the client. As with our handleErrors() this
		// probably isn't what you'd want to do in production, but it's convenient when testing.
		const error = /** @type {Error} */ (e);
		webSocketLog("Error: %s", error.stack);
		ws.send(JSON.stringify({ error: error.stack }));
	}
}

function main() {
	debug.enable("RSS:*");

	const server = createServer();
	const serveStatic = sirv(p("dist"), { dev: true });
	const wss = new WebSocketServer({ server, path: "/request-controller" });

	setMockFetchStore(fetchStore);

	wss.on("connection", function connection(ws, request) {
		if (!request.url) throw new Error("No request URL");
		const url = new URL(request.url, base);
		setupWebSocket(ws, url);
	});

	server.on("request", async (incomingMessage, serverRes) => {
		const request = await getRequest(base, incomingMessage);
		const { pathname } = new URL(request.url, base);

		if (pathname === "/favicon.ico" || pathname.startsWith("/src/")) {
			return serveStatic(incomingMessage, serverRes);
		} else {
			const res = await handleRequest(request);
			setResponse(serverRes, res);
			return;
		}
	});

	server.listen(port);
}

main();
