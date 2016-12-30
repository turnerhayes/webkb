import ReactDOM from "react-dom";
import { AppContainer } from 'react-hot-loader'
import App from "../components/App";
import Timeline from "../components/Timeline";

const el = document.getElementById('app')

ReactDOM.render(
	<AppContainer key={Math.random()}>
		<App>
			<Timeline />
		</App>
	</AppContainer>,
	el
);

if (module.hot) {
	module.hot.accept();
}
