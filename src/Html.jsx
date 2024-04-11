/** @param {{ title: string; children: React.ReactNode; assets?: Assets; }} props */
export default function Html({ title, children, assets }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{title}</title>
				{assets && assets.css?.map((cssFile) => <link rel="stylesheet" href={cssFile} />)}
				<script type="text/javascript" src="/src/request-controller.js"></script>
			</head>
			<body>
				<script type="text/javascript" dangerouslySetInnerHTML={{ __html: 'console.log("pre-root");' }}></script>
				<div id="root">{children}</div>
				<script type="text/javascript" dangerouslySetInnerHTML={{ __html: 'console.log("post-root");' }}></script>
				{assets && <script src={assets.js} type="module"></script>}
			</body>
		</html>
	);
}
