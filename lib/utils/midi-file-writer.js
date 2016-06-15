"use strict";

let fs = require('fs');
let assert = require('assert');
let _ = require('lodash');
let Q = require('q');


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
		let sequence = this;

		sequence._tracks.push(track);
	}

	toBinary() {
		let sequence = this;
		let totalBufferLength = 0;

		let trackBuffers = _.map(
			sequence.tracks,
			function(track) {
				let buffer = track.toBinary();

				totalBufferLength += buffer.length;

				return buffer;
			}
		);

		return Buffer.concat(trackBuffers, totalBufferLength);
	}
}

exports = module.exports = {
	createSequence: function() {
		return new MIDISequence();
	}
};
