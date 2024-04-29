import { hydrateRoot } from "react-dom/client";
import { hydrate } from "react-dom";
import App from "./components/App.jsx";
import { installMockFetch } from "../../setup.js";

installMockFetch();

const assets = /** @type {any} */ (window).assetManifest;
const remoteRCID = window.RCID;

const concurrentMode = true;
if (concurrentMode) {
	hydrateRoot(document, <App assets={assets} rcId={remoteRCID} />);
} else {
	hydrate(<App assets={assets} />, document);
}
