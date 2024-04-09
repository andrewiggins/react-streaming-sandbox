import { useContext } from "react";

import Theme from "./Theme.jsx";
import Suspend from "./Suspend.js";

import "./Page.css";

export default function Page2() {
	let theme = useContext(Theme);
	return (
		<div className={theme + "-box"}>
			<Suspend label="Page2">Content of a different page</Suspend>
		</div>
	);
}
