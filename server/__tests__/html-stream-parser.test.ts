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

	interface TestCase {
		title: string;
		html: string;
		openingTags: string[];
		closingTags: string[];
	}

	function runtTest({ html, openingTags, closingTags }: TestCase) {
		const parseChunk = createParser(handleOpenTag, handleCloseTag);
		parseChunk(Buffer.from(html));

		expect(opened).toEqual(openingTags);
		expect(closed).toEqual(closingTags);
	}

	beforeEach(() => {
		opened.length = 0;
		closed.length = 0;
	});

	[
		{
			title: "should parse basic HTML",
			html: "<html><body><div>Test</div></body></html>",
			openingTags: ["html", "body", "div"],
			closingTags: ["div", "body", "html"],
		},
		{
			title: "should handle self-closing tags",
			html: '<html><body><img src="test.jpg" /></body></html>',
			openingTags: ["html", "body", "img"],
			closingTags: ["img", "body", "html"],
		},
		{
			title: "should handle self closing body",
			html: "<html><body /></html>",
			openingTags: ["html", "body"],
			closingTags: ["body", "html"],
		},
		{
			title: "should handle void tags",
			html: "<html><head><meta><link></head><body><br></body></html>",
			openingTags: ["html", "head", "meta", "link", "body", "br"],
			closingTags: ["meta", "link", "head", "br", "body", "html"],
		},
		{
			title: "should handle tags with attributes and whitespace",
			html: `
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
				</html>`,
			openingTags: ["html", "head", "meta", "link", "body", "div", "script"],
			closingTags: ["meta", "link", "head", "div", "script", "body", "html"],
		},
		{
			title: "should handle not quoted attributes",
			html: `
				<html lang=en>
					<body>
						<div class=test>Test</div>
						<script type=text/javascript></script>
						<span =text/javascript></span>
						<b><br text/javascript /></b>
						<p><meta text/>javascript/></p>
					</body>
				</html>`,
			openingTags: ["html", "body", "div", "script", "span", "b", "br", "p", "meta"],
			closingTags: ["div", "script", "span", "br", "b", "meta", "p", "body", "html"],
		},
		{
			title: "should handle comments",
			html: `
				<html>
					<div><!-- > Test </--></div>
					<p><!--></p>
					<?>
					<img src="test.jpg">
					<?php echo 'Hello, World!'; ?>
				</html>`,
			openingTags: ["html", "div", "p", "img"],
			closingTags: ["div", "p", "img", "html"],
		},
		{
			title: "should handle CDATA",
			html: `
				<html>
					<script>
						<![CDATA[
							console.log('Hello, World!');
						]]>
					</script>
				</html>`,
			openingTags: ["html", "script"],
			closingTags: ["script", "html"],
		},
		{
			title: "should handle script and style tags with complex content",
			html: `
				<html>
					<script>
						console.log("</html>");
					</script>
					<head>
						<style>
							.test {
								color: red;
							}
							/** </head> **/
						</style>
					</head>
				</html>`,
			openingTags: ["html", "script", "head", "style"],
			closingTags: ["script", "style", "head", "html"],
		},
		{
			title: "should handle doctype",
			html: `
				<!DoCtYpE html>
				<html>
					<body>
						<div>Test</div>
					</body>
				</html>`,
			openingTags: ["html", "body", "div"],
			closingTags: ["div", "body", "html"],
		},
	].map((testCase) => {
		it(testCase.title, () => {
			runtTest(testCase);
		});
	});
});
