import { render } from "react-dom";
import App from "../components/App";
import PlayFileComponent from "../components/PlayFile";

render(
	<App>
		<PlayFileComponent />
	</App>,
	document.getElementById('app')
);

if (module.hot) {
	module.hot.accept();
}
