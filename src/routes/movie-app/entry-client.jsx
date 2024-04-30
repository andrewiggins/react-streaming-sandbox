import { hydrateRoot } from "react-dom/client";
import { hydrate } from "react-dom";
import App from "./components/App.jsx";
import { installMockFetch } from "../../setup.js";

installMockFetch();

const assets = /** @type {any} */ (window).assetManifest;
const remoteRCID = window.RCID;

const concurrentMode = true;
if (concurrentMode) {
	console.log("Hydrating with concurrent mode");
	hydrateRoot(document, <App url={location.href} assets={assets} rcId={remoteRCID} />);
} else {
	console.log("Hydrating legacy mode");
	hydrate(<App url={location.href} assets={assets} />, document);
}
