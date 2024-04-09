import { renderToReadableStream } from "react-dom/server.edge";
import App from "./components/App.jsx";
import { DataProvider } from "./components/data.jsx";
import { API_DELAY, ABORT_DELAY } from "./delays.js";

/** @param {{ assets: Assets }} props */
export default async function render({ assets }) {
	const data = createServerData();
	const controller = new AbortController();

	// let didError = false;
	const stream = await renderToReadableStream(
		<DataProvider data={data}>
			<App assets={{ "main.js": assets.js, "main.css": assets.css[0] }} />
		</DataProvider>,
		{
			bootstrapModules: [assets.js],
			// onAllReady() {
			// 	// Full completion.
			// 	// You can use this for SSG or crawlers.
			// },
			// onShellReady() {
			// 	// If something errored before we started streaming, we set the error code appropriately.
			// 	res.statusCode = didError ? 500 : 200;
			// 	res.setHeader("Content-type", "text/html");
			// 	pipe(res);
			// },
			// onShellError(x) {
			// 	// Something errored before we could complete the shell so we emit an alternative shell.
			// 	res.statusCode = 500;
			// 	res.send("<!doctype><p>Error</p>");
			// },
			onError(x) {
				// didError = true;
				console.error(x);
			},
			signal: controller.signal,
		},
	);
	// Abandon and switch to client rendering if enough time passes.
	// Try lowering this to see the client recover.
	setTimeout(() => controller.abort, ABORT_DELAY);

	return stream;
}

// Simulate a delay caused by data fetching.
// We fake this because the streaming HTML renderer
// is not yet integrated with real data fetching strategies.
function createServerData() {
	let done = false;
	/** @type {Promise<void> | null} */
	let promise = null;
	return {
		read() {
			if (done) {
				return;
			}
			if (promise) {
				throw promise;
			}
			promise = new Promise((resolve) => {
				setTimeout(() => {
					done = true;
					promise = null;
					resolve();
				}, API_DELAY);
			});
			throw promise;
		},
	};
}
