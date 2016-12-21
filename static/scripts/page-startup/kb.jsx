import { render } from "react-dom";
import App from "../components/App";
import Keyboard from "../components/Keyboard";
import "main.scss";

render(
	<App>
		<Keyboard />
	</App>,
	document.getElementById('app')
);
