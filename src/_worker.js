import { render } from "./app/entry-server.jsx";
import indexHtml from "./index.html";

/**
 * @typedef {Required<ExportedHandler<Environment>>} RequiredExportedHandler
 * @type {{ fetch: RequiredExportedHandler["fetch"] }}
 */
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/app/")) {
			return env.ASSETS.fetch(request);
		} else {
			return new Response(indexHtml.replace('<div id="root"></div>', `<div id="root">${render()}</div>`), {
				headers: {
					"content-type": "text/html; charset=utf-8",
				},
			});
		}
	},
};
