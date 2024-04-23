import { createServer } from "http";
import path from "path";
import sirv from "sirv";
import { WebSocketServer } from "ws";
import { getRequest, setResponse } from "./request-transform.js";
import { handleRequest } from "./server.js";
import debug from "debug";
import { setupWebSocket } from "./websocket.js";

debug.enable("RSS:*");

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

const server = createServer();
const serveStatic = sirv(p("dist"), { dev: true });
const wss = new WebSocketServer({ server, path: "/request-controller" });

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
