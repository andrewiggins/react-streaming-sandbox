import { useContext, useState, Suspense } from "react";

import Chrome from "./Chrome.jsx";
import Page from "./Page.jsx";
import Page2 from "./Page2.jsx";
import Theme from "./Theme.jsx";

function LoadingIndicator() {
	let theme = useContext(Theme);
	return <div className={theme + "-loading"}>Loading...</div>;
}

function Content() {
	/** @type {[any, any]} */
	let [CurrentPage, switchPage] = useState(() => Page);
	return (
		<div>
			<h1>Hello World</h1>
			<a className="link" onClick={() => switchPage(() => Page)}>
				Page 1
			</a>
			{" | "}
			<a className="link" onClick={() => switchPage(() => Page2)}>
				Page 2
			</a>
			<Suspense fallback={<LoadingIndicator />}>
				<CurrentPage />
			</Suspense>
		</div>
	);
}

/** @param {{ assets: import('./Chrome.jsx').SSRAssets }} props */
export default function App({ assets }) {
	return (
		<Chrome title="Hello World" assets={assets}>
			<Content />
		</Chrome>
	);
}
