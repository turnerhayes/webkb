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


class MIDIListener extends EventEmitter {
	constructor(access) {
		super();

		Object.defineProperties(this, {
			_MIDIAccess: {
				value: access
			}
		});

		this._attachListeners();
	}

	get inputs() {
		return this._MIDIAccess.inputs.values();
	}

	get outputs() {
		return this._MIDIAccess.outputs.values();
	}

	send(outputs, commandType, commandArgs, deltaTime) {
		assert(_.includes(_.values(MIDIMessage.Types), commandType), 'Command type ' + commandType + ' is not a known command');

		if (_.isUndefined(outputs)) {
			outputs = Array.from(this.outputs);
		}
		else if (_.isNumber(outputs)) {
			const index = outputs;
			let i = 0;

			outputs = undefined;

			for (let out of this.outputs) {
				if (index === i++) {
					outputs = [out];
					break;
				}
			}

			assert(!_.isUndefined(outputs), 'No MIDI output at index ' + index);
		}
		else if (_.isString(outputs)) {
			const id = outputs;
			outputs = undefined;

			for (let out of this.outputs) {
				if (out.id === id) {
					outputs = [out];
					break;
				}
			}

			assert(!_.isUndefined(outputs), 'No MIDI output with ID ' + id);
		}

		assert(_.every(outputs, o => o instanceof MIDIOutput), 'Outputs must be undefined, an index, an ID or MIDIOutput objects');

		const data = [];

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
				const bend = commandArgs.bend + 0x2000;
				data.push(bend & 0xF, (bend >> 7) | 0xF);
				break;

			case MIDIMessage.Types.ProgramChange:
				assert('program' in commandArgs, 'program required');
				data.push(commandArgs.program);
				break;
		}

		_.each(outputs, o => o.send(data, deltaTime));
	}

	_onMIDIMessage(msg) {
		// jshint validthis:true
		let message = MIDIMessage.parse(msg.data);

		message.source = _getDeviceInfo(msg.target);

		switch (message.command.type) {
			case MIDIMessage.Types.NoteOff:
				this.emit('note-off', message);
				break;

			case MIDIMessage.Types.NoteOn:
				this.emit('note-on', message);
				break;

			case MIDIMessage.Types.PolyphonicKeyPressure:
				this.emit('polyphonic-key-pressure', message);
				break;

			case MIDIMessage.Types.ControlChange:
				this.emit('control-change', message);
				break;

			case MIDIMessage.Types.ProgramChange:
				this.emit('program-change', message);
				break;

			case MIDIMessage.Types.ChannelPressure:
				this.emit('channel-pressure', message);
				break;

			case MIDIMessage.Types.PitchBend:
				this.emit('pitch-bend', message);
				break;

			default:
				this.emit('unknown-command', message);
				break;
		}

		this.emit('command', message);
	}

	_onStateChange(event) {
		// jshint validthis: true
		let deviceInfo = this._getDeviceInfo(event.port);

		if (event.port.state === "disconnected") {
			this.emit('device-disconnected', deviceInfo);
			return;
		}

		this._attachDeviceListeners(event.port);
	}

	_attachListeners() {
		// jshint validthis: true
		let inputs = this._MIDIAccess.inputs.values();

		for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
			this._attachDeviceListeners(input.value);
		}

		this._MIDIAccess.onstatechange = _.bind(this._onStateChange, this);
	}

	_attachDeviceListeners(device) {
		// jshint validthis: true
		if (device.state === 'connected') {
			this.emit('device-connected', this._getDeviceInfo(device));
		}
		else {
			device.onstatechange = function(event) {
				if (event.port.state === 'connected') {
					this.emit('device-connected', this._getDeviceInfo(event.port));
				}
			};
		}

		device.onmidimessage = _.bind(this._onMIDIMessage, this);
	}

	_getDeviceInfo(device) {
		return {
			name: device.name,
			id: device.id,
			version: device.version
		};
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
