import React from "react";
import MIDIProgramNames from "../../utils/midi-programs";
import "track.less";

class TimelineTrack extends React.Component {
	static propTypes = {
		onNoteClicked: React.PropTypes.func
	};

	transformTrack() {
		const trackEvents = this.props.events;
		const events = [];
		const trackEventCount = trackEvents.length;

		_.each(
			trackEvents,
			(event, eventIndex) => {
				// Note started
				if (event.name === 'NoteOn') {
					let noteEnd;

					// Find the corresponding note end
					for (let i = eventIndex; i < trackEventCount; i++) {
						if (trackEvents[i].name === 'NoteOff' && trackEvents[i].key === event.key) {
							noteEnd = trackEvents[i];

							break;
						}
					}

					if (_.isUndefined(noteEnd)) {
						// No corresponding note end; assume note goes until end of track
						noteEnd = trackEvents[trackEventCount - 1];
					}

					const noteData = {
						type: 'note',
						id: _.uniqueId('track' + this.props.trackNumber + 'note-'),
						key: event.key,
						name: event.keyName,
						velocity: event.velocity,
						start: event.microsecondOffset,
						duration: noteEnd.microsecondOffset - event.microsecondOffset,
					};
					
					noteData.startPercentage = (
						(noteData.start - (this.props.startMicroseconds || 0)) * 100
					) / this.props.totalWindowDuration;
					
					noteData.durationPercentage = (noteData.duration * 100) / this.props.totalWindowDuration;
					
					noteData.overlappingNotes = _.reduce(
						events,
						(overlapping, note) => {
							if (
								note.type === 'note' &&
								// note starts within the current note's duration
								(
									note.start >= noteData.start &&
									note.start <= noteData.start + noteData.duration
								) ||
								// note ends within the current note's duration
								(
									note.start + note.duration >= noteData.start &&
									note.start + note.duration >= noteData.start + noteData.duration
								)
							) {
								overlapping.push(note.id);
							}

							return overlapping;
						},
						[]
					);

					if (
						(
							// note does not start after the window
							noteData.start < (this.props.startMicroseconds || 0) &&
							// note does not extend into the beginning of the window
							noteData.start + noteData.duration < (this.props.startMicroseconds || 0)
						) || (
							// note data starts after the window ends
							noteData.start > (this.props.startMicroseconds || 0) + this.props.totalWindowDuration
						)
					) {
						// don't include the note, as it won't get rendered anyway
						return;
					}

					events.push(noteData);
				}
				else if (event.name === 'ProgramChange') {
					const eventData = {
						type: "program",
						programNumber: event.programNumber,
						programInfo: MIDIProgramNames[event.programNumber],
						start: event.microsecondOffset,
					};
					
					eventData.startPercentage = (
						(eventData.start - (this.props.startMicroseconds || 0)) * 100
					) / this.props.totalWindowDuration;

					events.push(eventData);
				}
			}
		);

		return events;
	}

	render() {
		return (
			<ol
				className="track"
				title={this.props.name}
				data-track-number={this.props.trackNumber}
			>
				{_.map(
					this.transformTrack(),
					(event, eventIndex) => {
						const eventId = _.uniqueId('event-id-');

						const props = {
							key: `track-event-${this.props.trackNumber}-event-${eventId}`
						};

						if (event.type === 'note') {
							props.className = "note";
							props.style = {
								left: event.startPercentage.toFixed(4) + '%',
								width: event.durationPercentage.toFixed(4) + '%',
								opacity: (event.velocity / 127).toFixed(2)
							};
							props.id = eventId;

							_.each(
								['id', 'key', 'name', 'velocity', 'duration'],
								propName => {
									props[`data-note-${propName}`] = event[propName];
								}
							)
							props['data-overlapping-note-count'] = event.overlappingNotes.length;

							if (_.isFunction(this.props.onNoteClicked)) {
								props.onClick = () => this.props.onNoteClicked(event, eventId);
							}
						}
						else if (event.type === 'program') {
							_.extend(props, {
								'data-program-number': event.programNumber,
								'data-program-name': MIDIProgramNames[event.programNumber].name,
								'data-program-category': MIDIProgramNames[event.programNumber].category
							});
						}
						else {
							return '';
						}

						return (
							<li
								{...props}
							></li>
						);

						return '';
					}
				)}
				{/*}
				{_.map(
					this.props.events,
					(event, index) => {
						return (
							<li
								key={`track-event-${index}`}
								className={event.type === 'note' ? 'note' : 'program-change'}
							/></li>
						);
					}
				)}*/}
				{/*
				{{#each events}}
				<li
					data-event-index="{{@index}}"
					{{#if (Compare type '===' 'note')}}
					className="note"
					data-note-id="{{id}}"
					data-note-key="{{key}}"
					data-note-name="{{name}}"
					data-note-velocity="{{velocity}}"
					data-note-duration="{{duration}}"
					data-overlapping-note-count="{{overlappingNotes.length}}"
					data-overlapping-notes="{{Serialize overlappingNotes}}"
					data-toggle="popover"
					data-placement="top"
					data-title="{{name}}"
					data-html="true"
					data-content="{{> note-popup}}"
					data-trigger="hover"
					style="left: {{Round startPercentage 4}}%; width: {{Round durationPercentage 4}}%; opacity: {{Round (Divide velocity 127) 2}}"
					{{/if}}
					{{#if (Compare type '===' 'program')}}
					className="program-change"
					data-program-number="{{programNumber}}"
					data-program-name="{{programInfo.name}}"
					data-program-category="{{programInfo.category}}"
					data-toggle="popover"
					data-placement="top"
					data-title="Instrument changed to {{programInfo.name}}"
					data-html="true"
					data-content="at {{Round (Divide start 1000000) 2}}s"
					data-trigger="hover"
					style="left: {{Round startPercentage 4}}%;"
					{{/if}}
				></li>
				{{/each}}
				*/}
			</ol>
		);
	}
}

export default TimelineTrack;
