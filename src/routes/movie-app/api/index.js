import { movieDetailsJSON, movieListJSON, movieReviewsJSON } from "./data.js";
import { getMockFetch } from "../../../fetch.js";

/** @type {() => Promise<MovieList>} */
export async function fetchMovieList() {
	const fetch = await getMockFetch();
	return fetch("/movies").then(() => movieListJSON);
}

/** @type {(id: number) => Promise<MovieDetails>} */
export async function fetchMovieDetails(id) {
	const fetch = await getMockFetch();
	return fetch(`/movie/${id}`).then(() => movieDetailsJSON[id]);
}

/** @type {(id: number) => Promise<MovieReview[]>} */
export async function fetchMovieReviews(id) {
	const fetch = await getMockFetch();
	return fetch(`/movie/${id}/reviews`).then(() => movieReviewsJSON[id]);
}

/** @type {(src: string) => Promise<string>} */
export async function fetchImage(src) {
	const fetch = await getMockFetch();
	return fetch(`/image/${src}`).then(() => src);
}
