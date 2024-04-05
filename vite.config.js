import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = new URL(".", import.meta.url).pathname;
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

export default defineConfig((args) => {
	return {
		plugins: [react()],
		resolve: {
			alias: getAliases(currentConfig),
		},
		build: {
			minify: false,
			sourcemap: true,
			modulePreload: { polyfill: false },
			assetsDir: "",
			rollupOptions: !args.isSsrBuild
				? {
						output: {
							entryFileNames: "[name].js",
						},
						input: {
							"entry-client": "src/entry-client.jsx",
						},
					}
				: undefined,
		},
	};
});
