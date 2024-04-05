/// <reference lib="dom" />

import { hydrateRoot } from "react-dom/client";
import { App } from "./components/App.jsx";

const rootDom = document.getElementById("root");
if (!rootDom) throw new Error("Root element not found");

hydrateRoot(rootDom, <App />);
