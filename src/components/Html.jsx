/** @param {{ title: string; children: React.ReactNode; clientSrc?: string; }} props */
export default function Html({ title, children, clientSrc }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{title}</title>
			</head>
			<body>
				<script type="text/javascript" dangerouslySetInnerHTML={{ __html: 'console.log("pre-root");' }}></script>
				<div id="root">{children}</div>
				<script type="text/javascript" dangerouslySetInnerHTML={{ __html: 'console.log("post-root");' }}></script>
				{clientSrc && <script src={clientSrc} type="module"></script>}
			</body>
		</html>
	);
}
