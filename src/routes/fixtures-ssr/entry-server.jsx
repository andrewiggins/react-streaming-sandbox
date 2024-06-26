import { renderToReadableStream } from "react-dom/server.edge";
import App from "./components/App.jsx";

/** @param {{ assets: Assets }} props */
export default async function render({ assets }) {
	const abortController = new AbortController();

	const stream = await renderToReadableStream(<App assets={{ "main.js": assets.js, "main.css": assets.css[0] }} />, {
		bootstrapModules: [assets.js],
		// onShellReady() {
		// 	// If something errored before we started streaming, we set the error code appropriately.
		// 	response.statusCode = didError ? 500 : 200;
		// 	response.setHeader("Content-type", "text/html");
		// 	stream.pipeTo(response);
		// },
		/** @type {(e: any) => void} */
		onError(e) {
			console.error(e);
			// response.statusCode = 500;
			// response.send("<!doctype><p>Error</p>");
		},
		signal: abortController.signal,
	});

	// Abandon and switch to client rendering after 5 seconds.
	// Try lowering this to see the client recover.
	// setTimeout(() => abortController.abort(), 1000);

	return stream;
}
