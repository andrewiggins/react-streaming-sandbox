import { hydrateRoot } from "react-dom/client";
import App from "./components/App.jsx";
import { installMockFetch } from "../../fetch-debugger/mockFetch.js";

installMockFetch();

const assets = /** @type {any} */ (window).assetManifest;
hydrateRoot(document, <App assets={assets} />);
