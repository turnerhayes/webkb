"use strict";

import $         from 'jquery';
import _         from 'lodash';
import MIDINotes from './midi-notes';

var AudioContext = window.AudioContext || window.webkitAudioContext;


export default class AudioPlayer {
	constructor() {
		let player = this;

		player._context = new AudioContext();

		player._oscillatorsByNoteAndChannel = {};
	}

	playNote(note, volume, channel, durationInMilliseconds) {
		let player = this;

		let noteKey = player._getNoteKey(note, channel);

		if (noteKey in player._oscillatorsByNoteAndChannel) {
			return;
		}

		player.stopNote();

		let oscillator = player._context.createOscillator();

		oscillator.type = 'sine';

		oscillator.frequency.value = MIDINotes[note];

		if (volume) {
			let gainNode = player._context.createGain();

			oscillator.connect(gainNode);
			gainNode.gain.value = volume / 100;
			gainNode.connect(player._context.destination);
		} else {
			oscillator.connect(player._context.destination);
		}

		oscillator.start(0);

		player._oscillatorsByNoteAndChannel[noteKey] = oscillator;

		if (!_.isUndefined(durationInMilliseconds)) {
			setTimeout(
				function() {
					player.stopNote(note, channel);
				},
				durationInMilliseconds
			);
		}
	}

	stopNote(note, channel) {
		let player = this;

		let noteKey = player._getNoteKey(note, channel);

		if (!(noteKey in player._oscillatorsByNoteAndChannel)) {
			return;
		}

		player._oscillatorsByNoteAndChannel[noteKey].stop();
		player._oscillatorsByNoteAndChannel[noteKey].disconnect();

		delete player._oscillatorsByNoteAndChannel[noteKey];
	}

	_getNoteKey(note, channel) {
		return note + '-' + channel;
	}
}
