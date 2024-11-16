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
import type { TransformCallback } from "node:stream";
import { Transform } from "node:stream";

/** @import { TransformCallback } from "node:stream"; */

// The parser states
const TEXT = 0; // Parsing text
const BEFORE_TAG_NAME = 1; // Parsing before a tag name
const IN_TAG_NAME = 2; // Parsing a tag name
const IN_SELF_CLOSING_TAG = 3; // Parsing a self-closing tag
const IN_TAG = 4; // Parsing a tag

const BEFORE_CLOSING_TAG_NAME = 5; // Parsing before a closing tag name
const IN_CLOSING_TAG_NAME = 6; // Parsing a closing tag name
const AFTER_CLOSING_TAG_NAME = 7; // Parsing after a closing tag name

// Special characters
const START_NODE = 0x3c; // <
const CLOSE_NODE = 0x3e; // >
const SLASH = 0x2f; // /

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

// Test cases:
// self closing tag <meta />
// void tags <img> <br> <hr>
// <body />
// <body></body>

type ParseChunk = (chunk: Buffer) => number;

export function createParser(handleOpenTag: (name: string) => boolean, handleCloseTag: (name: string) => boolean): ParseChunk {
	let state: number = TEXT;
	let name: string = "";

	return function parseChunk(chunk: Buffer) {
		let shouldPause = false;
		let i = 0;
		let char = 0;

		while (i < chunk.length) {
			char = chunk[i];

			switch (state) {
				case TEXT:
					// Fast forward to the next tag
					while (char !== START_NODE) {
						char = chunk[++i];
					}

					state = BEFORE_TAG_NAME;
					break;
				case BEFORE_TAG_NAME:
					if (isWhitespace(char)) {
						state = TEXT; // < name> // INVALID HTML5
					} else if (char === CLOSE_NODE) {
						state = TEXT; // <  > ???? // INVALID HTML5
					} else if (char === SLASH) {
						state = BEFORE_CLOSING_TAG_NAME; // </name>
					} else {
						state = IN_TAG_NAME; // <name>
						name = String.fromCharCode(char);
					}
					break;
				case IN_TAG_NAME:
					if (isWhitespace(char)) {
						state = IN_TAG; // <name   > || <name>

						shouldPause = handleOpenTag(name);
					} else if (char === CLOSE_NODE) {
						state = TEXT; // <name>

						shouldPause = handleOpenTag(name);
						if (isVoidElement(name)) {
							shouldPause = handleCloseTag(name);
						}
					} else if (char === SLASH) {
						state = IN_SELF_CLOSING_TAG; // <name/>

						shouldPause = handleOpenTag(name);
					} else {
						name += String.fromCharCode(char);
					}
					break;
				case IN_TAG:
					// Fast forward through all attributes
					while (char !== CLOSE_NODE && char !== SLASH && i < chunk.length) {
						char = chunk[++i];
					}

					if (char === CLOSE_NODE) {
						state = TEXT; // <name **>

						if (isVoidElement(name)) {
							shouldPause = handleCloseTag(name);
						}
					} else if (char === SLASH) {
						state = IN_SELF_CLOSING_TAG; // <name **/>
					}
					break;
				case BEFORE_CLOSING_TAG_NAME:
					if (char === CLOSE_NODE) {
						state = TEXT; // </   >  INVALID HTML5

						shouldPause = handleCloseTag(name);
						name = "";
					} else if (!isWhitespace(char)) {
						state = IN_CLOSING_TAG_NAME; // </name>
						name = String.fromCharCode(char);
					}
					break;
				case IN_CLOSING_TAG_NAME:
					if (isWhitespace(char)) {
						state = AFTER_CLOSING_TAG_NAME; // </name   >
					} else if (char === CLOSE_NODE) {
						state = TEXT; // </name>

						shouldPause = handleCloseTag(name);
						name = "";
					} else {
						name += String.fromCharCode(char); // </name
					}
					break;
				case AFTER_CLOSING_TAG_NAME:
					if (char === CLOSE_NODE) {
						state = TEXT; // </name   >

						shouldPause = handleCloseTag(name);
						name = "";
					}
					break;
				case IN_SELF_CLOSING_TAG:
					if (char === CLOSE_NODE) {
						state = TEXT; // <name/>

						shouldPause = handleCloseTag(name);
						name = "";
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

const EMPTY_BUFFER = Buffer.alloc(0);

// The parser class
export class HtmlStreamParser extends Transform {
	private bodyDepth = -1;

	private remaining: Buffer = EMPTY_BUFFER;

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

	// The _transform function is called by the stream whenever there is new data
	// to process. We process the data and emit events whenever we detect a state
	// change that is relevant to our use case.
	_transform(chunk: any, _: BufferEncoding, callback: TransformCallback) {
		if (this.remaining?.length > 0) {
			chunk = Buffer.concat([this.remaining, chunk]);
			this.remaining = EMPTY_BUFFER;
		}

		const lastIndex = this.parseChunk(chunk);

		if (lastIndex < chunk.length) {
			const parsed = chunk.subarray(0, lastIndex);
			this.remaining = chunk.subarray(lastIndex);
			this.push(parsed);

			// TODO: Queue up another flush? to not wait for more data?
		} else {
			this.push(chunk);
		}

		callback();
	}
}
