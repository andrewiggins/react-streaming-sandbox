/// <reference lib="dom" />

import { hydrateRoot } from "react-dom/client";
import { App } from "./App.jsx";

const rootDom = document.getElementById("root");
if (!rootDom) throw new Error("Root element not found");

console.log("pre-hydrateRoot");
hydrateRoot(rootDom, <App />);
console.log("post-hydrateRoot");
