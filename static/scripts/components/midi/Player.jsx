import React from "react";
import MIDIListener from "../../utils/midi-listener";

import "midi-player.less";

class MIDIPlayer extends React.Component {
	static propTypes = {
		file: React.PropTypes.object,
		onPlay: React.PropTypes.func,
		onPause: React.PropTypes.func,
		isPlaying: React.PropTypes.bool
	}

	midiListenerPromise = MIDIListener.create()

	handlePlayClicked = () => {
		if (this.props.onPlay) {
			this.props.onPlay();
		}
	}

	handlePauseClicked = () => {
		if (this.props.onPause) {
			this.props.onPause();
		}
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.isPlaying && !this.props.isPlaying) {
			this.startPlaying();
		}
		else if (!nextProps.isPlaying && this.props.isPlaying) {
			this.stopPlaying();
		}
	}

	stopPlaying() {

	}

	startPlaying() {

	}

	render() {
		return (
			<div className="midi-player">
				<div
					className="controls-list btn-group"
				>
						<button
							type="button"
							disabled={this.props.file === null || this.props.isPlaying}
							onClick={() => this.handlePlayClicked()}
							className="btn fa fa-play"
							aria-label="Play"
							title="Play"
						/>
						<button
							type="button"
							disabled={this.props.file === null || !this.props.isPlaying}
							onClick={() => this.handlePauseClicked()}
							className="btn fa fa-pause"
							aria-label="Pause"
							title="Pause"
						/>
				</div>
			</div>
		);
	}
}

export default MIDIPlayer;
