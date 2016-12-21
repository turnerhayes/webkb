"use strict";

import $            from "jquery";
import _            from "lodash";
import Backbone     from "backbone";
import MIDIListener from "../lib/midi-listener";
import MIDIMessage  from "../lib/midi-message";
import AudioPlayer  from "../lib/audio-player";


let _events = {
	'submit .midi-output-form': '_handleMIDIOutputFormSubmitted',
	'change .command-type-selector': '_handleCommandTypeChanged'
};

let _commandFields = {};

_commandFields[MIDIMessage.Types.NoteOff] = _commandFields[MIDIMessage.Types.NoteOn] = ['channel', 'note-number', 'velocity'];
_commandFields[MIDIMessage.Types.PolyphonicKeyPressure] = ['channel', 'note-number', 'pressure'];
_commandFields[MIDIMessage.Types.ControlChange] = ['channel', 'control-number', 'control-value'];
_commandFields[MIDIMessage.Types.ProgramChange] = ['channel', 'program-number'];
_commandFields[MIDIMessage.Types.ChannelPressure] = ['channel', 'pressure'];
_commandFields[MIDIMessage.Types.PitchBend] = ['channel', 'pitch-bend'];


let _fieldNameMap = {
	'note-number': 'note',
	'program-number': 'program',
	'control-number': 'control',
	'control-value': 'value',
	'pitch-bend': 'bend',
};

export default class MIDIReceiverView extends Backbone.View {
	get events() {
		return _events;
	}

	initialize() {
		let view = this;

		Backbone.View.prototype.initialize.apply(view, arguments);

		view._player = new AudioPlayer();

		view._listenerPromise = MIDIListener.create();

		view._listenerPromise.done(
			_.bind(view._handleMIDIAccessSuccess, view),
			_.bind(view._handleMIDIAccessError, view)
		);

		view._$playSoundsCheckbox = view.$('.play-sounds-checkbox');

		view._$outputSelector = view.$('.output-selector');
		view._$commandTypeSelector = view.$('.command-type-selector');

		view._$messageInputsContainer = view.$('.message-data-inputs-container');

		view._$channelField = view._$messageInputsContainer.find('.channel-field');
		view._$noteNumberField = view._$messageInputsContainer.find('.note-number-field');
		view._$velocityField = view._$messageInputsContainer.find('.velocity-field');

		view._$logger = view.$('.logger');
	}

	_attachMIDIListeners(listener) {
		let view = this;

		listener.on('device-connected', function(deviceInfo) {
			view._updateOutputList(listener);
		}).on('device-disconnected', function(deviceInfo) {
			view._updateOutputList(listener);
		}).on('note-off', function(message) {
			view._player.stopNote(message.note, message.channel);
		}).on('note-on', function(message) {
			if (view._$playSoundsCheckbox.prop('checked')) {
				view._player.playNote(message.note, message.velocity, message.channel);
			}
		}).on('command', function(message) {
			view._log(message);
		});
	}

	_handleMIDIAccessSuccess(listener) {
		let view = this;

		view._setupOutputForm(listener);

		view._attachMIDIListeners(listener);
	}

	_updateOutputList(listener) {
		let view = this;
		let outputOptions = '';

		for (let output of listener.outputs) {
			outputOptions += '<option value="' + _.escape(output.id) + '">' + _.escape(output.name) + '</option>';
		}

		view._$outputSelector.html(outputOptions);
	}

	_setupOutputForm(listener) {
		let view = this;
		let commandOptions = '';

		view._updateOutputList(listener);

		_.each(
			MIDIMessage.Types,
			function(commandType, commandName) {
				commandOptions += '<option value="' + _.escape(commandType) +'">' + _.escape(commandName) + '</option>';
			}
		);

		view._$commandTypeSelector.html(commandOptions);

		view._setVisibleControls();
	}

	_setVisibleControls() {
		let view = this;

		let selectedCommand = view._$commandTypeSelector.val();

		let visibleFieldNames = _commandFields[selectedCommand];

		if (_.isUndefined(visibleFieldNames)) {
			return;
		}

		let $fields = view._$messageInputsContainer.find('.message-field');

		let $visibleFields = $fields.filter(visibleFieldNames.map((name) => '.' + name + '-field').join(','));

		$fields.not($visibleFields).addClass('hidden');
		$visibleFields.removeClass('hidden');
	}

	_handleMIDIAccessError(ex) {
		if (_.isUndefined(ex)) {
			console.error('No MIDI support in this browser');
		}
		else {
			console.error('Unable to get MIDI access: ', ex);
		}
	}

	_handleMIDIOutputFormSubmitted(event) {
		let view = this;

		event.preventDefault();


		view._listenerPromise.done(
			function(listener) {
				let commandType = parseInt(view._$commandTypeSelector.val(), 10);

				let inputValues = _.reduce(
					view._$messageInputsContainer.find('.message-field:not(.hidden) :input'),
					function(values, input) {
						let $input = $(input);
						let name = $input.attr('name');
						let type = $input.attr('type') || $input.data('type');
						let val = $input.val();

						if (name in _fieldNameMap) {
							name = _fieldNameMap[name];
						}

						if (type === 'number' || type === 'range') {
							val = parseInt(val, 10);
						}

						if (name in values) {
							if (!_.isArray(values[name])) {
								values[name] = [values[name]];
							}

							values[name].push(val);
						}
						else {
							values[name] = val;
						}

						return values;
					},
					{}
				);

				listener.send(view._$outputSelector.val(), commandType, inputValues);
			}
		);
	}

	_handleCommandTypeChanged(event) {
		let view = this;

		view._setVisibleControls();
	}

	_log(data) {
		var view = this;

		view._$logger.append('<li>' + '\n' + JSON.stringify(data, null, '\t') + '</li>');

		view._$logger.scrollTop(view._$logger.get(0).scrollHeight);
	}
}
