import { movieDetailsJSON, movieListJSON, movieReviewsJSON } from "./data.js";
import { getMockFetch } from "../../../../shared/fetch.js";
import { getFetchCache } from "../../../../shared/cache.js";

/**
 * @overload
 * @param {() => Promise<R>} fetcher
 * @param {(arg: undefined) => string | undefined} [getCacheKey]
 * @returns {() => Promise<R>}
 * @template R
 */
/**
 * @overload
 * @param {(arg: P) => Promise<R>} fetcher
 * @param {(arg: P) => P | undefined} [getCacheKey]
 * @returns {(arg: P) => Promise<R>}
 * @template P
 * @template R
 */
/**
 * @param {(arg?: P) => Promise<R>} fetcher
 * @param {(arg?: P) => P | undefined} [getCacheKey]
 * @returns {(arg?: P) => Promise<R>}
 * @template P
 * @template R
 */
function createResource(fetcher, getCacheKey = (arg) => arg) {
	return (arg) => {
		const cacheKey = getCacheKey(arg);

		/** @type {FetchCache<P | undefined, Promise<R>>} */
		const cache = getFetchCache();
		if (cacheKey !== undefined && cache.has(cacheKey)) {
			return /** @type {Promise<R>} */ (cache.get(cacheKey));
		}
		const promise = fetcher(arg); // TODO: Figure out cache invalidation....
		cache.set(cacheKey, promise);
		return promise;
	};
}

/** @type {() => Promise<MovieList>} */
async function fetchMovieList() {
	const fetch = await getMockFetch();
	return fetch("/movies").then(() => movieListJSON);
}
export const fetchMovieListResource = createResource(fetchMovieList, () => "/movies");

/** @type {(id: number) => Promise<MovieDetails>} */
async function fetchMovieDetails(id) {
	const fetch = await getMockFetch();
	return fetch(`/movie/${id}`).then(() => movieDetailsJSON[id]);
}
export const fetchMovieDetailsResource = createResource(fetchMovieDetails);

/** @type {(id: number) => Promise<MovieReview[]>} */
async function fetchMovieReviews(id) {
	const fetch = await getMockFetch();
	return fetch(`/movie/${id}/reviews`).then(() => movieReviewsJSON[id]);
}
export const fetchMovieReviewsResource = createResource(fetchMovieReviews);

/** @type {(src: string) => Promise<string>} */
async function fetchImage(src) {
	const fetch = await getMockFetch();
	return fetch(`/image/${src}`).then(() => src);
}
export const fetchImageResource = createResource(fetchImage);
