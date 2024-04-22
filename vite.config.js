import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = new URL(".", import.meta.url).pathname;
/** @type {(...args: string[]) => string} */
const expand = (...args) => path.join(__dirname, ...args);

/**
 * @typedef ReactFileConfig
 * @property {"16" | "latest" | "archive"} version
 * @property {string} commit
 * @property {"development" | "profiling.min" | "production.min"} buildType
 */

/** @type {{ latest: ReactFileConfig; }} */
const config = {
	latest: {
		version: "latest",
		commit: "fdb368d9e",
		buildType: "profiling.min",
	},
};

const currentConfig = config.latest;

/** @type {(config: ReactFileConfig) => Record<string, string>} */
const getAliases = (config) => ({
	"react/jsx-runtime": expand(`./lib/${config.version}/react-jsx-runtime.${config.commit}.${config.buildType}.js`),
	react: expand(`./lib/${config.version}/react.${config.commit}.${config.buildType}.js`),
	"react-dom/server": expand(`./lib/${config.version}/react-dom-server-legacy.node.${config.commit}.production.min.js`),
	"react-dom/server.edge": expand(`./lib/${config.version}/react-dom-server.edge.${config.commit}.production.min.js`),
	"react-dom/client": expand(`./lib/${config.version}/react-dom.${config.commit}.${config.buildType}.js`),
	"react-dom": expand(`./lib/${config.version}/react-dom.${config.commit}.${config.buildType}.js`),
	scheduler: expand(`./lib/${config.version}/scheduler.${config.commit}.${config.buildType}.js`),
	"react-cache": expand(`./lib/${config.version}/react-cache.${config.commit}.${config.buildType}.js`),
});

const routes = Object.fromEntries(
	fs
		// Read directories in src/routes
		.readdirSync(expand("src/routes"), { withFileTypes: true })
		.filter((dirEntry) => dirEntry.isDirectory())
		// Filter out directories that don't have an entry-client.jsx file
		.filter((dir) => fs.existsSync(expand("src/routes", dir.name, "entry-client.jsx")))
		// Map to [name, path] to build { [name]: path } object
		.map((dir) => [dir.name, path.join("src/routes", dir.name, "entry-client.jsx")]),
);

export default defineConfig((args) => {
	return {
		plugins: [react()],
		resolve: {
			alias: getAliases(currentConfig),
		},
		build: {
			minify: false,
			sourcemap: true,
			target: "esnext",
			// Disable module preload to avoid vite guessing paths incorrectly due to our specific pathing setup
			modulePreload: false,
			assetsDir: "",
			rollupOptions: args.isSsrBuild
				? // SSR Build
					{
						output: {
							// inline dynamic imports on SSR to avoid weird Worker errors when
							// dynamically importing modules
							inlineDynamicImports: true,
						},
						external: ["cloudflare:workers"],
					}
				: // Client Build
					{
						output: {
							entryFileNames: "[name].js",
						},
						input: {
							...routes,
							"fetch-debugger": expand("src/fetch-debugger/index.js"),
						},
					},
		},
	};
});
