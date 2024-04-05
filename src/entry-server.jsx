import { renderToString } from "react-dom/server";
import { App } from "./components/App.jsx";

export function render() {
	return (
		"<!DOCTYPE html>\n" +
		renderToString(
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
		)
	);
}
