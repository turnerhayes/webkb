import React from "react";
import MIDIPlayer from "./midi/Player";
import MIDIFileUpload from "./midi/FileUpload";
import MIDIOutputSelector from "./midi/OutputSelector";

class PlayFileComponent extends React.Component {
	state = {
		file: null,
		isPlaying: false,
		midiOutputId: null
	}

	render() {
		return (
			<div className="play-file form-inline">
				<MIDIFileUpload onFileChosen={(file) => this.setState({file})} />
				<label>
					Audio output: 
					<MIDIOutputSelector
						nullOutputText="(Speaker)"
						onOutputChanged={(id) => this.setState({midiOutputId: id})}
					/>
				</label>
				<MIDIPlayer
					file={this.state.file}
					onPlay={() => this.setState({isPlaying: true})}
					onPause={() => this.setState({isPlaying: false})}
					isPlaying={this.state.isPlaying}
					destinationId={this.state.midiOutputId}
				/>
			</div>
		);
	}
}

export default PlayFileComponent;
