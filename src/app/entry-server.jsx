import { renderToString } from "react-dom/server";
import { App } from "./components/App.jsx";

export function render() {
	return renderToString(<App />);
}
