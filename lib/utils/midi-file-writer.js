"use strict";

let fs = require('fs');
let assert = require('assert');
let _ = require('lodash');
let Q = require('q');


const DEFAULT_TICKS_PER_QUARTER_NOTE = 120;
const HEADER_TYPE_BUFFER = new Buffer('MThd', 'ascii');
const HEADER_LENGTH_BUFFER = new Buffer(4);

HEADER_LENGTH_BUFFER.writeUInt32BE(6);

function _generateHeaderBuffer(sequence) {
	const fileFormatBuffer = new Buffer(2);

	fileFormatBuffer.writeUInt16BE(sequence.tracks.length > 1 ? 1 : 0);

	const numberOfTracksBuffer = new Buffer(2);

	numberOfTracksBuffer.writeUInt16BE(sequence.tracks.length);

	// ticks-per-quarter-note timing
	let division = DEFAULT_TICKS_PER_QUARTER_NOTE;

	const divisionBuffer = new Buffer(2);

	divisionBuffer.writeUInt16BE(division);

	return Buffer.concat(
		[
			HEADER_TYPE_BUFFER,
			HEADER_LENGTH_BUFFER,
			fileFormatBuffer,
			numberOfTracksBuffer,
			divisionBuffer,
		],
		HEADER_TYPE_BUFFER.length + HEADER_LENGTH_BUFFER.length + fileFormatBuffer.length +
			numberOfTracksBuffer.length + divisionBuffer.length
	);
}

class MIDISequence {
	get tracks() {
		return this._tracks;
	}

	constructor() {
		let sequence = this;

		Object.defineProperties(
			sequence,
			{
				_tracks: {
					value: []
				}
			}
		);
	}

	writeToFile(filename) {
		let sequence = this;

		let deferred = Q.defer();

		fs.writeFile(
			filename,
			sequence.toBinary(),
			function(err) {
				if (err) {
					deferred.reject(err);
					return;
				}

				deferred.resolve();
			}
		);

		return deferred.promise;
	}

	addTrack(track) {
		const sequence = this;

		sequence._tracks.push(track);
	}

	toBinary() {
		const sequence = this;

		const headerBuffer = _generateHeaderBuffer(sequence);

		let totalBufferLength = headerBuffer.length;

		const trackBuffers = _.map(
			sequence.tracks,
			function(track) {
				let buffer = track.toBinary();

				totalBufferLength += buffer.length;

				return buffer;
			}
		);

		return Buffer.concat([headerBuffer].concat(trackBuffers), totalBufferLength);
	}
}

exports = module.exports = {
	createSequence: function() {
		return new MIDISequence();
	}
};
