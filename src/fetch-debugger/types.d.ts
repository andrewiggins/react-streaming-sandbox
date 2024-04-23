interface Window {
	RCID?: string;
	fetchDebugger: import("./mockFetchDebugger.js").MockFetchDebugger;
}

type FetchDebuggerEventType = keyof FetchDebuggerEventMap;
interface FetchDebuggerEventMap {
	"request-pause": CustomEvent<{ requestId: MockRequest["id"] }, "request-pause">;
	"request-resume": CustomEvent<{ requestId: MockRequest["id"] }, "request-resume">;
	"request-new-request-paused": CustomEvent<{ value: boolean }, "request-new-request-paused">;
}

type FetchDebuggerEventTarget = EventTarget<FetchDebuggerEventMap & HTMLElementEventMap>;
