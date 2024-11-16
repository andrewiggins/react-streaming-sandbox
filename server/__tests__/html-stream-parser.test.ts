import { describe, it, beforeEach } from "node:test";
import { expect } from "./expect.ts";
import { createParser } from "../html-stream-parser.ts";

describe("createParser", () => {
	const opened: string[] = [];
	function handleOpenTag(name: string) {
		opened.push(name);
		return false;
	}

	const closed: string[] = [];
	function handleCloseTag(name: string) {
		closed.push(name);
		return false;
	}

	beforeEach(() => {
		opened.length = 0;
		closed.length = 0;
	});

	it("should parse basic HTML", () => {
		const parseChunk = createParser(handleOpenTag, handleCloseTag);
		const html = "<html><body><div>Test</div></body></html>";
		parseChunk(Buffer.from(html));

		expect(opened).toEqual(["html", "body", "div"]);
		expect(closed).toEqual(["div", "body", "html"]);
	});

	it("should handle self-closing tags", () => {
		const parseChunk = createParser(handleOpenTag, handleCloseTag);
		const html = '<html><body><img src="test.jpg" /></body></html>';
		parseChunk(Buffer.from(html));

		expect(opened).toEqual(["html", "body", "img"]);
		expect(closed).toEqual(["img", "body", "html"]);
	});

	it("should handle void tags", () => {
		const parseChunk = createParser(handleOpenTag, handleCloseTag);
		const html = "<html><head><meta><link></head><body><br></body></html>";
		parseChunk(Buffer.from(html));

		expect(opened).toEqual(["html", "head", "meta", "link", "body", "br"]);
		expect(closed).toEqual(["meta", "link", "head", "br", "body", "html"]);
	});

	it("should handle tags with attributes and whitespace", () => {
		const parseChunk = createParser(handleOpenTag, handleCloseTag);
		const html = `
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <link rel='stylesheet' href='/stylesheet'>
        </head>
        <body>
          <div class="test">
            Test
          </div>
          <script type="text/javascript">
            console.log('Hello, World!');
          </script>
        </body>
      </html>`;

		parseChunk(Buffer.from(html));

		expect(opened).toEqual(["html", "head", "meta", "link", "body", "div", "script"]);
		expect(closed).toEqual(["meta", "link", "head", "div", "script", "body", "html"]);
	});
});
