import _       from "lodash";
import Q       from "q";
import axios   from "axios";
import JSZip   from "jszip";
import AudioPlayer from "./player";
import audioContext from "./context";

function _getUncachedNotes(instrumentNotes) {
	return _.reduce(
		instrumentNotes,
		(uncached, notes, instrument) => {
			const missingNotes = _.difference(notes, _.keys(Soundfont._cache[instrument]));

			if (_.size(missingNotes) > 0) {
				uncached[instrument] = missingNotes;
			}

			return uncached;
		},
		{}
	);
}

class Soundfont {
	static _cache = {};

	static player = new AudioPlayer()

	static getNotes(notesToGet) {
		const uncachedNotes = _getUncachedNotes(notesToGet);

		return Q(
			_.isEmpty(uncachedNotes) ?
				undefined :
				axios(
					{
						url: '/soundfonts/instruments',
						method: 'post',
						responseType: 'arraybuffer',
						data: uncachedNotes
					}
				).then(
					response => JSZip.loadAsync(response.data)
				).then(
					result => {
						const promises = [];

						// Iterate over all items that end in a / --that is all folders, no files
						result.folder(/\/$/).forEach(
							folder => {
								const instrumentName = folder.name.replace(/\/$/, '');
								Soundfont._cache[instrumentName] = Soundfont._cache[instrumentName] || {};

								result.folder(instrumentName).forEach(
									(relativePath, fileObj) => {
										promises.push(fileObj.async('arraybuffer')
											.then(
												fileContents => audioContext.decodeAudioData(fileContents)
											).then(
												buffer => {
													Soundfont._cache[instrumentName][relativePath.replace(/\.mp3$/, '')] = buffer;
												}
											)
										);
									}
								)
							}
						);

						return Promise.all(promises);
					}
				)
		).then(
			() => {
				return _.reduce(
					notesToGet,
					(returnedNotes, notes, instrument) => {
						returnedNotes[instrument] = _.pick(Soundfont._cache[instrument], notes);

						return returnedNotes;
					},
					{}
				);
			}
		);
	}
}

export default Soundfont;
