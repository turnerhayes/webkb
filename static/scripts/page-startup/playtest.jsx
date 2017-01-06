import { render } from "react-dom";
import App from "../components/App";
import PlayTest from "../components/PlayTest";
import AudioPlayPlan from "../utils/audio/play-plan";
import Soundfont from "../utils/audio/soundfont";

const plan = new AudioPlayPlan();

render(
	<App>
		<PlayTest />
	</App>,
	document.getElementById('app')
);
