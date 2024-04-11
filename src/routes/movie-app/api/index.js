import { movieListJSON } from "./data.js";

/** @type {() => Promise<MovieList>} */
export async function fetchMovieList() {
	return movieListJSON;
}
