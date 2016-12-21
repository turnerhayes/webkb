"use strict";

const assert = require('assert');


const DEFAULT_TEMPO = 5e5;

exports = module.exports = {
	ticksToMicroseconds: function(ticks, ticksPerQuarterNote, tempo) {
		tempo = tempo || DEFAULT_TEMPO;

		assert(ticksPerQuarterNote, 'ticksPerQuarterNote is required');

		return (
			tempo / ticksPerQuarterNote // gives microseconds per tick
		) * ticks;
	},

	microsecondsToTicks: function(microseconds, ticksPerQuarterNote, tempo) {
		tempo = tempo || DEFAULT_TEMPO;

		assert(ticksPerQuarterNote, 'ticksPerQuarterNote is required');

		return microseconds / (
			tempo / ticksPerQuarterNote // gives microseconds per tick
		);
	}
};
