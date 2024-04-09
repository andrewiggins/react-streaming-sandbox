import { hydrateRoot } from "react-dom/client";
import App from "./components/App.jsx";

const assets = /** @type {any} */ (window).assetManifest;
hydrateRoot(document, <App assets={assets} />);
