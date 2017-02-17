import _ from "lodash";
import $ from "jquery";
import React from "react";
import Soundfont from "../utils/audio/soundfont";
import AudioPlayPlan from "../utils/audio/play-plan";
import MIDIPrograms from "../utils/midi-programs";
import MIDINotes from "../utils/notes";
import "font-awesome/less/font-awesome.less";

class PlayTest extends React.Component {
	state = {
		noteList: [
			{
				instrument: 'Acoustic Grand Piano',
				noteName: 'Gb3',
				startAt: 0,
				duration: 7,
				volume: 100
			},
			{
				instrument: 'Flute',
				noteName: 'A2',
				startAt: 0.3,
				duration: 10,
				volume: 100
			},
		],
		isPlaying: false
	}

	plan = new AudioPlayPlan()

	handleFormSubmit(event) {
		event.preventDefault();
	}

	handleAddNoteClick() {
		this.setState({
			noteList: this.state.noteList.concat([{
				startAt: 0,
				duration: 1,
				volume: 100
			}])
		});
	}

	handleRemoveNoteClick(noteIndex) {
		const noteList = this.state.noteList;

		noteList.splice(noteIndex, 1);

		this.setState({noteList});
	}

	handlePlayClick() {
		this.playNotes(this.state.noteList);
	}

	handleNotePropertyChanged(event, property, noteIndex, converter = (val) => val) {
		const noteList = this.state.noteList;

		noteList[noteIndex][property] = converter($(event.target).val());

		this.setState({noteList});
	}

	playNotes(notes) {
		const plan = new AudioPlayPlan();

		Soundfont.getNotes(
			_.reduce(
				notes.reduce(
					(notes, note) => {
						if (!_.isEmpty(note)) {
							notes[note.instrument] = notes[note.instrument] || [];

							notes[note.instrument].push(note.noteName);

							notes[note.instrument] = _.uniq(notes[note.instrument]);
						}

						return notes;
					},
					{}
				),
				(notes, noteNames, instrument) => {
					notes[instrument] = _.uniq(noteNames);

					return notes;
				},
				{}
			)
		).done(
			(fetchedNotes) => {
				notes.forEach(
					note => {
						note.buffer = fetchedNotes[note.instrument][note.noteName];
						plan.addNote(
							_.extend(
								{},
								note,
								{
									buffer: fetchedNotes[note.instrument][note.noteName],
									volume: note.volume / 100
								}
							)
						);
					}
				);

				this.setState({isPlaying: true});

				plan.run().done(
					() => this.setState({isPlaying: false})
				);
			}
		);
	}

	renderNoteForm(note, noteIndex) {
		return (
			<div className="note-form form-inline" data-note-index={noteIndex}>
				<div className="form-group form-inline">
					<select
						name="instrument"
						className="form-control"
						defaultValue={note.instrument}
						onChange={event => this.handleNotePropertyChanged(event, 'instrument', noteIndex)}
					>
						{
							MIDIPrograms.map(
								(program, index) => (
									<option
										key={index}
										value={program.name}
									>{program.name}</option>
								)
							)
						}
					</select>
					<input
						type="text"
						list="note-name-list"
						name="note-name"
						className="form-control"
						required
						defaultValue={this.state.noteList[noteIndex].noteName}
						onChange={event => this.handleNotePropertyChanged(event, 'noteName', noteIndex)}
					/>
				</div>
				<div className="form-group form-inline">
					<label>
						Start at
						<input
							type="number"
							name="start-time"
							step="0.0001"
							className="form-control"
							defaultValue={this.state.noteList[noteIndex].startAt}
							onChange={event => this.handleNotePropertyChanged(event, 'startAt', noteIndex, Number)}
						/>s
					</label>
					<label>
						 for 
						<input
							type="number"
							name="duration"
							step="0.0001"
							className="form-control"
							defaultValue={this.state.noteList[noteIndex].duration}
							onChange={event => this.handleNotePropertyChanged(event, 'duration', noteIndex, Number)}
						/>s
					</label>
				</div>
				<div className="form-group form-inline">
					<label>
						Volume
						<input
							type="number"
							name="volume"
							min="0"
							max="100"
							step="1"
							defaultValue={this.state.noteList[noteIndex].volume}
							onChange={event => this.handleNotePropertyChanged(event, 'volume', noteIndex, Number)}
						/>%
					</label>
				</div>
				<button
					type="button"
					className="btn fa fa-play"
					disabled={this.state.isPlaying}
					onClick={() => this.playNotes([
						_.extend(
							{},
							this.state.noteList[noteIndex],
							{
								startAt: 0
							}
						)
					])}
					aria-label="Play note"
					title="Play note"
				/>
				<button
					type="button"
					className="btn fa fa-trash"
					onClick={(event) => this.handleRemoveNoteClick(noteIndex)}
					aria-label="Remove note"
					title="Remove note"
				/>
			</div>
		);
	}

	render() {
		return (
			<div className="play-test">
				<datalist
					id="note-name-list"
				>
					{
						MIDINotes.map(
							(note, number) => {
								const octaveNumber = number / 12 >> 0;
							
								return (
									<option
										key={note + octaveNumber}
										value={note + octaveNumber}
									>{note + octaveNumber}</option>
								);
							}
						)
					}
				</datalist>
				<form
					className="play-test-notes-form"
					action={window.location.href}
					method='get'
					onSubmit={(event) => this.handleFormSubmit(event)}
				>
					<ol className="note-list">
						{this.state.noteList.map(
							(note, index) => (
								<li
									key={index}
								>{
									this.renderNoteForm(note, index)
								}</li>
							)
						)}
					</ol>

					<button
						type="button"
						className="btn btn-primary"
						onClick={() => this.handleAddNoteClick()}
					>Add note</button>
				</form>

				<button
					type="button"
					className="btn fa fa-play"
					onClick={() => this.handlePlayClick()}
					disabled={this.state.isPlaying}
					aria-label="Play"
					title="Play"
				/>
			</div>
		);
	}
}

export default PlayTest;
