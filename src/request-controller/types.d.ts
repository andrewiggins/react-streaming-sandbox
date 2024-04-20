type MockRequest = import("../../server/RequestController.js").MockRequest;

type RequestControllerClientEventType = "init" | "request-pause" | "request-resume" | "pause-new-requests";

interface BaseRequestControllerClientEvent<T extends RequestControllerClientEventType> extends Event {
	type: T;
}

interface ChangeRequestStateEvent extends BaseRequestControllerClientEvent<"request-pause" | "request-resume"> {
	requestId: string;
}

interface PauseNewRequestsEvent extends BaseRequestControllerClientEvent<"pause-new-requests"> {
	value: boolean;
}

type RequestControllerClientEvent = ChangeRequestStateEvent | PauseNewRequestsEvent;

interface Window {
	RCID?: string;
}
