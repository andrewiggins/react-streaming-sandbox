import { Component, Suspense } from "react";
import Html from "../../../Html.jsx";
import Spinner from "./Spinner.jsx";
import "./styles.css";
import MovieListPage from "./MovieListPage.jsx";

/** @param {{ assets: Assets }} props */
export default function App({ assets }) {
	return (
		<Html assets={assets} title="Movie App">
			<Suspense fallback={<Spinner size="large" />}>
				<ErrorBoundary FallbackComponent={ErrorPage}>
					<MovieListPage loadingId={null} onMovieClick={(id) => console.log("clicked movie", id)} />
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

/**
 * @typedef {{ children: React.ReactNode; FallbackComponent: React.FC<{ error: Error }> }} Props
 * @extends {React.Component<Props>} */
class ErrorBoundary extends Component {
	/** @param {Props} props */
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	/** @param {Error} error */
	static getDerivedStateFromError(error) {
		return { error };
	}
	render() {
		if (this.state.error) {
			const FallbackComponent = this.props.FallbackComponent;
			return <FallbackComponent error={this.state.error} />;
		}
		return this.props.children;
	}
}
