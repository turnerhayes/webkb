import { render } from "react-dom";
import App from "../components/App";
import Keyboard from "../components/Keyboard";

render(
	<App>
		<Keyboard />
	</App>,
	document.getElementById('app')
);

if (module.hot) {
	module.hot.accept();
}
