/** @param {{ title: string; children: React.ReactNode; } & Partial<RootProps>} props */
export default function Html({ title, children, assets, rcId }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{title}</title>
				{assets?.css?.map((cssFile) => (
					<link key={cssFile} rel="stylesheet" href={cssFile} />
				))}
			</head>
			<body>
				{rcId && <script type="text/javascript" dangerouslySetInnerHTML={{ __html: `window.RCID = "${rcId.toString()}"` }}></script>}
				{rcId && <script type="text/javascript" src="/src/fetch-debugger.js"></script>}
				<script type="text/javascript" dangerouslySetInnerHTML={{ __html: 'logTime("pre-root:");' }}></script>
				<div id="root">{children}</div>
				<script type="text/javascript" dangerouslySetInnerHTML={{ __html: 'logTime("post-root");' }}></script>
				{assets?.js && <script src={assets.js} type="module"></script>}
			</body>
		</html>
	);
}
