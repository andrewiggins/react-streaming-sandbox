import esbuild from "esbuild";
import { readdirSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Clean dist
if (existsSync("dist")) {
	const contents = readdirSync("dist");
	contents.forEach((file) => {
		rmSync(`dist/${file}`, { recursive: true });
	});
}

// Client build
const out = await esbuild.build({
	entryPoints: ["src/app/entry-client.jsx"],
	bundle: true,
	outdir: "dist/app",
	sourcemap: true,
	minify: false,
	metafile: true,
});

console.log(await esbuild.analyzeMetafile(out.metafile));

// Server build
execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "deploy", "src/_worker.js", "--dry-run", "--outdir=dist"], {
	stdio: "inherit",
});
