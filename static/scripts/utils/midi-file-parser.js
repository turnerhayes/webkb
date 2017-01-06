"use strict";

const fs = require('fs');
const assert = require('assert');
const _ = require('lodash');
const Q = require('q');
const debug = require('debug')('midi-parser');
const BufferReader = require('buffer-reader');
const MIDIFile = require('./midi-file-parser/midi-file');
const MIDIFileEvent = require('./midi-file-parser/midi-file/event');


function _readHeaderChunk(reader) {
	// read length
	reader.nextUInt32BE();

	let format = reader.nextUInt16BE();

	let numberOfTracks = reader.nextUInt16BE();

	let division = reader.nextUInt16BE();

	let divisionType = division >> 15;

	let chunk = {
		isHeader: true,
		format: format,
		numberOfTracks: numberOfTracks,
		divisionType: divisionType,
	};

	let divisionData = division & 0x7FFF;

	if (divisionType === MIDIFile.DIVISION_TYPE.TICKS_PER_QUARTER_NOTE) {
		chunk.ticksPerQuarterNote = divisionData;
	}
	else {
		chunk.negativeSMPTE = divisionData >> 8;
		chunk.ticksPerFrame = divisionData & 0xFF;
	}

	return chunk;
}

function _parseSysexEvent(eventByte, reader) {
	let length = _readVariableLengthValue(reader);

	if (eventByte === 0xF0) {
		// 0xF0 sysex events include a leading 0xF0 byte
		reader.move(-1);
		length += 1;
	}

	let eventData = reader.nextBuffer(length);

	return {
		type: 'sysex',
		data: eventData,
	};
}

function _readTextMetaEvent(eventType, reader) {
	let length = _readVariableLengthValue(reader);

	return {
		name: MIDIFileEvent.META_TEXT_EVENT_NAMES[eventType - 1], // events start at 0x01
		text: reader.nextString(length, 'ascii'),
	};
}

function _parseMetaEvent(eventByte, reader) {
	let eventType = reader.nextUInt8();

	let eventData = {};
	
	switch (eventType) {
		case 0x00:
			assert(reader.nextUInt8() === 0x02, 'Sequence Number meta event must be followed with a 0x02 byte');
			eventData.name = 'Sequence Number';
			eventData.sequenceNumber = reader.nextUInt16BE();
			break;

		case 0x01: // intentional fallthrough
		case 0x02:
		case 0x03:
		case 0x04:
		case 0x05:
		case 0x06:
		case 0x07:
			eventData = _readTextMetaEvent(eventType, reader);
			break;

		// Possibly obsolete
		case 0x20:
			assert(reader.nextUInt8() === 0x01, 'MIDI Channel Prefix meta event must be followed with a 0x01 byte');
			eventData.name = 'MIDI Channel Prefix';
			eventData.channel = reader.nextUInt8();
			assert(eventData.channel <= 0x0F, 'Channel must be between 0 and 16');
			break;

		// Possibly obsolete
		case 0x21:
			assert(reader.nextUInt8() === 0x01, 'MIDI Port meta event must be followed with a 0x01 byte');
			eventData.name = 'MIDI Port';
			eventData.port = reader.nextUInt8();
			break;

		case 0x2F:
			let nextByte = reader.nextUInt8();
			assert(nextByte === 0x00, 'End of Track meta event must be followed with a 0x00 byte; got a 0x' + nextByte.toString(16));
			eventData.name = 'End of Track';
			break;

		case 0x51:
			assert(reader.nextUInt8() === 0x03, 'Set Tempo meta event must be followed with a 0x03 byte');
			eventData.name = 'Set Tempo';
			eventData.tempo = (reader.nextUInt16BE() << 8) | reader.nextUInt8(); // 24 bit integer
			break;

		case 0x54: 
			assert(reader.nextUInt8() === 0x05, 'SMPTE Offset meta event must be followed with a 0x05 byte');
			eventData.name = 'SMPTE Offset';
			eventData.hours = reader.nextUInt8();
			eventData.minutes = reader.nextUInt8();
			eventData.seconds = reader.nextUInt8();
			eventData.frames = reader.nextUInt8();
			eventData.fractionalFrames = reader.nextUInt8();
			break;

		case 0x58:
			assert(reader.nextUInt8() === 0x04, 'Time Signature meta event must be followed with a 0x04 byte');
			eventData.name = 'Time Signature';
			eventData.numberator = reader.nextUInt8();
			eventData.denominator = Math.pow(2, reader.nextUInt8());
			eventData.MIDIClocksPerTick = reader.nextUInt8();
			eventData.thirtySecondNotes = reader.nextUInt8();
			break;

		case 0x59:
			assert(reader.nextUInt8() === 0x02, 'Key Signature meta event must be followed with a 0x02 byte');
			eventData.name = 'Key Signature';
			eventData.sharpsAndFlats = reader.nextInt8();
			eventData.minor = !!reader.nextUInt8();
			break;

		case 0x7F:
			let length = _readVariableLengthValue(reader);
			eventData.name = 'Sequencer-Specific Meta-event';
			let idByte = reader.nextUInt8();
			let id;
			let idLength = 1;

			if (idByte === 0x00) {
				id = reader.nextUInt16BE();
				idLength += 2;
			}
			else {
				id = idByte;
			}

			eventData.id = id;
			eventData.data = reader.nextBuffer(length - idLength);
			break;

		default:
			eventData.name = undefined;
			eventData.type = eventType;
			break;
	}

	eventData.type = 'meta';

	return eventData;
}

function _parseChannelEvent(eventByte, reader) {
	let eventData = {
		channel: eventByte & 0x0F,
		name: MIDIFileEvent.MESSAGE_TYPE_NUMBERS_TO_NAMES[eventByte & 0xF0],
	};

	switch (eventByte & 0xF0) {
		// Intentional fallthrough
		case MIDIFileEvent.MESSAGE_TYPE_NAMES_TO_NUMBERS.NoteOff:
		case MIDIFileEvent.MESSAGE_TYPE_NAMES_TO_NUMBERS.NoteOn:
			eventData.key = reader.nextUInt8();
			eventData.velocity = reader.nextUInt8();

			if (eventData.velocity === 0) {
				eventData.name = 'NoteOff';
			}
			break;

		case MIDIFileEvent.MESSAGE_TYPE_NAMES_TO_NUMBERS.PolyphonicKeyPressure:
			eventData.key = reader.nextUInt8();
			eventData.pressure = reader.nextUInt8();
			break;

		case MIDIFileEvent.MESSAGE_TYPE_NAMES_TO_NUMBERS.ControllerChange:
			eventData.controllerNumber = reader.nextUInt8();
			eventData.controllerValue = reader.nextUInt8();
			break;

		case MIDIFileEvent.MESSAGE_TYPE_NAMES_TO_NUMBERS.ProgramChange:
			eventData.programNumber = reader.nextInt8();
			break;

		case MIDIFileEvent.MESSAGE_TYPE_NAMES_TO_NUMBERS.ChannelKeyPressure:
			eventData.pressure = reader.nextUInt8();
			break;

		case MIDIFileEvent.MESSAGE_TYPE_NAMES_TO_NUMBERS.PitchBend:
			eventData.bend = reader.nextUInt16LE();
			break;
	}

	eventData.type = 'channel';

	return eventData;
}

function _readTrackChunk(reader) {
	const length = reader.nextUInt32BE();

	const events = [];

	const initialPosition = reader.tell();

	let runningStatus;

	const chunkBuffer = reader.nextBuffer(length);

	const chunkReader = new BufferReader(chunkBuffer);

	while (chunkReader.tell() < length) {
		const eventChunk = _readEvent(chunkReader, runningStatus);

		runningStatus = eventChunk.runningStatus;

		delete eventChunk.runningStatus;

		events.push(eventChunk);
	}

	if (chunkReader.tell() < length) {
		// there are still bytes left unread--something has gone wrong
		const err = new Error('Chunk buffer was not exhausted; ' + (length - chunkReader.tell()) + ' bytes left');

		err.remainingBytes = chunkReader.restAll();

		throw err;
	}

	return events;
}

function _readVariableLengthValue(reader) {
	let value = 0;
	let b;

	do {
		b = reader.nextUInt8();

		value = (value << 7) | (b & 0x7F);
	} while (b & 0x80);

	return value;
}

function _readEvent(reader, runningStatus) {
	let deltaTime = _readVariableLengthValue(reader);

	let eventByte = reader.nextUInt8();

	let event;

	if (eventByte < 0x80 && !_.isUndefined(runningStatus)) {
		// Running status used; eventByte is actually the first
		// byte of the data.
		reader.move(-1);
		event = _parseChannelEvent(runningStatus, reader);
	}
	else if (0x80 <= eventByte && eventByte < 0xF0) {
		event = _parseChannelEvent(eventByte, reader);

		runningStatus = eventByte;
	}
	else if (eventByte === 0xF0 || eventByte === 0xF7) {
		event = _parseSysexEvent(eventByte, reader);
	}
	else if (eventByte === 0xFF) {
		event = _parseMetaEvent(eventByte, reader);
	}
	else {
		throw new Error('Unknown event byte: ' + eventByte.toString(16));
	}

	event.deltaTime = deltaTime;

	event.runningStatus = runningStatus;

	return event;
}

function _readChunk(reader) {
	let chunkType = reader.nextString(4, 'ascii');

	if (chunkType === 'MThd') {
		return _readHeaderChunk(reader);
	}
	else if (chunkType === 'MTrk') {
		return _readTrackChunk(reader);
	}
	else {
		throw new Error('Unknown chunk header: ' + chunkType);
	}
}

function parse(buffer) {
	let reader = new BufferReader(buffer);

	let file = {
		header: undefined,
		tracks: []
	};

	let chunk = _readChunk(reader);

	if (chunk.isHeader) {
		file.header = chunk;
		delete chunk.isHeader;
	}

	if (_.isUndefined(file.header)) {
		throw new Error('MIDI file has no header data.');
	}

	for (let i = 0, len = file.header.numberOfTracks; i < len; i++) {
		file.tracks.push(_readChunk(reader));
	}

	if (reader.tell() < buffer.byteLength) {
		debug('File has bytes left over. This should not happen. Bytes are: ', reader.restAll());
	}

	return new MIDIFile(file);
}


exports = module.exports = Object.create(null, {
	parseFromFile: {
		value: function(path) {
			let deferred = Q.defer();

			fs.readFile(path, function(err, buffer) {
				if (err) {
					deferred.reject(err);
					return;
				}

				deferred.resolve(parse(buffer));
			});

			return deferred.promise;
		}
	},

	parseFromArrayBuffer: {
		value: function(buffer) {
			return Q(parse(new Buffer(new Uint8Array(buffer))));
		}
	}
});
