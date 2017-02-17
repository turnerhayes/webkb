#!/usr/bin/env node

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const which = require('which');
const ZLib = require('zlib');
const MIDI = require('midi-node');
const MIDIConstants = require('midi-node/constants');

const debug = require('debug')('webkb:tools:generate-soundfonts');
const argv = require('minimist')(process.argv.slice(2), {
	string: [
		'instruments',
		'output',
		'soundfont',
		'lame',
		'oggenc'
	],
	alias: {
		'i': 'instruments',
		'o': 'output',
		's': 'soundfont'
	},
	default: {
		'instruments': ['1-128'],
		'output': path.resolve(__dirname, '..', '..', 'soundfonts'),
		'soundfont': '/usr/share/sounds/sf2/FluidR3_GM.sf2'
	}
});

// Coerce instruments to an array
argv.instruments = argv.instruments.push ? argv.instruments : [argv.instruments];

const instrumentRangeRegex = /(\d+)\-(\d+)/;

function _parseInstruments(instrument) {
	const instrumentList = [];

	if (instrument.length) {
		let matches = instrumentRangeRegex.exec(instrument);

		if (matches) {
			const rangeStart = Number(matches[1]);
			const rangeEnd = Number(matches[2]);

			instrumentList.push(..._.range(rangeStart, rangeEnd + 1));

			instrument = instrument.substring(0, matches.index) + ',' +
				instrument.substring(matches.index + matches[0].length);

			instrumentList.push(..._parseInstruments(instrument));
		}
		else {
			instrumentList.push(
				...instrument.split(/\s*\,\s*/)
					.filter(i => i.length > 0)
					.map(Number)
			);
		}
	}

	return instrumentList;
}

function parseInstruments(instrument) {
	return _.uniq(_parseInstruments(instrument)).sort((a, b) => a - b);
}

const instrumentNumbers = argv.instruments.reduce(
	(arr, instrument) => {
		arr.push(...parseInstruments(instrument));

		return arr;
	},
	[]
);

const outputDirectory = path.resolve(argv.output);

const lamePath = argv.lame || which.sync('lame');
const oggPath = argv.oggenc || which.sync('oggenc');
const fluidSynthPath = argv.fluidsynth || which.sync('fluidsynth');

const NOTES = {
	"C" : 0,
	"Db": 1,
	"D" : 2,
	"Eb": 3,
	"E" : 4,
	"F" : 5,
	"Gb": 6,
	"G" : 7,
	"Ab": 8,
	"A" : 9,
	"Bb": 10,
	"B" : 11
};

const INVERTED_NOTES = _.invert(NOTES);

const MIDI_C0 = 12;

const TEMP_FILE = path.join(outputDirectory, "temp.mid");

const VELOCITY = 85;

const DURATION = 3000;

const PULSES_PER_QUARTER_NOTE = 480;

debug('Generating soundfont files for instruments: ' + instrumentNumbers.join(', '));
debug('Output directory: ' + outputDirectory);
debug('Using soundfont file: ' + argv.soundfont);
debug(
	'Executable paths: ' + JSON.stringify(
		{
			lame: lamePath,
			ogg: oggPath,
			fluidSynth: fluidSynthPath
		},
		null,
		'\t'
	)
);

function deflate(string, level) {
	const z = ZLib.createDeflate({
		level: level
	});

	return ZLib.deflateSync(
		string,
		{
			level: level
		}
	);
}

function note_to_int(note, octave) {
	const value = NOTES[note];
	const increment = MIDI_C0 + (octave * 12);
	return value + increment;
}

function int_to_note(value) {
	if (value < MIDI_C0) {
		throw new Error("Bad Value");
	}

	value -= MIDI_C0;
	octave = value / 12;
	note = value % 12;
	
	return {
		key: INVERTED_NOTES[note],
		octave: octave
	};
}

function generateMIDI(programNumber, noteValue) {
	const stream = fs.createWriteStream(TEMP_FILE);
	const writer = new MIDI.Writer(stream);

	writer.startFile(0, 1, PULSES_PER_QUARTER_NOTE);
	writer.startTrack(3 + 4 + 4 + 4);
	// writer.event(0, MIDIConstants.PROGRAM_CHANGE, [programNumber & 0xFF00, programNumber & 0xFF]);
	writer.programChange(0, 0, programNumber);
	writer.noteOn(0, 0, noteValue, VELOCITY);
	writer.noteOff(DURATION, 0, noteValue, VELOCITY);
	writer.endOfTrack(0);

	stream.end();
}

generateMIDI(1, 0x3C);
