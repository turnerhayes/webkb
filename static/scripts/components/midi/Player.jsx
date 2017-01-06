import _ from "lodash";
import Promise from "bluebird";
import React from "react";
import axios from "axios";
import JSZip from "jszip";
import MIDIListener from "../../utils/midi-listener";
import MIDINotes from "../../utils/notes";
import AudioPlayer from "../../utils/audio/player";
import AudioPlayPlan from "../../utils/audio/play-plan";
import Soundfont from "../../utils/audio/soundfont";

import "midi-player.less";

class MIDIPlayer extends React.Component {
	static propTypes = {
		file: React.PropTypes.object,
		onPlay: React.PropTypes.func,
		onPause: React.PropTypes.func,
		isPlaying: React.PropTypes.bool,
		destinationId: React.PropTypes.string
	}

	player = new AudioPlayer()

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

	componentDidMount() {
		if (this.props.file) {
			this.loadFile(this.props.file);
		}
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.file !== this.props.file) {
			this.loadFile(nextProps.file);
		}

		if (nextProps.isPlaying && !this.props.isPlaying) {
			this.startPlaying();
		}
		else if (!nextProps.isPlaying && this.props.isPlaying) {
			this.stopPlaying();
		}
	}

	stopPlaying() {
		this.player.pause();
	}

	startPlaying() {
		if (this.props.destinationId) {
			this.outputToMIDI();
		}
		else {
			this.outputToSpeakers();
		}

		return;

		// if (this.player.isPaused) {
		// 	this.player.resume();
		// 	return;
		// }

		// if (_.isEmpty(MIDIPlayer.instrumentCache)) {
		// 	console.warn('No instrument files in cache');
		// 	return;
		// }

		// const instrumentName = _.first(_.keys(MIDIPlayer.instrumentCache));

		// const note = _.first(_.keys(MIDIPlayer.instrumentCache[instrumentName]));

		// const buffer = MIDIPlayer.instrumentCache[instrumentName][note];

		// const node = this.player.playBuffer(buffer, {
		// 	loop: true
		// });
	}

	loadFile(file) {
		const instrumentNotes = {};

		file.tracks.forEach(
			track => {
				let currentInstrumentName;

				track.events.forEach(
					e => {
						if (e.name === 'NoteOn') {
							instrumentNotes[currentInstrumentName].add(MIDINotes[e.key]);
						}
						else if (e.name === 'ProgramChange') {
							currentInstrumentName = e.program.name;
							instrumentNotes[e.program.name] = instrumentNotes[e.program.name] || new Set();
						}
					}
				);
			}
		);

		const instruments = _.keys(instrumentNotes);

		// Set() can't be stringified, so we make it an Array
		instruments.forEach(
			instrument => instrumentNotes[instrument] = Array.from(instrumentNotes[instrument])
		);

		Soundfont.getNotes(instrumentNotes).then(
			(notes) => {

			}
		);
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

	outputToMIDI() {
		const outputId = this.props.destinationId;

		this.midiListenerPromise.then(
			listener => {
				this.props.file.tracks.forEach(
					track => {
						track.events.forEach(
							e => {
								listener.sendEvent(outputId, e);
							}
						);
					}
				);
			}
		);
	}

	outputToSpeakers() {
		const playPlan = new AudioPlayPlan();

		this.props.file.tracks.forEach(
			track => {
				let currentInstrument;
				const trackDuration = _.maxBy(track.events, 'microsecondOffset');

				for (let i = track.events.length - 1; i >= 0; i--) {
					const event = track.events[i];

					if (event.name === 'ProgramChange') {
						currentInstrument = event.program.name;
					}
					else if (event.name === 'NoteOn') {
						let noteOffEvent;

						for (let j = i; j < track.events.length; j++) {
							if (track.events[j].name === 'NoteOff' && track.events[j].key === event.key) {
								noteOffEvent = track.events[j];
								break;
							}
						}

						let noteDuration;

						if (noteOffEvent) {
							noteDuration = noteOffEvent.microsecondOffset - event.microsecondOffset;
						}
						else {
							noteDuration = trackDuration - event.microsecondOffset;
						}

						playPlan.addNote({
							buffer: MIDIPlayer.instrumentCache[currentInstrument][MIDINotes[event.key]],
							volume: event.velocity / 127,
							startAt: event.microsecondOffset,
							duration: noteDuration,
							channel: event.channel
						});
					}
				}
			}
		);

		playPlan.start();
	}
}

export default MIDIPlayer;
