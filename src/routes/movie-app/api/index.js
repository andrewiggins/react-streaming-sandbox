import { movieListJSON } from "./data.js";
import { getMockFetch } from "../../../fetch.js";

/** @type {() => Promise<MovieList>} */
export async function fetchMovieList() {
	const fetch = await getMockFetch();
	return fetch("/movies").then(() => movieListJSON);
}
