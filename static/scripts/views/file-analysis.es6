"use strict";

import _                from "lodash";
import Backbone         from "backbone";
import MIDIFileParser   from '../../../lib/utils/midi-file-parser';
import MIDIProgramInfo  from '../../../lib/utils/midi-file-parser/midi-programs';
import fileInfoTemplate from '../../templates/partials/file-info.hbs';

let _events = {
	'change .midi-file-upload': '_handleChangeMIDIFileUpload',
};

export default class GameView extends Backbone.View {
	get events() {
		return _events;
	}

	initialize() {
		let view = this;

		super.initialize();

		view._$fileInfoContainer = view.$('.file-information-container');
	}

	_processMIDIFile(file) {
		let view = this;

		let context = {
			numberOfTracks: file.numberOfTracks,
			tracks: _.map(
				file.tracks,
				function(track) {
					return {
						name: track.name,
						instruments: _.map(
							_.filter(
								track.events,
								{type: 'channel', name: 'ProgramChange'}
							),
							(e) => MIDIProgramInfo[e.programNumber]
						),
						textFields: _.reduce(
							_.filter(
								track.events,
								(e) => e.type === 'meta' && e.name !== 'Sequence/Track Name' && e.text
							),
							function(fields, event) {
								if (!fields) {
									fields = {};
								}

								if (event.name in fields) {
									if (!_.isArray(fields[event.name])) {
										fields[event.name] = [fields[event.name]];
									}

									fields[event.name].push(event.text);
								}
								else {
									fields[event.name] = event.text;
								}


								return fields;
							},
							undefined
						),
					};
				}
			)
		};


		view._$fileInfoContainer.html(fileInfoTemplate(context));
	}

	_handleChangeMIDIFileUpload(event) {
		let view = this;

		if (event.target.files.length) {
			let reader = new FileReader();

			reader.onload = function(ev) {
				MIDIFileParser.parseFromArrayBuffer(ev.target.result).done(
					function(file) {
						view._processMIDIFile(file);
					}
				);
			};

			reader.readAsArrayBuffer(event.target.files[0]);
		}
	}
}


