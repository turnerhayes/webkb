import { render } from "react-dom";
import App from "../components/App";

render(
	<App>
		<h3>WebKB</h3>
	</App>,
	document.getElementById('app')
);

if (module.hot) {
	module.hot.accept();
}
