import React from "react";
import _ from "lodash";
import TimelineTrack from "./timeline/Track";
import MIDIOutputSelector from "./midi/OutputSelector";
import MIDIFileUpload from "./midi/FileUpload";
import "timeline.less";

class Timeline extends React.Component {
	constructor(props) {
		super(props);

		this.containerId = _.uniqueId('timeline-container-');
		
		this.state = {
			file: null,
			windowStart: 0,
			windowEnd: 100,
			selectedOutputId: null
		};
	}

	render() {
		return (
			<div className="timeline">
				<MIDIFileUpload
					onFileChosen={file => this.setState({file})}
				/>
				<label className="window-range-label start">
					Start of range: 
					<input
						type="number"
						className="form-control"
						ref="window-start"
						defaultValue={this.state.windowStart}
						onBlur={event => this.setState({windowStart: event.target.valueAsNumber})}
						min={0}
						max={100}
						step="any" />%
				</label>
				<label className="window-range-label end">
					End of range: 
					<input
						type="number"
						className="form-control"
						ref="window-end"
						defaultValue={this.state.windowEnd}
						onBlur={event => this.setState({windowEnd: event.target.valueAsNumber})}
						min={0}
						max={100}
						step="any" />%
				</label>
				<div className="midi-output-selector">
					<label>
						MIDI Outputs:
						<MIDIOutputSelector
							onOutputChanged={outputId => this.setState({selectedOutputId: outputId})}
						/>
					</label>
				</div>
				<div className="timeline-container" id={this.containerId}>
					{this.state.file && _.map(
						this.state.file.tracks,
						(track, trackIndex) => (
							<TimelineTrack
								key={`track-item-${trackIndex}`}
								events={track.events}
								trackNumber={trackIndex}
								startMicroseconds={this.state.file ?
									(this.state.windowStart * this.state.file.duration) / 100 :
									0
								}
								totalWindowDuration={this.state.file ?
									((this.state.windowEnd - this.state.windowStart) * this.state.file.duration) / 100 :
									0
								}
							/>
						)
					)}
				</div>
			</div>
		);
	}
}

export default Timeline;
