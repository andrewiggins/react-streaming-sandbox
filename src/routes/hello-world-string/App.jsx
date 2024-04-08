import { useState } from "react";

function Counter() {
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

export function App() {
	return (
		<>
			<h1>Hello World!</h1>
			<Counter />
		</>
	);
}
