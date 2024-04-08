import { renderToString } from "react-dom/server";
import { renderToReadableStream } from "react-dom/server.edge";
import { App } from "./components/App.jsx";

/** @type {() => Promise<string | import('react-dom/server').ReactDOMServerReadableStream>} */
// export const render = renderString;
export const render = renderStream;

async function renderString() {
	return renderToString(
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>React streaming sandbox</title>
			</head>
			<body>
				<div id="root">
					<App />
				</div>
				<script src="./src/entry-client.js" type="module"></script>
			</body>
		</html>,
	);
}

function renderStream() {
	return renderToReadableStream(
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>React streaming sandbox</title>
			</head>
			<body>
				<script type="text/javascript" dangerouslySetInnerHTML={{ __html: 'console.log("pre-root");' }}></script>
				<div id="root">
					<App />
				</div>
				<script type="text/javascript" dangerouslySetInnerHTML={{ __html: 'console.log("post-root");' }}></script>
				<script src="./src/entry-client.js" type="module"></script>
			</body>
		</html>,
	);
}
