import { useState } from "react";

export function App() {
	const [count, setCount] = useState(0);

	return (
		<>
			<h1>Hello World!</h1>
			<div>
				Count: {count}{" "}
				<button type="button" onClick={() => setCount(count + 1)}>
					Add One
				</button>
			</div>
		</>
	);
}
