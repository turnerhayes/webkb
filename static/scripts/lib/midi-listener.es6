"use strict";

import EventEmitter from 'events';
import assert       from 'assert';
import _            from 'lodash';
import Q            from "q";
import MIDIMessage  from "./midi-message";

function _requestMIDIAccess() {
	var deferred = Q.defer();

	if (navigator.requestMIDIAccess) {
		navigator.requestMIDIAccess({
			sysex: false
		}).then(
			function(access) {
				deferred.resolve(access);
			},
			function(ex) {
				deferred.reject(ex);
			}
		);
	}
	else {
		deferred.reject();
	}

	return deferred.promise;
}

function _getDeviceInfo(device) {
	return {
		name: device.name,
		id: device.id,
		version: device.version
	};
}

function _attachDeviceListeners(device) {
	// jshint validthis: true
	let listener = this;

	if (device.state === 'connected') {
		listener.emit('device-connected', _getDeviceInfo(device));
	}
	else {
		device.onstatechange = function(event) {
			if (event.port.state === 'connected') {
				listener.emit('device-connected', _getDeviceInfo(event.port));
			}
		};
	}

	device.onmidimessage = _.bind(_onMIDIMessage, listener);
}

function _attachListeners() {
	// jshint validthis: true
	let listener = this;

	let inputs = listener._MIDIAccess.inputs.values();

	for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
		_attachDeviceListeners.call(listener, input.value);
	}

	listener._MIDIAccess.onstatechange = _.bind(_onStateChange, listener);
}


function _onStateChange(event) {
	// jshint validthis: true
	let listener = this;

	let deviceInfo = _getDeviceInfo(event.port);

	if (event.port.state === "disconnected") {
		listener.emit('device-disconnected', deviceInfo);
		return;
	}

	_attachDeviceListeners.call(listener, event.port);
}

function _onMIDIMessage(msg) {
	// jshint validthis:true
	let listener = this;

	let message = MIDIMessage.parse(msg.data);

	message.source = _getDeviceInfo(msg.target);

	switch (message.command.type) {
		case MIDIMessage.Types.NoteOff:
			listener.emit('note-off', message);
			break;

		case MIDIMessage.Types.NoteOn:
			listener.emit('note-on', message);
			break;

		case MIDIMessage.Types.PolyphonicKeyPressure:
			listener.emit('polyphonic-key-pressure', message);
			break;

		case MIDIMessage.Types.ControlChange:
			listener.emit('control-change', message);
			break;

		case MIDIMessage.Types.ProgramChange:
			listener.emit('program-change', message);
			break;

		case MIDIMessage.Types.ChannelPressure:
			listener.emit('channel-pressure', message);
			break;

		case MIDIMessage.Types.PitchBend:
			listener.emit('pitch-bend', message);
			break;

		default:
			listener.emit('unknown-command', message);
			break;
	}

	listener.emit('command', message);
}

class MIDIListener extends EventEmitter {
	constructor(access) {
		super();

		let listener = this;

		Object.defineProperties(listener, {
			_MIDIAccess: {
				value: access
			}
		});

		_attachListeners.call(listener);
	}

	get inputs() {
		let listener = this;

		return listener._MIDIAccess.inputs.values();
	}

	get outputs() {
		let listener = this;

		return listener._MIDIAccess.outputs.values();
	}

	send(outputs, commandType, commandArgs, deltaTime) {
		let listener = this;

		assert(_.includes(_.values(MIDIMessage.Types), commandType), 'Command type ' + commandType + ' is not a known command');

		if (_.isUndefined(outputs)) {
			outputs = Array.from(listener.outputs);
		}
		else if (_.isNumber(outputs)) {
			let index = outputs;
			let i = 0;

			outputs = undefined;

			for (let out of listener.outputs) {
				if (index === i++) {
					outputs = [out];
					break;
				}
			}

			assert(!_.isUndefined(outputs), 'No MIDI output at index ' + index);
		}
		else if (_.isString(outputs)) {
			let id = outputs;
			outputs = undefined;

			for (let out of listener.outputs) {
				if (out.id === id) {
					outputs = [out];
					break;
				}
			}

			assert(!_.isUndefined(outputs), 'No MIDI output with ID ' + id);
		}

		assert(_.every(outputs, o => o instanceof MIDIOutput), 'Outputs must be undefined, an index, an ID or MIDIOutput objects');

		let data = [];

		if (MIDIMessage.isChannelCommand(commandType)) {
			assert('channel' in commandArgs, 'Any channel command must specify its channel');
			data.push(((commandType << 4) | (commandArgs.channel - 1)));
		}
		else {
			data.push(commandType);
		}

		switch (commandType) {
			case MIDIMessage.Types.NoteOff:
			case MIDIMessage.Types.NoteOn:
				assert('note' in commandArgs, 'note required');
				assert('velocity' in commandArgs, 'velocity required');
				data.push(commandArgs.note);
				data.push(commandArgs.velocity);
				break;

			case MIDIMessage.Types.PitchBend:
				assert('pitch-bend' in commandArgs, 'pitch-bend required');
				let bend = commandArgs.bend;
				bend += 0x2000;
				data.push(bend & 0xF, (bend >> 7) | 0xF);
				break;

			case MIDIMessage.Types.ProgramChange:
				assert('program' in commandArgs, 'program required');
				data.push(commandArgs.program);
				break;
		}

		_.each(outputs, o => o.send(data, deltaTime));
	}
}



export default {
	create: function() {
		return _requestMIDIAccess().then(
			function(access) {
				return new MIDIListener(access);
			}
		);
	}
};
