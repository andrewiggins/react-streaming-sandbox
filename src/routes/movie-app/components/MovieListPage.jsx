import { use } from "react";
import Spinner from "./Spinner.jsx";
import { fetchMovieList } from "../api/index.js";

// --------------------------
// Movie list page
// --------------------------
//
// Top Box Office
// - 🍅 97% Black Panther
// - 🤢 58% Peter Rabbit
// - 🤢 12% Fifty Shades Freed
// --------------------------

/** @param {{ loadingId: number | null; onMovieClick(id: number): void; }} props */
export default function MovieListPage(props) {
	const movieList = use(fetchMovieList());
	return (
		<>
			<h1 className="MovieListPage-header">Top Box Office {"🍿"}</h1>
			<ul className="MovieListPage-list">
				{movieList.map((movie) => (
					<MovieListItem
						key={movie.id}
						{...movie}
						onClick={(e) => {
							e.preventDefault();
							props.onMovieClick(movie.id);
						}}
						isLoading={props.loadingId && movie.id === props.loadingId}
					/>
				))}
			</ul>
		</>
	);
}

/** @param {{ isLoading: boolean | null | 0; onClick: React.MouseEventHandler<HTMLAnchorElement>; } & Movie} props */
function MovieListItem(props) {
	const opacity = props.isLoading === false ? 0.5 : 1;
	return (
		<li style={{ opacity }}>
			<a className="MovieListItem" href={`movie/${props.id}`} onClick={props.onClick}>
				<div className="MovieListItem-freshness">{props.fresh ? "🍅" : "🤢"}</div>
				<span className="MovieListItem-title">{props.title}</span>
				<span className="MovieListItem-meta">
					{props.rating} &middot; {props.gross}
				</span>
				<div className="MovieListItem-action">
					{props.isLoading ? <Spinner size="small" /> : <span className="MovieListItem-more">{"👉"}</span>}
				</div>
			</a>
		</li>
	);
}
