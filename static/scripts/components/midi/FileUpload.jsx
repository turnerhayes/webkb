import React from "react";
import Dropzone from "react-dropzone";
import MIDIFileParser from "../../utils/midi-file-parser";

class MIDIFileUpload extends React.Component {
	static propTypes = {
		onFileChosen: React.PropTypes.func
	}

	handleMIDIFileUpload(acceptedFiles) {
		if (acceptedFiles.length) {
			const reader = new FileReader();

			reader.onload = ev => {
				MIDIFileParser.parseFromArrayBuffer(ev.target.result).done(
					file => {
						if (this.props.onFileChosen) {
							this.props.onFileChosen(file);
						}
					}
				);
			};

			reader.readAsArrayBuffer(acceptedFiles[0]);
		}
	}

	render() {
		return (
			<Dropzone
				onDrop={(acceptedFiles, rejectedFiles) => this.handleMIDIFileUpload(acceptedFiles)}
				accept="audio/midi"
				disablePreview
			>
				<div>Drop a MIDI file here or click to open a file chooser.</div>
			</Dropzone>
		);
	}
}

export default MIDIFileUpload;
