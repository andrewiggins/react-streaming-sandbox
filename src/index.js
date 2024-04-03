/**
 * @typedef {Required<ExportedHandler<Environment>>} RequiredExportedHandler
 * @type {{ fetch: RequiredExportedHandler["fetch"] }}
 */
export default {
	async fetch(request, env, ctx) {
		return new Response("Hello World!!!");
	},
};
