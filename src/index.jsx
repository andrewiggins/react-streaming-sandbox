import { renderToReadableStream } from "react-dom/server.edge";
import Html from "./Html.jsx";

/** @param {{ routes: Routes }} props */
function Index({ routes }) {
	return (
		<Html title="React streaming sandbox">
			<h1>React streaming sandbox</h1>
			<ul>
				{Object.keys(routes).map((routePath) => {
					const route = routes[routePath];
					return (
						<li key={routePath}>
							<a href={routePath}>{route.label}</a>
						</li>
					);
				})}
			</ul>
		</Html>
	);
}

/** @type {(routes: Routes) => Promise<import("react-dom/server").ReactDOMServerReadableStream>} */
export default function render(routes) {
	return renderToReadableStream(<Index routes={routes} />);
}
