import EventEmitter from 'events';
import assert       from 'assert';
import _            from 'lodash';
import Promise      from "bluebird";
import MIDIMessage  from "./midi-message";

function _requestMIDIAccess() {
	return new Promise(
		(resolve, reject) => {
			if (navigator.requestMIDIAccess) {
				navigator.requestMIDIAccess({
					sysex: false
				}).then(
					function(access) {
						resolve(access);
					},
					function(ex) {
						reject(ex);
					}
				);
			}
			else {
				reject();
			}
		}
	);
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

	sendEvent(outputs, event) {
		return this.send(
			outputs,
			event.name,
			event,
			event.deltaTime
		);
	}

	send(outputs, commandType, commandArgs, deltaTime) {
		if (commandArgs.type === 'meta') {
			// TODO: handle meta events
			return;
		}

		assert(commandType in MIDIMessage.Types, 'Command type ' + commandType + ' is not a known command');

		const commandTypeNumber = MIDIMessage.Types[commandType];

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

		if (MIDIMessage.isChannelCommand(commandTypeNumber)) {
			assert('channel' in commandArgs, 'Any channel command must specify its channel');
			data.push(((commandTypeNumber << 4) | commandArgs.channel));
		}
		else {
			data.push(commandTypeNumber);
		}

		switch (MIDIMessage.Types[commandType]) {
			case MIDIMessage.Types.NoteOff:
			case MIDIMessage.Types.NoteOn:
				assert('key' in commandArgs, 'key required');
				assert('velocity' in commandArgs, 'velocity required');
				data.push(commandArgs.key);
				data.push(commandArgs.velocity);
				break;

			case MIDIMessage.Types.PitchBend:
				assert('bend' in commandArgs, 'bend required');
				// const bend = commandArgs.bend + 0x2000;
				data.push(commandArgs.bend & 0xF, (commandArgs.bend >> 7) & 0xF);
				break;

			case MIDIMessage.Types.ProgramChange:
				assert('program' in commandArgs, 'program required');
				data.push(commandArgs.program);
				break;

			case MIDIMessage.Types.ControllerChange:
				assert('controllerNumber' in commandArgs, 'controllerNumber required');
				assert('controllerValue' in commandArgs, 'controllerValue required');
				data.push(commandArgs.controllerNumber);
				data.push(commandArgs.controllerValue);
				break;
		}

		_.each(outputs, o => o.send(data, deltaTime));
	}

	_onMIDIMessage(msg) {
		// jshint validthis:true
		let message = MIDIMessage.parse(msg.data);

		message.source = this._getDeviceInfo(msg.target);

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
