"use strict";

let _            = require('lodash');
let assert       = require('assert');
let MIDIPrograms = require('../../midi-programs');

const META_TEXT_EVENT_NAMES = [
	'Text',
	'Copyright Notice',
	'Sequence/Track Name',
	'Instrument Name',
	'Lyric',
	'Marker',
	'Cue Point',
];

const MESSAGE_TYPE_NAMES_TO_NUMBERS = {
	'NoteOff': 0x80,
	'NoteOn': 0x90,
	'PolyphonicKeyPressure': 0xA0,
	'ControllerChange': 0xB0,
	'ProgramChange': 0xC0,
	'ChannelKeyPressure': 0xD0,
	'PitchBend': 0xE0,
};


const MESSAGE_TYPE_NUMBERS_TO_NAMES = _.invert(MESSAGE_TYPE_NAMES_TO_NUMBERS);


const KEY_NUMBER_TO_NAME = [
	// 1st octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 2nd octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 3rd octave 
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 4th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 5th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 6th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 7th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 8th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 9th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 10th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 11th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
	'G♯',
	'A',
	'A♯',
	'B',
	// 12th octave
	'C',
	'C♯',
	'D',
	'D♯',
	'E',
	'F',
	'F♯',
	'G',
];


function _toVariableLength(value) {
	let output = [];
	let firstByte = true;
	let lsb = 0;

	do {
		lsb = value & 0x7F;

		if (!firstByte) {
			// There is a byte after this; set continuation bit
			lsb = lsb | 0x80;
		}
		else {
			firstByte = false;
		}

		output.push(lsb);
		
		value = value >> 7;
	} while (value > 0);

	return _.reverse(output);
}


function _validateEvent(args) {
	assert(_.has(args, 'deltaTime'), 'Must specify deltaTime property');

	switch (args.type) {
		case 'channel':
			assert(_.has(args, 'channel'), 'Channel events require a channel property');

			if (args.name === 'NoteOn' || args.name === 'NoteOff') {
				assert(_.has(args, 'key'), 'NoteOn/NoteOff requires a key property');
				assert(_.has(args, 'velocity'), 'NoteOn/NoteOff requires a velocity property');
			}
			else if (args.name === 'PolyphonicKeyPressure') {
				assert(_.has(args, 'key'), 'PolyphonicKeyPressure requires a key property');
				assert(_.has(args, 'pressure'), 'PolyphonicKeyPressure requires a pressure property');
			}
			else if (args.name === 'ControllerChange') {
				assert(_.has(args, 'controllerNumber'), 'ControllerChange requires a controllerNumber property');
				assert(_.has(args, 'controllerValue'), 'ControllerChange requires a controllerValue property');
			}
			else if (args.name === 'ProgramChange') {
				assert(_.has(args, 'programNumber'), 'ProgramChange requires a programNumber property');
			}
			else if (args.name === 'ChannelKeyPressure') {
				assert(_.has(args, 'pressure'), 'ChannelKeyPressure requires a pressure property');
			}
			else if (args.name === 'PitchBend') {
				assert(_.has(args, 'bend'), 'PitchBend requires a bend property');
			}

			break;
	}
}

class MIDIEvent {
	static get META_TEXT_EVENT_NAMES() {
		return META_TEXT_EVENT_NAMES;
	}

	static get MESSAGE_TYPE_NUMBERS_TO_NAMES() {
		return MESSAGE_TYPE_NUMBERS_TO_NAMES;
	}

	static get MESSAGE_TYPE_NAMES_TO_NUMBERS() {
		return MESSAGE_TYPE_NAMES_TO_NUMBERS;
	}

	constructor(args) {
		_validateEvent(args);

		let event = this;

		let props = _.reduce(
			args,
			function(props, value, prop) {
				props[prop] = {
					enumerable: true,
					value: value
				};

				return props;
			},
			{}
		);

		if (args.type === 'channel') {
			if (args.name === 'ProgramChange') {
				props.program = {
					enumerable: true,
					value: {
						number: args.programNumber,
						name: MIDIPrograms[args.programNumber].name,
						category: MIDIPrograms[args.programNumber].category,
					},
				};
			}
			else if (args.name === 'NoteOn' || args.name === 'NoteOff') {
				props.keyName = {
					enumerable: true,
					value: KEY_NUMBER_TO_NAME[args.key],
				};
			}
		}

		Object.defineProperties(event, props);
	}

	toBinary() {
		let event = this;

		let bytes = _toVariableLength(event.deltaTime);

		if (event.type === 'channel') {
			let eventTypeByte = MESSAGE_TYPE_NAMES_TO_NUMBERS[event.name];

			eventTypeByte = eventTypeByte | event.channel;

			bytes.push(eventTypeByte);

			let dataBytes;

			switch (event.name) {
				// Intentional fall-through
				case 'NoteOff':
				case 'NoteOn':
					dataBytes = [event.key, event.velocity];
					break;

				case 'PolyphonicKeyPressure':
					dataBytes = [event.key, event.pressure];
					break;

				case 'ControllerChange':
					dataBytes = [event.controllerNumber, event.controllerValue];
					break;

				case 'ProgramChange':
					dataBytes = [event.programNumber];
					break;

				case 'ChannelKeyPressure':
					dataBytes = [event.pressure];
					break;

				case 'PitchBend':
					dataBytes = [event.bend];
					break;
			}

			bytes = _.concat(bytes, dataBytes);
		}

		return new Buffer(bytes);
	}
}


exports = module.exports = MIDIEvent;
