"use strict";

import _            from "lodash";
import $            from "jquery";
import Backbone     from "backbone";
import MIDIListener from "../lib/midi-listener";
import MIDIMessage  from "../lib/midi-message";

let _events = {
	'mousedown .key': '_handleKeyMouseDown',
	'mouseup .key': '_handleKeyMouseUp',
	'mouseleave .key': '_handleKeyMouseUp'
};

export default class KeyboardView extends Backbone.View {
	get events() {
		return _events;
	}

	initialize() {
		let view = this;

		view._listenerPromise = MIDIListener.create();

		view._listenerPromise.done(
			_.bind(view._handleMIDIAccessSuccess, view),
			_.bind(view._handleMIDIAccessError, view)
		);
	}

	_pressKey(note) {
		let view = this;

		view.$('.key[data-key-number="' + note + '"]').addClass('pressed');
	}

	_releaseKey(note) {
		let view = this;

		view.$('.key[data-key-number="' + note + '"]').removeClass('pressed');
	}

	_attachMIDIListeners(listener) {
		let view = this;

		listener.on('note-off', function(message) {
			view._releaseKey(message.note);
		}).on('note-on', function(message) {
			view._pressKey(message.note);
		});
	}

	_handleMIDIAccessSuccess(listener) {
		let view = this;

		view._attachMIDIListeners(listener);
	}

	_handleMIDIAccessError(ex) {
		if (_.isUndefined(ex)) {
			console.error('No MIDI support in this browser');
		}
		else {
			console.error('Unable to get MIDI access: ', ex);
		}
	}

	_handleKeyMouseDown(event) {
		let view = this;

		let $key = $(event.currentTarget);

		let velocity = 100;

		view._listenerPromise.done(
			function(listener) {
				listener.send(undefined, MIDIMessage.Types.NoteOn, {
					channel: 1,
					velocity: velocity,
					note: $key.data('key-number')
				});
			}
		);

		$key.addClass('pressed');
	}

	_handleKeyMouseUp(event) {
		let view = this;

		let $key = $(event.currentTarget);

		if (!$key.hasClass('pressed')) {
			return;
		}

		let velocity = 100;

		view._listenerPromise.done(
			function(listener) {
				listener.send(undefined, MIDIMessage.Types.NoteOff, {
					channel: 1,
					velocity: velocity,
					note: $key.data('key-number')
				});
			}
		);

		$key.removeClass('pressed');
	}
}
