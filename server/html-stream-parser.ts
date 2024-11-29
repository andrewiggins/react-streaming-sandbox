// This file contains a specialized HTML streaming parser that is used to
// determine whenever we are in a position that is a direct child of a <body>
// tag. Knowing this is important because we can know it is safe to inject
// scripts or other content into the HTML stream without breaking the page. This
// is used in the HTML injection code in the server.js file. The parser is
// implemented as a state machine that is driven by the incoming data stream.
// The parser is implemented as a Transform stream that takes input data and
// emits events when it detects the state changes that are relevant to our use
// case. We don't decode the HTML stream, we just look for the relevant tags
// and keep track of the nesting level of the tags we are interested in.
//
// Based on html5parser, MIT LICENSE
//  Source: https://github.com/acrazing/html5parser/blob/cc95ffc4b50d99e64a477eb34934113f2d0ca3c4/src/tokenize.ts
// LICENSE: https://github.com/acrazing/html5parser/blob/cc95ffc4b50d99e64a477eb34934113f2d0ca3c4/LICENSE
//
// And based on htmlparser2, MIT LICENSE
//  Source: https://github.com/fb55/htmlparser2/blob/9507bde129b9dbc95e6dfd78b1986ac5a6f1515d/src/Tokenizer.ts
// LICENSE: https://github.com/fb55/htmlparser2/blob/9507bde129b9dbc95e6dfd78b1986ac5a6f1515d/LICENSE

import type { TransformCallback } from "node:stream";
import { Transform } from "node:stream";

/** @import { TransformCallback } from "node:stream"; */

// The parser states
const TEXT = 0;
const BEFORE_OPEN_TAG = 1;
const OPENING_TAG = 2;
const BEFORE_ATTRIBUTE_NAME = 3;
const IN_ATTRIBUTE_NAME = 4;
const BEFORE_ATTRIBUTE_VALUE = 5;
const IN_VALUE_NO_QUOTES = 6;
const IN_VALUE_SINGLE_QUOTES = 7;
const IN_VALUE_DOUBLE_QUOTES = 8;
const CLOSING_OPEN_TAG = 9;
const OPENING_SPECIAL = 10;
const OPENING_DOCTYPE = 11;
const OPENING_NORMAL_COMMENT = 12;
const NORMAL_COMMENT_START = 13;
const IN_NORMAL_COMMENT = 14;
const IN_SHORT_COMMENT = 15;
const CLOSING_NORMAL_COMMENT = 16;
const CLOSING_NORMAL_COMMENT_2 = 17;
const CLOSING_TAG = 18;

// Special characters
const EXCLAMATION = 33; // !
const DASH = 45; // -
const SLASH = 47; // /
/** > greater than */
const CLOSE_NODE = 62; // >
/** < Less than */
const START_NODE = 60; // <
const QUESTION = 63; // ?
const SINGLE_QUOTE = 39; // '
const DOUBLE_QUOTE = 34; // "
const EQUAL = 61; // =
const CAPITAL_A = 65; // A
const CAPITAL_D = 68; // D
const CAPITAL_Z = 90; // Z
const LOWERCASE_A = 97; // a
const LOWERCASE_D = 100; // d
const LOWERCASE_Z = 122; // z

const isWhitespace = (c: number) =>
	c === 9 || // Tab '\t'
	c === 10 || // New line '\n'
	c === 11 || // Vertical tab '\v'
	c === 12 || // Form feed '\f'
	c === 13 || // Carriage return '\r'
	c === 32; // Space ' '

function isVoidElement(name: string): boolean {
	return (
		name === "area" ||
		name === "base" ||
		name === "br" ||
		name === "col" ||
		name === "command" ||
		name === "embed" ||
		name === "hr" ||
		name === "img" ||
		name === "input" ||
		name === "keygen" ||
		name === "link" ||
		name === "meta" ||
		name === "param" ||
		name === "source" ||
		name === "track" ||
		name === "wbr"
	);
}

function isASCIIAlpha(c: number) {
	return (c >= CAPITAL_A && c <= CAPITAL_Z) || (c >= LOWERCASE_A && c <= LOWERCASE_Z);
}

type ParseChunk = (chunk: Buffer) => number;

export function createParser(handleOpenTag?: (name: string) => boolean, handleCloseTag?: (name: string) => boolean): ParseChunk {
	let state: number = TEXT;
	let name: string = "";
	/**
	 * Any parent tag that puts the parser into "CDATA" mode, meaning that the
	 * parser will treat all contents as text until an exact matching closing tag
	 * is found
	 */
	let parentCdataTag: string | null = null;

	function emitOpenTag(name: string, isSelfClosing: boolean) {
		let shouldPause = handleOpenTag?.(name) ?? false;
		if (name === "script" || name === "style" || name === "textarea") {
			parentCdataTag = name;
		}

		if (isSelfClosing || isVoidElement(name)) {
			shouldPause ||= handleCloseTag?.(name) ?? false;
			parentCdataTag = null;
		}

		return shouldPause;
	}

	return function parseChunk(chunk: Buffer): number {
		let shouldPause = false;
		let i = 0;
		let char = 0;
		let chunkLength = chunk.length;

		while (i < chunkLength) {
			char = chunk[i];

			switch (state) {
				case TEXT:
					if (char === START_NODE) {
						state = BEFORE_OPEN_TAG;
					}
					break;
				case BEFORE_OPEN_TAG:
					if (parentCdataTag) {
						if (char === SLASH) {
							state = CLOSING_TAG; // </ - Possible closing tag for the script or style tag
							name = "";
						} else {
							state = TEXT; // < - Not a closing tag, go back to text
						}
					} else if (isASCIIAlpha(char)) {
						// Only A-Z and a-z are valid start to tag names in HTML5
						name = String.fromCharCode(char | 0x20); // Lowercase
						state = OPENING_TAG; // <name
					} else if (char === SLASH) {
						state = CLOSING_TAG; // </name
						name = "";
					} else if (char === START_NODE) {
						state = BEFORE_OPEN_TAG; // << - Treat the first '<' as text
					} else if (char === EXCLAMATION) {
						state = OPENING_SPECIAL; // <! - Special tag
					} else if (char === QUESTION) {
						state = IN_SHORT_COMMENT; // <? - Short comment
					} else {
						state = TEXT; // <>
					}
					break;
				case OPENING_TAG:
					if (char === CLOSE_NODE) {
						state = TEXT; // <name>

						shouldPause = emitOpenTag(name, false);
						name = "";
					} else if (char === SLASH) {
						state = CLOSING_OPEN_TAG; // <name/
					} else if (isWhitespace(char)) {
						state = BEFORE_ATTRIBUTE_NAME; // <name   >
					} else {
						name += String.fromCharCode(char | 0x20); // Lowercase
					}
					break;
				case BEFORE_ATTRIBUTE_NAME:
					if (char === CLOSE_NODE) {
						state = TEXT; // <name   >

						shouldPause = emitOpenTag(name, false);
						name = "";
					} else if (char === SLASH) {
						state = CLOSING_OPEN_TAG; // <name   /
					} else if (isWhitespace(char)) {
						// Do nothing and skip whitespace
					} else {
						state = IN_ATTRIBUTE_NAME; // <name xxx
					}
					break;
				case IN_ATTRIBUTE_NAME:
					if (char === CLOSE_NODE) {
						state = TEXT; // <name xxx>

						shouldPause = emitOpenTag(name, false);
						name = "";
					} else if (char === SLASH) {
						state = CLOSING_OPEN_TAG; // <name xxx/
					} else if (isWhitespace(char)) {
						state = BEFORE_ATTRIBUTE_NAME; // <name xxx ...
					} else if (char === EQUAL) {
						state = BEFORE_ATTRIBUTE_VALUE; // <name xxx=
					}
					break;
				case BEFORE_ATTRIBUTE_VALUE:
					if (char === SINGLE_QUOTE) {
						state = IN_VALUE_SINGLE_QUOTES;
					} else if (char === DOUBLE_QUOTE) {
						state = IN_VALUE_DOUBLE_QUOTES;
					} else if (!isWhitespace(char)) {
						i--; // Re-process the character
						state = IN_VALUE_NO_QUOTES;
					}
					break;
				case IN_VALUE_NO_QUOTES:
					if (char === CLOSE_NODE) {
						state = TEXT; // <div xxx>

						shouldPause = emitOpenTag(name, false);
						name = "";
					} else if (char === SLASH) {
						state = CLOSING_OPEN_TAG; // <div xxx/
					} else if (isWhitespace(char)) {
						state = BEFORE_ATTRIBUTE_NAME; // <div xxx=xxx ...
					}
					break;
				case IN_VALUE_SINGLE_QUOTES:
					if (char === SINGLE_QUOTE) {
						state = BEFORE_ATTRIBUTE_NAME; // <div xxx='yyy'>
					}
					break;
				case IN_VALUE_DOUBLE_QUOTES:
					if (char === DOUBLE_QUOTE) {
						state = BEFORE_ATTRIBUTE_NAME; // <div xxx="yyy">
					}
					break;
				case CLOSING_OPEN_TAG:
					if (char === CLOSE_NODE) {
						state = TEXT; // <name />

						shouldPause = emitOpenTag(name, true);
						name = "";
					} else {
						state = BEFORE_ATTRIBUTE_NAME; // <name /...>
						i--; // Re-process the character
					}
					break;
				case OPENING_SPECIAL:
					if (char === DASH) {
						state = OPENING_NORMAL_COMMENT; // <!-
					} else if (char === CAPITAL_D || char === LOWERCASE_D) {
						state = OPENING_DOCTYPE; // <!D
						name = String.fromCharCode(char | 0x20); // Lowercase
					} else {
						state = IN_SHORT_COMMENT; // <!...
					}
					break;
				case OPENING_DOCTYPE:
					if (isWhitespace(char)) {
						if (name === "doctype") {
							state = BEFORE_ATTRIBUTE_NAME; // <!DOCTYPE ...
						} else {
							state = IN_SHORT_COMMENT; // <!DOCXX...
						}
						// Validate the doctype and go to after open tag
						// otherwise, ???
					} else if (CLOSE_NODE) {
						state = TEXT; // <!DOCTYPE> or <!DOCT>
					} else {
						name += String.fromCharCode(char | 0x20); // Lowercase
					}
					break;
				case OPENING_NORMAL_COMMENT:
					if (char === DASH) {
						state = NORMAL_COMMENT_START; // <!--
					} else {
						state = IN_SHORT_COMMENT; // <!-
					}
					break;
				case NORMAL_COMMENT_START:
					if (char === CLOSE_NODE) {
						state = TEXT; // <!-->
					} else if (char === DASH) {
						state = NORMAL_COMMENT_START; // <!--- ...
					} else {
						state = IN_NORMAL_COMMENT; // <!-- -
					}
					break;
				case IN_NORMAL_COMMENT:
					if (char === DASH) {
						state = CLOSING_NORMAL_COMMENT; // <!-- ... -
					}
					break;
				case IN_SHORT_COMMENT:
					if (char === CLOSE_NODE) {
						state = TEXT; // <? ... >
					}
					break;
				case CLOSING_NORMAL_COMMENT:
					if (char === DASH) {
						state = CLOSING_NORMAL_COMMENT_2; // <!-- ... --
					} else {
						state = IN_NORMAL_COMMENT; // <!-- ... - ...
					}
					break;
				case CLOSING_NORMAL_COMMENT_2:
					if (char === DASH) {
						state = CLOSING_NORMAL_COMMENT_2; // <!-- ... ----
					} else if (char === CLOSE_NODE) {
						state = TEXT; // <!-- ... -->
					} else {
						state = IN_NORMAL_COMMENT; // <!-- ... --x
					}
					break;
				case CLOSING_TAG:
					if (parentCdataTag) {
						if (char === START_NODE) {
							state = BEFORE_OPEN_TAG; // </< - First `</` wasn't a closing tag, but this next `<` could be
						} else if (char === CLOSE_NODE) {
							// Check if the closing tag is for the script or style tag
							if (name === parentCdataTag) {
								state = TEXT; // </script>

								shouldPause = handleCloseTag?.(name) ?? false;
								name = "";
								parentCdataTag = null;
							} else {
								state = TEXT; // </name> but not for the script or style tag
							}
						} else if (isASCIIAlpha(char)) {
							name += String.fromCharCode(char | 0x20); // Lowercase
						} else {
							state = TEXT; // </scrXXX or </styXXX
						}
					} else if (char === CLOSE_NODE) {
						state = TEXT; // </name>

						shouldPause = handleCloseTag?.(name) ?? false;
						name = "";
					} else {
						name += String.fromCharCode(char | 0x20); // Lowercase
					}
					break;
				default:
					throw new Error(`Invalid state: ${state}`);
			}

			i++;

			if (shouldPause) {
				break;
			}
		}

		return i;
	};
}

// The parser class
export class HtmlStreamParser extends Transform {
	private bodyDepth = -1;

	private pendingChunk: Buffer | null = null;

	private parseChunk: ParseChunk;

	public isDirectChildOfBody = false;

	constructor() {
		super();
		this.parseChunk = createParser(this.handleOpenTag, this.handleCloseTag);
	}

	handleOpenTag = (name: string) => {
		if (name === "body") {
			this.bodyDepth = 0;
			this.isDirectChildOfBody = true;
		} else if (this.bodyDepth >= 0) {
			this.bodyDepth++;
			this.isDirectChildOfBody = false;
		}

		return this.isDirectChildOfBody;
	};

	handleCloseTag = (name: string) => {
		if (name === "body") {
			this.bodyDepth = -1;
			this.isDirectChildOfBody = false;
		} else if (this.bodyDepth >= 0) {
			this.bodyDepth--;
			this.isDirectChildOfBody = this.bodyDepth === 0;
		}

		return this.isDirectChildOfBody;
	};

	processPendingChunk() {
		if (this.pendingChunk == null) {
			return;
		}

		const pendingChunk = this.pendingChunk;
		this.pendingChunk = null;

		const lastIndex = this.parseChunk(pendingChunk);

		if (lastIndex < pendingChunk.length) {
			const parsed = pendingChunk.subarray(0, lastIndex);
			this.pendingChunk = pendingChunk.subarray(lastIndex);
			this.push(parsed);

			process.nextTick(() => this.processPendingChunk());
		} else {
			this.push(pendingChunk);
		}
	}

	// The _transform function is called by the stream whenever there is new data
	// to process. We process the data and emit events whenever we detect a state
	// change that is relevant to our use case.
	_transform(chunk: any, _: BufferEncoding, callback: TransformCallback) {
		if (this.pendingChunk == null) {
			this.pendingChunk = chunk;
		} else {
			this.pendingChunk = Buffer.concat([this.pendingChunk, chunk]);
		}

		this.processPendingChunk();
		callback();
	}
}
