interface Environment {
	ASSETS: {
		fetch: typeof fetch;
	};
	REQUEST_CONTROLLER: DurableObjectNamespace<import("./RequestController.js").RequestController>;
}

declare var window: undefined;
