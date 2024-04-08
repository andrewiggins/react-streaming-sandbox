import { use, useState } from "react";
import { fetchCount } from "../data/count.js";

// /** @type {Promise<number> | undefined} */
// let promise;
// function useInitialCount() {
// 	if (!promise) {
// 		console.log("=== initialCount creating");
// 		promise = fetchCount().then((num) => {
// 			console.log("=== initialCount resolved");
// 			promise = undefined;
// 			return num;
// 		});
// 	}

// 	console.log("=== initialCount using");
// 	return use(promise);
// }

export function Counter() {
	// const initialCount = useInitialCount();
	const initialCount = 0;
	const [count, setCount] = useState(initialCount);

	return (
		<div>
			<button type="button" onClick={() => setCount(count - 1)}>
				-1
			</button>{" "}
			Count: {count}{" "}
			<button type="button" onClick={() => setCount(count + 1)}>
				+1
			</button>
		</div>
	);
}
