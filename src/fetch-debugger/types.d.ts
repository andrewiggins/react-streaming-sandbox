interface Window {
	RCID?: string;
	fetchDebugger: import("./mockFetchDebugger.js").MockFetchDebugger;
	logTime(label: string): void;
}
