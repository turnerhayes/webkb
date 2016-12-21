"use strict";

const path       = require('path');
const MIDIWriter = require('../lib/utils/midi-file-writer');
const MIDIParser = require('../lib/utils/midi-file-parser');
const MIDITrack  = require('../lib/utils/midi-file-parser/midi-file/track');
const MIDIEvent  = require('../lib/utils/midi-file-parser/midi-file/event');

const FILENAME = path.join(__dirname, 'out.midi');

var sequence = MIDIWriter.createSequence();

var track = MIDITrack.create();

track.addEvent(
	new MIDIEvent(
		{
			millisecondOffset: 0,
			type: 'channel',
			channel: 1,
			name: 'NoteOn',
			key: 34,
			velocity: 108,
		}
	)
);

track.addEvent(
	new MIDIEvent(
		{
			millisecondOffset: 3e6,
			type: 'channel',
			channel: 1,
			name: 'NoteOff',
			key: 34,
			velocity: 108,
		}
	)
);

sequence.addTrack(track);

sequence.writeToFile(FILENAME);

MIDIParser.parseFromFile(FILENAME).done(
	function(parsed) {
		console.log('parsed: ', JSON.stringify(parsed, null, '\t'));
	}
);
