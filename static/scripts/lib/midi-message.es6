"use strict";

import _            from 'lodash';
import MIDIPrograms from "../../../lib/utils/midi-file-parser/midi-programs";

const COMMAND_TYPES = {
	NoteOff: 0x8,
	NoteOn: 0x9,
	PolyphonicKeyPressure: 0xA,
	ControlChange: 0xB,
	ProgramChange: 0xC,
	ChannelPressure: 0xD,
	PitchBend: 0xE
};

const COMMAND_TYPE_NAMES = _.invert(COMMAND_TYPES);


export default class MIDIMessage {
	static get Types() {
		return COMMAND_TYPES;
	}

	static get CommandNames() {
		return COMMAND_TYPE_NAMES;
	}

	static isChannelCommand(commandType) {
		return 0x8 <= commandType <= 0xE;
	}

	static parse(data) {
		var command = data[0] >> 4;

		// Certain controllers (e.g. Casio WK-1300) seem to send a note-on command with velocity
		// 0 in place of a note-off
		if (command === MIDIMessage.Types.NoteOn && data[2] === 0) {
			command = MIDIMessage.Types.NoteOff;
		}

		switch (command) {
			case COMMAND_TYPES.NoteOff:
				return {
					command: {
						name: COMMAND_TYPE_NAMES[command],
						type: command
					},
					note: data[1],
					velocity: data[2],
					channel: data[0] & 0xF
				};
			
			case COMMAND_TYPES.NoteOn:
				return {
					command: {
						name: COMMAND_TYPE_NAMES[command],
						type: command
					},
					note: data[1],
					velocity: data[2],
					channel: data[0] & 0xF
				};
			
			case COMMAND_TYPES.PolyphonicKeyPressure:
				return {
					command: {
						name: COMMAND_TYPE_NAMES[command],
						type: command
					},
					note: data[1],
					pressure: data[2],
					channel: data[0] & 0xF
				};
			
			case COMMAND_TYPES.ControlChange:
				return {
					command: {
						name: COMMAND_TYPE_NAMES[command],
						type: command
					},
					controller: {
						number: data[1],
						value: data[2]
					},
					channel: data[0] & 0xF
				};
			
			case COMMAND_TYPES.ProgramChange:
				let programNumber = data[1];

				return {
					command: {
						name: COMMAND_TYPE_NAMES[command],
						type: command
					},
					program: {
						number: programNumber,
						name: MIDIPrograms[programNumber].name,
						category: MIDIPrograms[programNumber].category
					},
					channel: data[0] & 0xF
				};
			
			case COMMAND_TYPES.ChannelPressure:
				return {
					command: {
						name: COMMAND_TYPE_NAMES[command],
						type: command
					},
					pressure: data[1],
					channel: data[0] & 0xF
				};

			case COMMAND_TYPES.PitchBend:
				return {
					command: {
						name: COMMAND_TYPE_NAMES[command],
						type: command
					},
					value: (data[2] << 7 | data[1]) - 0x2000,
					channel: data[0] & 0xF
				};

			default:
				return {
					command: {
						name: undefined,
						type: command
					},
					data: data.toArray()
				};
		}
	}
}
