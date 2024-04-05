import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig((args) => {
	return {
		plugins: [react()],
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
