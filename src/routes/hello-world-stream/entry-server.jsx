import { renderToReadableStream } from "react-dom/server.edge";
import { App } from "./App.jsx";
import Html from "../../components/Html.jsx";

/** @param {{ clientSrc: string }} props */
export default function render({ clientSrc }) {
	return renderToReadableStream(
		<Html title="Hello world renderToReadableStream" clientSrc={clientSrc}>
			<App />
		</Html>,
	);
}
