interface MockRequest {
	/** @type {string} */
	id: string;
	/** @type {string} */
	source: string;
	/** @type {string} Display name of the request */
	name: string;
	/** @type {number | null} When this request should resolve. If null, request is paused and not scheduled to complete */
	expiresAt: number | null;
	/** @type {number} Total time in milliseconds this request should wait */
	latency: number;
	/** @type {number} Tracks how much time of duration has elapsed when a request is paused/resumed */
	elapsedTime: number;
}

type RequestControllerEventType = keyof RequestControllerEventMap;
type RequestControllerEvent<EventType> = CustomEvent<{ request: MockRequest }, EventType>;

type SyncRequests = CustomEvent<
	{
		requests: Array<[string, MockRequest]>;
	},
	"sync-requests"
>;

type PauseNewRequestsEvent = CustomEvent<
	{
		value: boolean;
	},
	"pause-new-requests"
>;

interface RequestControllerEventMap {
	"new-request": RequestControllerEvent<"new-request">;
	"pause-request": RequestControllerEvent<"pause-request">;
	"resume-request": RequestControllerEvent<"resume-request">;
	"complete-request": RequestControllerEvent<"complete-request">;
	"sync-requests": SyncRequests;
	"pause-new-requests": PauseNewRequestsEvent;
}

interface RequestControllerFacade extends EventTarget<RequestControllerEventMap> {
	pause(id: MockRequest["id"]): void;
	resume(id: MockRequest["id"]): void;
}

type MockFetchDebuggerEventType = keyof MockFetchDebuggerEventMap;
interface MockFetchDebuggerEventMap {
	"request-pause": CustomEvent<{ requestId: MockRequest["id"] }, "request-pause">;
	"request-resume": CustomEvent<{ requestId: MockRequest["id"] }, "request-resume">;
	"request-new-request-paused": CustomEvent<{ value: boolean }, "request-new-request-paused">;
}

type MockFetchDebuggerEventTarget = EventTarget<MockFetchDebuggerEventMap & HTMLElementEventMap>;

// #region Generic EventTarget types
class Event<EventType = string> {
	constructor(type: EventType, init?: EventInit);
	/**
	 * Returns the type of event, e.g. "click", "hashchange", or "submit".
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/type)
	 */
	readonly type: EventType;
	/**
	 * Returns the event's phase, which is one of NONE, CAPTURING_PHASE, AT_TARGET, and BUBBLING_PHASE.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/eventPhase)
	 */
	readonly eventPhase: number;
	/**
	 * Returns true or false depending on how event was initialized. True if event invokes listeners past a ShadowRoot node that is the root of its target, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/composed)
	 */
	readonly composed: boolean;
	/**
	 * Returns true or false depending on how event was initialized. True if event goes through its target's ancestors in reverse tree order, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/bubbles)
	 */
	readonly bubbles: boolean;
	/**
	 * Returns true or false depending on how event was initialized. Its return value does not always carry meaning, but true can indicate that part of the operation during which event was dispatched, can be canceled by invoking the preventDefault() method.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/cancelable)
	 */
	readonly cancelable: boolean;
	/**
	 * Returns true if preventDefault() was invoked successfully to indicate cancelation, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/defaultPrevented)
	 */
	readonly defaultPrevented: boolean;
	/**
	 * @deprecated
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/returnValue)
	 */
	readonly returnValue: boolean;
	/**
	 * Returns the object whose event listener's callback is currently being invoked.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/currentTarget)
	 */
	readonly currentTarget?: EventTarget;
	/**
	 * @deprecated
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/srcElement)
	 */
	readonly srcElement?: EventTarget;
	/**
	 * Returns the event's timestamp as the number of milliseconds measured relative to the time origin.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/timeStamp)
	 */
	readonly timeStamp: number;
	/**
	 * Returns true if event was dispatched by the user agent, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/isTrusted)
	 */
	readonly isTrusted: boolean;
	/**
	 * @deprecated
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/cancelBubble)
	 */
	cancelBubble: boolean;
	/**
	 * Invoking this method prevents event from reaching any registered event listeners after the current one finishes running and, when dispatched in a tree, also prevents event from reaching any other objects.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/stopImmediatePropagation)
	 */
	stopImmediatePropagation(): void;
	/**
	 * If invoked when the cancelable attribute value is true, and while executing a listener for the event with passive set to false, signals to the operation that caused event to be dispatched that it needs to be canceled.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/preventDefault)
	 */
	preventDefault(): void;
	/**
	 * When dispatched in a tree, invoking this method prevents event from reaching any objects other than the current object.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/stopPropagation)
	 */
	stopPropagation(): void;
	/**
	 * Returns the invocation target objects of event's path (objects on which listeners will be invoked), except for any nodes in shadow trees of which the shadow root's mode is "closed" that are not reachable from event's currentTarget.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Event/composedPath)
	 */
	composedPath(): EventTarget[];
	static readonly NONE: number;
	static readonly CAPTURING_PHASE: number;
	static readonly AT_TARGET: number;
	static readonly BUBBLING_PHASE: number;
}

class CustomEvent<Detail = any, EventType = string> extends Event<EventType> {
	constructor(type: EventType, eventInitDict?: CustomEventInit<Detail>);
	/**
	 * Returns any custom data event was created with. Typically used for synthetic events.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)
	 */
	readonly detail: Detail;
}

type EventListener<EventType extends Event = Event> = (event: EventType) => void;
interface EventListenerObject<EventType extends Event = Event> {
	handleEvent(event: EventType): void;
}
type EventListenerOrEventListenerObject<EventType extends Event = Event> = EventListener<EventType> | EventListenerObject<EventType>;

// class EventTarget<EventMap extends Record<string, Event> = Record<string, Event>> {
class EventTarget<EventMap = Record<string, Event>> {
	constructor();
	/**
	 * Appends an event listener for events whose type attribute value is type. The callback argument sets the callback that will be invoked when the event is dispatched.
	 *
	 * The options argument sets listener-specific options. For compatibility this can be a boolean, in which case the method behaves exactly as if the value was specified as options's capture.
	 *
	 * When set to true, options's capture prevents callback from being invoked when the event's eventPhase attribute value is BUBBLING_PHASE. When false (or not present), callback will not be invoked when event's eventPhase attribute value is CAPTURING_PHASE. Either way, callback will be invoked if event's eventPhase attribute value is AT_TARGET.
	 *
	 * When set to true, options's passive indicates that the callback will not cancel the event by invoking preventDefault(). This is used to enable performance optimizations described in § 2.8 Observing event listeners.
	 *
	 * When set to true, options's once indicates that the callback will only be invoked once after which the event listener will be removed.
	 *
	 * If an AbortSignal is passed for options's signal, then the event listener will be removed when signal is aborted.
	 *
	 * The event listener is appended to target's event listener list and is not appended if it has the same type, callback, and capture.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener)
	 */
	addEventListener<Type extends keyof EventMap>(
		type: Type,
		handler: EventListenerOrEventListenerObject<EventMap[Type]>,
		options?: EventTargetAddEventListenerOptions | boolean,
	): void;
	/**
	 * Removes the event listener in target's event listener list with the same type, callback, and options.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener)
	 */
	removeEventListener<Type extends keyof EventMap>(
		type: Type,
		handler: EventListenerOrEventListenerObject<EventMap[Type]>,
		options?: EventTargetEventListenerOptions | boolean,
	): void;
	/**
	 * Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/dispatchEvent)
	 */
	dispatchEvent(event: EventMap[keyof EventMap]): boolean;
}
interface EventTargetEventListenerOptions {
	capture?: boolean;
}
interface EventTargetAddEventListenerOptions {
	capture?: boolean;
	passive?: boolean;
	once?: boolean;
	signal?: AbortSignal;
}
interface EventTargetHandlerObject {
	handleEvent: (event: Event) => any | undefined;
}

//#endregion
