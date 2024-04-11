import { Suspense } from "react";
import Html from "../../../components/Html.jsx";
import Spinner from "./Spinner.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./styles.css";

/** @param {{ assets: Assets }} props */
export default function App({ assets }) {
	return (
		<Html assets={assets} title="Movie App">
			<Suspense fallback={<Spinner size="large" />}>
				<ErrorBoundary FallbackComponent={ErrorPage}>
					<h1>Movie App</h1>
				</ErrorBoundary>
			</Suspense>
		</Html>
	);
}

/** @param {{ error: Error }} props */
function ErrorPage({ error }) {
	return (
		<div>
			<h1>Application Error</h1>
			<pre style={{ whiteSpace: "pre-wrap" }}>{error.stack}</pre>
		</div>
	);
}
