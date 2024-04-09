import { Suspense, lazy } from "react";
import Html from "./Html.jsx";
import Spinner from "./Spinner.jsx";
import Layout from "./Layout.jsx";
import NavBar from "./NavBar.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

const Comments = lazy(() => import("./Comments.jsx"));
const Sidebar = lazy(() => import("./Sidebar.jsx"));
const Post = lazy(() => import("./Post.jsx"));

/** @param {{ assets: import('./Html.jsx').SSRAssets}} props */
export default function App({ assets }) {
	return (
		<Html assets={assets} title="Hello">
			<Suspense fallback={<Spinner />}>
				<ErrorBoundary FallbackComponent={Error}>
					<Content />
				</ErrorBoundary>
			</Suspense>
		</Html>
	);
}

function Content() {
	return (
		<Layout>
			<NavBar />
			<aside className="sidebar">
				<Suspense fallback={<Spinner />}>
					<Sidebar />
				</Suspense>
			</aside>
			<article className="post">
				<Suspense fallback={<Spinner />}>
					<Post />
				</Suspense>
				<section className="comments">
					<h2>Comments</h2>
					<Suspense fallback={<Spinner />}>
						<Comments />
					</Suspense>
				</section>
				<h2>Thanks for reading!</h2>
			</article>
		</Layout>
	);
}

/** @param {{ error: Error }} props */
function Error({ error }) {
	return (
		<div>
			<h1>Application Error</h1>
			<pre style={{ whiteSpace: "pre-wrap" }}>{error.stack}</pre>
		</div>
	);
}
