import { describe, it, beforeEach } from "node:test";
import { PassThrough, Writable } from "node:stream";
import { expect } from "./expect.ts";
import { createInsertIntoBodyStream, createParser, HTMLStreamingParser } from "../html-stream-parser.ts";

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

	const tests = [
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
						console.log('<strong>Hello, World!</strong>');
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
		{
			title: "real world example 1",
			html: `
			<!DOCTYPE html>
			<html>
				<head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# githubog: http://ogp.me/ns/fb/githubog#">
					<meta charset='utf-8'>
					<meta http-equiv="X-UA-Compatible" content="IE=edge">
							<title>The Revolution Will Be Forked · GitHub</title>
					<link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="GitHub" />
					<link rel="fluid-icon" href="https://github.com/fluidicon.png" title="GitHub" />
				</head>
			</html>`,
			openingTags: ["html", "head", "meta", "meta", "title", "link", "link"],
			closingTags: ["meta", "meta", "title", "link", "link", "head", "html"],
		},
		{
			title: "script tags with unquoted src attributes",
			html: `
				<ul class="companion" id="on-air-links">
						<li class="listen"><a class="btn-news" href="/streaming-upr-live" target="_blank">UPR NEWS</a></li>
						<li class="now-playing"><span class="label">On Air Now:</span><SCRIPT LANGUAGE="JavaScript" SRC=http://www.publicbroadcasting.net/upr/guide.guidenocode?fetch=1,0,0,1,0,0></SCRIPT></li>
						<li class="listen"><a class="btn-music" href="/streaming-upr-too" target="_blank">UPR Too</a></li>
						<li class="now-playing"><span class="label">On Air Now:</span><SCRIPT LANGUAGE="JavaScript" SRC=http://www.publicbroadcasting.net/upr-hd2/guide.guidenocode?fetch=1,0,0,1,0,0></script>
				</li>
					</ul>`,
			openingTags: ["ul", "li", "a", "li", "span", "script", "li", "a", "li", "span", "script"],
			closingTags: ["a", "li", "span", "script", "li", "a", "li", "span", "script", "li", "ul"],
		},
		{
			title: "cursed CDATA comments",
			html: `
				<script type="text/javascript" src="http://www.upr.org/sites/all/modules/contrib/disqus/disqus.js?mnyaav"></script>
				<script type="text/javascript">
				<!--//--><![CDATA[//><!--
				var disqus_shortname = 'upr';
				//--><!]]>
				</script>
				<script type="text/javascript">
				<!--//--><![CDATA[//><!--
				console.log('Hello, World!');
				//--><!]]>
				</script>
				<script type="text/javascript" src="http://s7.addthis.com/js/250/addthis_widget.js#pubid=ra-4e09f49f6fe84d1e"></script>
				<script type="text/javascript" src="http://platform.twitter.com/widgets.js"></script>
				<script type="text/javascript">
				<!--//--><![CDATA[//><!--
				var _gaq = _gaq || [];
				//--><!]]>
				</script>
				<script type="text/javascript">
				<!--//--><![CDATA[//><!--
				console.log('Hello, World!');
				//--><!]]>
				</script>`,
			openingTags: ["script", "script", "script", "script", "script", "script", "script"],
			closingTags: ["script", "script", "script", "script", "script", "script", "script"],
		},
		{
			title: "does not parse the contents of a <textarea> tag",
			html: `
				<textarea>
					<div>Test</div>
				</textarea>`,
			openingTags: ["textarea"],
			closingTags: ["textarea"],
		},
		{
			title: "Improperly spaced attributes",
			html: `
			<div id="tr-elektron">
			<div class="tr-header1"><a href="URL" onclick="dcsMultiTrack('a','b','c.d','/','WT.ti','Offsite: e.com','WT.dl','24','WT.z_offsite','http://www.test.com/');"OnClick="dcsMultiTrack('DCS.dcssip','test.com','DCS.dcsuri','/','WT.ti','Offsite: test.com','WT.dl','24','WT.z_offsite','test');"></a></div>
			<div class="tr-descr">An ultra-low latency infrastructure for electronic trading and data distribution</div>
			</div>`,
			openingTags: ["div", "div", "a", "div"],
			closingTags: ["a", "div", "div", "div"],
		},
		{
			title: "Incomplete attributes",
			html: `
				<div class="HTlogo HTSectionName"><span id="ctl00_lblsectionname"><a href=>news</a></span></div>
				<div class="TopMenuTab"><div " " id="submenu_7"style="position:absolute;z-index:20;display:none;" class="menuover"></div></div>`,
			openingTags: ["div", "span", "a", "div", "div"],
			closingTags: ["a", "span", "div", "div", "div"],
		},
		{
			title: "Improper attributes",
			html: `
			<ul>
				<li>
					<a
						class="mostreadheadings"
						onclick="javascript:htTracker._trackEvent('MostRead', 'Stories', 'http://test.com');"
						href='http://test.com' + ""
					>
						Article Title
					</a>
					<img src="http://i.telegraph.co.uk/multimedia/archive/02621/mars_2621828b.jpg" width="620" height="387" alt="Mars' atmosphere destroyed by "catastrophic" event four billion years ago "/>
				</li>
			</ul>`,
			openingTags: ["ul", "li", "a", "img"],
			closingTags: ["a", "img", "li", "ul"],
		},
		{
			title: "Double quoted attributes can contain special characters",
			html: `<div class="<span a=a b='c'></span>"></div>`,
			openingTags: ["div"],
			closingTags: ["div"],
		},
		{
			title: "Single quoted attributes can contain special characters",
			html: `<div class='<span a=a b="c"></span>'></div>`,
			openingTags: ["div"],
			closingTags: ["div"],
		},
		{
			title: "Unquoted quoted attributes can contain the equals and quotes character",
			html: `<div a=b="c><span></span></div>`,
			openingTags: ["div", "span"],
			closingTags: ["span", "div"],
		},
	].map((testCase) => {
		// it(testCase.title, () => {
		// 	runtTest(testCase);
		// });
	});
});

describe("HTMLStreamingParser", () => {
	interface ActionStep {
		action(): Promise<void>;
	}
	interface ChunkStep {
		input: string[];
		output: string[];
	}
	type Step = ChunkStep | ActionStep;
	interface TestCase {
		title: string;
		steps: Step[];
	}

	class ChunkCollector extends Writable {
		chunks: string[] = [];
		_write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
			this.chunks.push(chunk.toString());
			callback();
		}
	}

	const removeWhitespace = (s: string) => s.replace(/\s+/g, "");

	function assertOutputChunks(collector: ChunkCollector, expectedOutput: string[]) {
		const actualOutput = collector.chunks;
		collector.chunks = [];
		expect(actualOutput.map(removeWhitespace)).toEqual(expectedOutput.map(removeWhitespace));
	}

	async function runTest({ steps }: TestCase) {
		const parser = createInsertIntoBodyStream();
		const collector = new ChunkCollector();
		parser.pipe(collector);

		for (const step of steps) {
			if ("action" in step) {
				await step.action();
				continue;
			}

			const { input, output } = step;
			if (input) {
				for (const chunk of input) {
					parser.write(chunk);
				}
			}

			assertOutputChunks(collector, output);

			await new Promise((r) => setTimeout(r));
		}
	}

	[
		{
			title: "(single chunk) splits html while in body",
			steps: [
				{ input: [`<html><body></body></html>`], output: ["<html><body>"] },
				{ input: [], output: ["</body></html>"] },
			],
		},
		{
			title: "(single chunk) handles multiple children inside of body",
			steps: [
				{
					input: [
						`<html>
							<body>
								<div></div>
								<script></script>
								<template></template>
							</body>
						</html>`,
					],
					output: ["<html><body>"],
				},
				{ input: [], output: ["<div></div>", "<script></script>", "<template></template>", "</body></html>"] },
			],
		},
	].forEach((test) => {
		it(test.title, () => runTest(test));
	});

	it("waits for shellReady before breaking up the stream", () => {
		let resolveShellReady: () => void = () => {};
		const shellReady = new Promise<void>((r) => (resolveShellReady = r));
		const htmlStream = new PassThrough();
		const parser = createInsertIntoBodyStream(shellReady);
		const collector = new ChunkCollector();
		htmlStream.pipe(parser).pipe(collector);

		htmlStream.write("<html><body><div></div><script></script>");
		assertOutputChunks(collector, ["<html><body><div></div><script></script>"]);

		htmlStream.write("<div></div>");
		assertOutputChunks(collector, ["<div></div>"]);

		resolveShellReady();
	});
});
