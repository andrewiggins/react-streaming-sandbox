import { hydrateRoot } from "react-dom/client";
import { hydrate } from "react-dom";
import App from "./components/App.jsx";
import { installMockFetch } from "../../fetch-debugger/mockFetch.js";

installMockFetch();

const assets = /** @type {any} */ (window).assetManifest;

const concurrentMode = true;
if (concurrentMode) {
	hydrateRoot(document, <App assets={assets} />);
} else {
	hydrate(<App assets={assets} />, document);
}
