"use strict";

import _                from "lodash";
import $                from "jquery";
import Backbone         from "backbone";
import MIDIListener     from "../lib/midi-listener";
import MIDIFileParser   from '../../../lib/utils/midi-file-parser';


function _getNotesSequence() {
	return [
		[0, 3],
		[1, 3]
	];
}

let _events = {
	'click .note': '_handleClickNote',
	'click .play-game-button': '_handleClickPlayGameButton',
	'note-played': '_handleNotePlayed',
	'change .midi-file-upload': '_handleChangeMIDIFileUpload',
};

export default class GameView extends Backbone.View {
	get events() {
		return _events;
	}

	initialize() {
		let view = this;

		view._$notes = view.$('.note-list .note');

		view._suppressKeyEvents = {};

		view._listenerPromise = MIDIListener.create();

		view._listenerPromise.done(
			function(listener) {
				listener.on('note-on', function(noteData) {
					var index = noteData.note % view._$notes.length;

					view._playNote(index);
				}).on('note-off', function(noteData) {
					var index = noteData.note % view._$notes.length;

					view._stopNotePlay(index);
				});
			}
		);

		$(document).on('keydown', function(event) {
			if (view._suppressKeyEvents[event.which]) {
				return;
			}

			switch (event.which) {
				case 49: // 1
					view._playNote(0);
					view._suppressKeyEvents[event.which] = true;
					break;
				case 50: // 2
					view._playNote(1);
					view._suppressKeyEvents[event.which] = true;
					break;
				case 51: // 3
					view._playNote(2);
					view._suppressKeyEvents[event.which] = true;
					break;
				case 52: // 4
					view._playNote(3);
					view._suppressKeyEvents[event.which] = true;
					break;
				case 53: // 5
					view._playNote(4);
					view._suppressKeyEvents[event.which] = true;
					break;
			}
		}).on('keyup', function(event) {
			delete view._suppressKeyEvents[event.which];
			
			switch (event.which) {
				case 49: // 1
					view._stopNotePlay(0);
					break;
				case 50: // 2
					view._stopNotePlay(1);
					break;
				case 51: // 3
					view._stopNotePlay(2);
					break;
				case 52: // 4
					view._stopNotePlay(3);
					break;
				case 53: // 5
					view._stopNotePlay(4);
					break;
			}
		});
	}

	_getNoteElement(index) {
		let view = this;

		if (index < 0 || index >= view._$notes.length) {
			return undefined;
		}
	
		return view._$notes.eq(index);
	}

	_playNote(indexOrEl) {
		let view = this;

		let $el = _.isNumber(indexOrEl) ? view._getNoteElement(indexOrEl) : indexOrEl;

		if (!$el) {
			return;
		}

		$el.removeClass('correct error');

		if ($el.hasClass('on')) {
			$el.addClass('correct');
		}
		else {
			$el.addClass('error');
		}

		$el.trigger('note-played');
	}

	_stopNotePlay(indexOrEl) {
		let view = this;

		let $el = _.isNumber(indexOrEl) ? view._getNoteElement(indexOrEl) : indexOrEl;

		if (!$el) {
			return;
		}

		$el.removeClass('correct error');
		$el.trigger('note-stopped');
	}

	_turnOnNote(indexOrEl) {
		let view = this;

		let $el = _.isNumber(indexOrEl) ? view._getNoteElement(indexOrEl) : indexOrEl;

		if (!$el) {
			return;
		}

		$el.addClass('on');
	}

	_turnOffNote(indexOrEl) {
		let view = this;

		let $el = _.isNumber(indexOrEl) ? view._getNoteElement(indexOrEl) : indexOrEl;

		if (!$el) {
			return;
		}

		$el.removeClass('on');
	}

	_toggleNote(indexOrEl) {
		let view = this;

		let $el = _.isNumber(indexOrEl) ? view._getNoteElement(indexOrEl) : indexOrEl;

		if (!$el) {
			return;
		}

		$el.toggleClass('on');
	}

	_setNotes(noteIndices) {
		let view = this;

		view._$notes.removeClass('on').filter(function() {
			return _.includes(noteIndices, $(this).index());
		}).addClass('on');
	}

	_checkNotesPlayed() {
		let view = this;

		let $onNotes = view._$notes.filter('.on');

		console.log('-------------------');
		console.log('$onNotes.length: ', $onNotes.length);
		console.log("$onNotes.filter('.correct').length: ", $onNotes.filter('.correct').length);
		console.log("view._$notes.filter('.error').length: ", view._$notes.filter('.error').length);

		return $onNotes.filter('.correct').length === $onNotes.length &&
			view._$notes.filter('.error').length === 0;
	}

	_processMIDIFile(file) {
		let view = this;

		let pianoTracks = _.reduce(
			file.tracks,
			function(tracks, track, trackIndex) {
				let pianoEvents = [];

				_.each(
					track.events,
					function(event) {
						if (
							_.includes(
								['Piano', 'Organ'],
								_.get(event.program, 'category')
							)
						) {
							if (_.size(pianoEvents) > 0) {
								tracks.push({
									track: trackIndex,
									events: pianoEvents,
								});

								pianoEvents = [];
							}
						}

						if (
							event.type === 'channel' &&
							_.includes(['NoteOn', 'NoteOff'], event.name)
						) {
							pianoEvents.push(event);
						}
					}
				);

				if (_.size(pianoEvents) > 0) {
					tracks.push({
						track: trackIndex,
						events: pianoEvents,
					});
				}

				return tracks;
			},
			[]
		);

		console.log('pianoTracks: ', pianoTracks);
	}

	_handleClickNote(event) {
		let view = this;

		let $note = $(event.currentTarget);

		view._toggleNote($note);
	}

	_handleClickPlayGameButton(event) {
		let view = this;

		let $button = $(event.target);

		$button.prop('disabled', true);

		let sequence = _getNotesSequence();

		let sequenceIndex = 0;

		view._setNotes(sequence[sequenceIndex]);

		view.$el.on('note-played.game-playing note-stopped.game-playing', function(event) {
			if (view._checkNotesPlayed()) {
				view.$el.addClass('correct');

				view.$el.one('animation-end.game-playing', function() {
					view.$el.removeClass('correct');
				});
				view._setNotes(sequence[++sequenceIndex]);
				view._$notes.removeClass('correct error');
				
				if (sequenceIndex === sequence.length) {
					view.$el.off('note-played.game-playing note-stopped.game-playing');
					$button.prop('disabled', false);
				}
			}
		});
	}

	_handleChangeMIDIFileUpload(event) {
		let view = this;

		if (event.target.files.length) {
			let reader = new FileReader();

			reader.onload = function(ev) {
				MIDIFileParser.parseFromArrayBuffer(ev.target.result).done(
					function(file) {
						view._processMIDIFile(file);
					}
				);
			};

			reader.readAsArrayBuffer(event.target.files[0]);
		}
	}
}

