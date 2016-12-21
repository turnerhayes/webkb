"use strict";

let _         = require('lodash');
let MIDIEvent = require('./event');

class Track {
	constructor(events) {
		let track = this;

		events = _.map(events, function(e) {
			return new MIDIEvent(e);
		});

		let trackNameEvent = _.find(
			events,
			(e) => e.name === "Sequence/Track Name"
		);

		if (trackNameEvent) {
			Object.defineProperty(
				track,
				'name',
				{
					enumerable: true,
					value: trackNameEvent.text,
				}
			);
		}

		Object.defineProperties(
			track,
			{
				events: {
					enumerable: true,
					value: events,
				}
			}
		);
	}

	addEvent(event) {
		let track = this;

		track.events.push(event);
	}

	toBinary() {
		let track = this;

		let headerBuffer = Buffer.from('MTrk', 'ascii');

		let eventBuffers = _.map(
			track.events,
			function(event) {
				return event.toBinary();
			}
		);

		let trackLength = _.reduce(
			eventBuffers,
			function(len, buffer) {
				return len + buffer.length;
			},
			0
		);

		let trackLengthBuffer = new Buffer(4);

		trackLengthBuffer.writeUInt32BE(trackLength);

		return Buffer.concat(
			[headerBuffer, trackLengthBuffer].concat(eventBuffers),
			headerBuffer.length + trackLengthBuffer.length + trackLength
		);
	}
}

exports = module.exports = {
	create(args) {
		return new Track(args);
	}
};
