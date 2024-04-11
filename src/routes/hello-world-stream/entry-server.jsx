import { renderToReadableStream } from "react-dom/server.edge";
import { App } from "./App.jsx";
import Html from "../../Html.jsx";

/** @param {{ assets: Assets }} props */
export default function render({ assets }) {
	return renderToReadableStream(
		<Html title="Hello world renderToReadableStream" assets={assets}>
			<App />
		</Html>,
	);
}
