import { render } from "./src/entry-server.jsx";

/**
 * @typedef {Required<ExportedHandler<Environment>>} RequiredExportedHandler
 * @type {{ fetch: RequiredExportedHandler["fetch"] }}
 */
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/src/")) {
			return env.ASSETS.fetch(request);
		} else {
			return new Response(render(), {
				headers: {
					"content-type": "text/html; charset=utf-8",
				},
			});
		}
	},
};
