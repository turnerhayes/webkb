"use strict";

const _     = require('lodash');
const Track = require('./midi-file/track');


const FILE_FORMAT = {
	SINGLE_MULTI_CHANNEL_TRACK: 0,
	SIMULTANEOUS_SEQUENCE_TRACKS: 1,
	INDEPENDENT_SINGLE_TRACKS: 2,
};

const DIVISION_TYPE = {
	TICKS_PER_QUARTER_NOTE: 0,
	SMPTE_TIME_CODE: 1,
};

const DEFAULT_TEMPO = 5e5;

function _setOffsets(args) {
	let maxOffset = 0;

	_.each(
		args.tracks,
		function(track) {
			let previousTimeValue = 0;
			let microsecondsPerTick = DEFAULT_TEMPO / args.header.ticksPerQuarterNote;

			_.each(
				track,
				function(event) {
					previousTimeValue += microsecondsPerTick * event.deltaTime;

					event.microsecondOffset = previousTimeValue;

					if (event.name === 'Set Tempo') {
						microsecondsPerTick = event.tempo / args.header.ticksPerQuarterNote;
					}

				}
			);

			maxOffset = Math.max(maxOffset, previousTimeValue);
		}
	);

	return maxOffset;
}

exports = module.exports = class MIDIFile {
	static get FILE_FORMAT() {
		return FILE_FORMAT;
	}

	static get DIVISION_TYPE() {
		return DIVISION_TYPE;
	}

	constructor(args) {
		let file = this;

		let fileDurationMilliseconds = _setOffsets({
			header: args.header,
			tracks: args.tracks
		});

		Object.defineProperties(
			file,
			{
				numberOfTracks: {
					enumerable: true,
					value: args.header.numberOfTracks,
				},

				_header: {
					enumerable: true,
					value: args.header,
				},

				tracks: {
					enumerable: true,
					value: args.tracks.map(Track.create),
				},

				duration: {
					enumerable: true,
					value: fileDurationMilliseconds,
				}
			}
		);
	}
};
