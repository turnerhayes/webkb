"use strict";

import _                       from "lodash";
import $                       from "jquery";
import Backbone                from "backbone";
import AudioPlayer             from "../lib/audio-player";
import MIDIListener            from "../lib/midi-listener";
import MIDIMessage             from "../lib/midi-message";
import MIDIFileParser          from '../../../lib/utils/midi-file-parser';
import MIDIProgramNames        from '../../../lib/utils/midi-file-parser/midi-programs';
import timelinePartialTemplate from '../../templates/partials/timeline.hbs';


function _transformData(file, options) {
	options = options || {};

	if (_.isUndefined(options.window)) {
		options.window = {
			start: 0,
			end: 100,
		};
	}
	else {
		_.defaults(
			options.window,
			{
				start: 0,
				end: 100
			}
		);
	}

	let totalWindowDuration = ((options.window.end - options.window.start) * file.duration) / 100;
	let startMicroseconds = (options.window.start * file.duration) / 100;

	let tracks = _.map(
		file.tracks,
		function(track, trackIndex) {
			let events = [];
			let trackEventCount = track.events.length;

			_.each(
				track.events,
				function(event, index) {
					// Note started
					if (event.name === 'NoteOn') {
						let noteEnd;

						// Find the corresponding note end
						for (let i = index; i < trackEventCount; i++) {
							if (track.events[i].name === 'NoteOff' && track.events[i].key === event.key) {
								noteEnd = track.events[i];

								break;
							}
						}

						if (_.isUndefined(noteEnd)) {
							// No corresponding note end; assume note goes until end of track
							noteEnd = track.events[trackEventCount - 1];
						}

						let noteData = {
							type: 'note',
							id: _.uniqueId('track' + trackIndex + 'note-'),
							key: event.key,
							name: event.keyName,
							velocity: event.velocity,
							start: event.microsecondOffset,
							duration: noteEnd.microsecondOffset - event.microsecondOffset,
						};
						
						noteData.startPercentage = (
							(noteData.start - startMicroseconds) * 100
						) / totalWindowDuration;
						
						noteData.durationPercentage = (noteData.duration * 100) / totalWindowDuration;
						
						noteData.overlappingNotes = _.reduce(
							events,
							function(overlapping, note) {
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
								noteData.start < startMicroseconds &&
								// note does not extend into the beginning of the window
								noteData.start + noteData.duration < startMicroseconds
							) || (
								// note data starts after the window ends
								noteData.start > startMicroseconds + totalWindowDuration
							)
						) {
							// don't include the note, as it won't get rendered anyway
							return;
						}

						events.push(noteData);
					}
					else if (event.name === 'ProgramChange') {
						let eventData = {
							type: "program",
							programNumber: event.programNumber,
							programInfo: MIDIProgramNames[event.programNumber],
							start: event.microsecondOffset,
						};
						
						eventData.startPercentage = (
							(eventData.start - startMicroseconds) * 100
						) / totalWindowDuration;

						events.push(eventData);
					}
				}
			);

			return {
				events,
			};
		}
	);

	return {
		duration: file.duration,
		tracks,
		startMicroseconds,
		totalWindowDuration,
		window: options.window,
	};
}

let _events = {
	'change .midi-file-upload': '_handleChangeMIDIFileUpload',
	'change [name="window-start"],[name="window-end"]': '_handleWindowChange',
	'click .note': '_handleNoteClick',
};

export default class TimelineView extends Backbone.View {
	get events() {
		return _events;
	}

	initialize() {
		let view = this;

		view._player = new AudioPlayer();

		view._$timelineContainer = view.$('.timeline-container');

		view._$windowStart = view.$('[name="window-start"]');
		view._$windowEnd = view.$('[name="window-end"]');

		view._$midiOutputSelector = view.$('.midi-output-selector-control');

		view._midiListenerPromise = MIDIListener.create();
	}

	render() {
		let view = this;

		view._midiListenerPromise.done(
			function(listener) {
				view._$midiOutputSelector.html(
					_.map(
						[undefined].concat(Array.from(listener.outputs)),
						function(output) {
							if (_.isUndefined(output)) {
								return '<option value="">(none)</option>';
							}

							return '<option value="' + _.escape(output.id) + '">' +
								_.escape(output.name) + '</option>';
						}
					).join('')
				);
				
			}
		);

		return view;
	}

	_processMIDIFile(options) {
		let view = this;

		options = options || {};

		options.window = options.window || {};

		_.defaults(
			options.window,
			{
				start: Number(view._$windowStart.val()),
				end: Number(view._$windowEnd.val()),
			}
		);

		view._transformedData = _transformData(
			view._file,
			{
				window: _.get(options, 'window'),
			}
		);

		view._$timelineContainer.html(timelinePartialTemplate(view._transformedData));

		view._$timelineContainer.find('[data-toggle="popover"]').popover();
	}

	_playNoteFromElement($note) {
		let view = this;

		let trackNumber = $note.closest('.track').data('track-number');

		let eventIndex = $note.data('event-index');

		let track = view._transformedData.tracks[trackNumber];

		let previousProgramChangeEvent;

		for (let i = eventIndex - 1; i >= 0; i--) {
			if (track.events[i].type === 'program') {
				previousProgramChangeEvent = track.events[i];
				break;
			}
		}

		let key = $note.data('note-key');

		let velocity = $note.data('note-velocity');

		let duration = $note.data('note-duration');

		let outputID = view._$midiOutputSelector.val();

		if (!outputID) {
			velocity = (velocity * 100) / 127;
			duration = duration / 1000;

			view._player.playInstrument(
				_.result(previousProgramChangeEvent, 'programNumber', 0),
				key,
				velocity,
				1,
				duration
			);
		}
		else {
			view._midiListenerPromise.done(
				function(listener) {
					listener.send(outputID, MIDIMessage.Types.NoteOn, {
						note: key,
						velocity: velocity,
						channel: 1,
					});

					listener.send(
						outputID,
						MIDIMessage.Types.NoteOff,
						{
							note: key,
							velocity: velocity,
							channel: 1,
						},
						duration * 1000
					);
				}
			);
		}
	}

	_getNoteDataFromNode($node) {
		let view = this;

		let trackNumber = $node.closest('.track').data('track-number');

		let eventIndex = $node.data('event-index');

		let track = view._transformedData.tracks[trackNumber];

		let note = track.events[eventIndex];

		let previousProgramChangeEvent;

		for (let i = eventIndex - 1; i >= 0; i--) {
			if (track.events[i].type === 'program') {
				previousProgramChangeEvent = track.events[i];
				break;
			}
		}

		return {
			key: note.key,
			velocity: note.velocity,
			start: note.start,
			duration: note.duration,
			programNumber: _.result(previousProgramChangeEvent, 'programNumber', 0),
		};
	}

	_handleChangeMIDIFileUpload(event) {
		let view = this;

		if (event.target.files.length) {
			let reader = new FileReader();

			reader.onload = function(ev) {
				MIDIFileParser.parseFromArrayBuffer(ev.target.result).done(
					function(file) {
						view._file = file;

						view._processMIDIFile();
					}
				);
			};

			reader.readAsArrayBuffer(event.target.files[0]);
		}
	}

	_handleWindowChange() {
		let view = this;

		if (!view._file) {
			return;
		}

		view._processMIDIFile();
	}

	_handleNoteClick(event) {
		let view = this;

		let $target = $(event.target);

		let overlappingNoteIds = $target.data('overlapping-notes');

		let $overlappingNotes = $(
			_.map(
				overlappingNoteIds,
				function(noteId) {
					return '[data-note-id="' + noteId + '"]';
				}
			).join(',')
		);

		// $target.add($overlappingNotes).each(
		// 	function() {
		// 		view._playNoteFromElement($(this));
		// 	}
		// );

		let notes = _.map(
			$target.add($overlappingNotes),
			function(el) {
				return view._getNoteDataFromNode($(el));
			}
		);

		let firstNoteStart = _.min(_.map(notes, 'start'));

		_.each(
			notes,
			function(note) {
				// AudioPlayer expects notes in seconds, not microseconds
				note.start = (note.start - firstNoteStart) / 1e6;
				note.volume = note.velocity / 127;
			}
		);

		view._player.playNotes(notes);
	}
}
