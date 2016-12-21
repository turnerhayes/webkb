"use strict";

const path       = require('path');
const fs         = require('fs');
const MIDIParser = require('../lib/utils/midi-file-parser');


function toArrayBuffer(buffer) {
	var ab = new ArrayBuffer(buffer.length);
	var view = new Uint8Array(ab);
	for (var i = 0; i < buffer.length; ++i) {
		view[i] = buffer[i];
	}
	return ab;
}

var buffer = fs.readFileSync(path.resolve('./midi-files/The Beatles - Do You Want To Know A Secret.kar'));

// MIDIParser.parseFromFile(path.resolve('./midi-files/The Beatles - Do You Want To Know A Secret.kar')).then(
MIDIParser.parseFromArrayBuffer(toArrayBuffer(buffer)).then(
	function(file) {
		console.log(JSON.stringify(file, null, '\t'));

		let track = file.tracks[0];
		let event = track.events[Math.floor(track.events.length / 2)];

		// let microseconds = file.ticksToMicroseconds(event.timeStamp, track);
		// let microseconds = file.ticksToMicroseconds(670, track);

		// console.log('microseconds: ', microseconds, '(' + (microseconds / 1e6) + ' seconds)');
	}
).done();