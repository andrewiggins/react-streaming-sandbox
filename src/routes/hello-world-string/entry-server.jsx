import { renderToString } from "react-dom/server";
import { App } from "./App.jsx";
import Html from "../../components/Html.jsx";

/** @param {{ clientSrc: string }} props */
export default async function render({ clientSrc }) {
	return (
		"<!doctype html>" +
		renderToString(
			<Html title="Hello world renderToString" clientSrc={clientSrc}>
				<App />
			</Html>,
		)
	);
}
