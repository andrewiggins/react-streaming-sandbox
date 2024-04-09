/** @type {Promise<void> | null} */
let promise = null;
let isResolved = false;

/** @param {{ label: string, children: React.ReactNode }} props */
export default function Suspend({ label, children }) {
	// This will suspend the content from rendering but only on the client.
	// This is used to demo a slow loading app.
	if (!isResolved) {
		if (promise === null) {
			const timeoutMs = typeof window === "object" ? 6000 : 1000;
			console.log(`[${label}] Suspending for ${timeoutMs}ms`);

			promise = new Promise((resolve) => {
				setTimeout(() => {
					isResolved = true;
					console.log(`[${label}] Resuming`);
					resolve();
				}, timeoutMs);
			});
		}

		console.log(`[${label}] Throwing promise`);
		throw promise;
	}

	console.log(`[${label}] Rendering`);
	return children;
}
