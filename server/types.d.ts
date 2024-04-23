interface Environment {
	ASSETS: {
		fetch: typeof fetch;
	};
}

declare var window: Window | undefined;
