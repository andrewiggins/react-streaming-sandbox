import { renderToString } from "react-dom/server";
import { renderToReadableStream } from "react-dom/server.edge";
import App from "./components/App.jsx";

const useStream = true;

/**
 * @param {RootProps} props
 * @returns {Promise<string>}
 */
async function renderAppToString(props) {
	return renderToString(<App {...props} />);
}

/**
 * @param {RootProps} props
 * @returns {Promise<import("react-dom/server.edge").ReactDOMServerReadableStream>}
 */
async function renderAppToStream(props) {
	const abortController = new AbortController();

	/** @type {RootProps} */
	const appProps = { ...props, assets: { ...props.assets, js: "" } };
	const stream = await renderToReadableStream(<App {...appProps} />, {
		bootstrapModules: [props.assets.js],
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

const render = useStream ? renderAppToStream : renderAppToString;
export default render;
