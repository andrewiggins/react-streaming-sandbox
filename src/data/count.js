const delay = (ms = 3000) => new Promise((resolve) => setTimeout(resolve, ms));

const randomInt = (max = 100) => Math.floor(Math.random() * max);

/** @type {() => Promise<number>} */
export function fetchCount() {
	return delay().then(() => randomInt());
}
