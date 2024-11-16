import * as assert from "assert";

// A simple wrapper around assert that mimics the behavior of expect in Jest
export function expect(actual: any) {
	return {
		toEqual(expected: any) {
			assert.deepStrictEqual(actual, expected);
		},
	};
}
