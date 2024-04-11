import { renderToString } from "react-dom/server";
import { App } from "./App.jsx";
import Html from "../../Html.jsx";

/** @param {{ assets: Assets }} props */
export default async function render({ assets }) {
	return (
		"<!doctype html>" +
		renderToString(
			<Html title="Hello world renderToString" assets={assets}>
				<App />
			</Html>,
		)
	);
}
