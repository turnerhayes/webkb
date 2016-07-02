"use strict";

import $               from 'jquery';
import _               from 'lodash';
import Q               from 'q';
import SoundfontPlayer from 'soundfont-player';
import InstrumentNames from 'soundfont-player/names/fluidR3';
import MIDINotes       from './midi-notes';

let AudioContext = window.AudioContext || window.webkitAudioContext;

let _instrumentCache = {};

class AudioPlayer {


	constructor() {
		let player = this;

		player._context = new AudioContext();

		player._oscillatorsByNoteAndChannel = {};
	}

	_getInstruments(instrumentIDs, noteNumbers) {
		let player = this;

		return Q.all(
			_.map(
				_.uniq(instrumentIDs),
				function(instrumentID) {
					return Q(
						instrumentID in _instrumentCache ?
							_instrumentCache[instrumentID] :
							SoundfontPlayer.instrument(
								player._context,
								// InstrumentNames[instrumentID],
								'/soundfont-original/' + InstrumentNames[instrumentID] + '-mp3.js',
								{
									// soundfont: 'FluidR3_GM',
									// from: '/soundfont/',
									// notes: noteNumbers,
								}
							).then(
								function(inst) {
									_instrumentCache[instrumentID] = inst;
									
									return inst;
								}
							)
					).then(
						function(inst) {
							return [instrumentID, inst];
						}
					);
				}
			)
		).then(
			function(instrumentPairs) {
				return _.fromPairs(instrumentPairs);
			}
		);
	}

	playInstrument(instrumentID, note, volume, channel, options) {
		let player = this;

		options = options || {};

		return Q(
			SoundfontPlayer.instrument(
				player._context,
				InstrumentNames[instrumentID],
				{
					soundfont: 'FluidR3_GM',
					from: '/soundfonts/'
				}
			).then(
				function(instrument) {
					instrument.play(
						note,
						_.isNumber(options.start) ?
							options.start :
							player._context.currentTime,
						{
							duration: options.duration
						}
					);
				}
			)
		);
	}

	playNotes(notes) {
		let player = this;

		return player._getInstruments(_.map(notes, 'programNumber'), _.map(notes, 'key')).then(
			function(instruments) {
				_.each(
					notes,
					function(note) {
						instruments[note.programNumber].play(
							note.key,
							player._context.currentTime + (note.start || 0),
							{
								duration: note.duration,
								volume: note.volume,
							}
						);
					}
				);
			}
		);
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

export default AudioPlayer;
