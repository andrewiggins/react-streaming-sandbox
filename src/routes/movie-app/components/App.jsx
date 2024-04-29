import { Component, Suspense, lazy, useState, useEffect, useCallback, startTransition } from "react";
import Html from "../../../Html.jsx";
import Spinner from "./Spinner.jsx";
import "./styles.css";
import MovieListPage from "./MovieListPage.jsx";

const MoviePageLoader = lazy(() => import("./MoviePage.jsx"));

/** @param {RootProps} props */
export default function Root(props) {
	return (
		<Html {...props} title="Movie App">
			<Suspense fallback={<Spinner size="large" />}>
				<ErrorBoundary FallbackComponent={ErrorPage}>
					<App />
				</ErrorBoundary>
			</Suspense>
		</Html>
	);
}

/**
 * @typedef {{ showDetail: false; currentId: null;  }} ListAppState
 * @typedef {{ showDetail: false; currentId: number;  }} LoadingDetailAppState
 * @typedef {{ showDetail: true; currentId: number;  }} DetailAppState
 * @typedef {ListAppState | LoadingDetailAppState | DetailAppState} AppState
 */
function App() {
	const [state, setState] = useState(/** @type {AppState} */ ({ showDetail: false, currentId: null }));

	useEffect(() => {
		window?.scrollTo(0, 0);
	}, [state.showDetail, state.currentId]);

	/** @type {(id: number) => void} */
	const handleMovieClick = useCallback((id) => {
		setState({
			showDetail: false,
			currentId: id,
		});
		startTransition(() => {
			setState({
				showDetail: true,
				currentId: id,
			});
		});
	}, []);

	/** @type {() => void} */
	const handleBackClick = useCallback(() => {
		setState({
			currentId: null,
			showDetail: false,
		});
	}, []);

	const { currentId, showDetail } = state;
	return (
		<div className="App">
			{showDetail ? (
				<>
					<button className="App-back" onClick={handleBackClick}>
						{"👈"}
					</button>
					<Suspense fallback={<Spinner size="large" />}>
						<MoviePageLoader id={currentId} />
					</Suspense>
				</>
			) : (
				<Suspense fallback={<Spinner size="large" />}>
					<MovieListPage loadingId={currentId} onMovieClick={handleMovieClick} />
				</Suspense>
			)}
		</div>
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
