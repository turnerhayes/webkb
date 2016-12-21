"use strict";

export default class NoMIDIError extends Error {
	constructor() {
		super('No MIDI access is available');
	}
}
