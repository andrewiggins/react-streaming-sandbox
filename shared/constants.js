export const RCIDName = "rcId";

const proto = /** @type {any} */ (CustomEvent.prototype);
proto.toJSON = function () {
	return {
		type: this.type,
		detail: this.detail,
	};
};
