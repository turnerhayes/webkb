const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');
const express = require('express');
const JSZip = require('jszip');

const router = express.Router();

const soundfontPath = path.resolve(__dirname, '..', '..', 'soundfonts', 'FluidR3_GM');

const flatRegex = /^([A-Z])b(\d)$/;
const noteNameList = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function getSharpsFromFlat(flat) {
	const matches = flatRegex.exec(flat);

	if (matches) {
		const noteName = matches[1].toUpperCase();
		let octaveNumber = Number(matches[2]);
		const noteIndex = noteNameList.indexOf(noteName);
		const nextNoteIndex = (noteIndex + 1) % noteNameList.length;

		const nextNote = noteNameList[nextNoteIndex];
		if (nextNoteIndex < noteIndex) {
			octaveNumber += 1;
		}

		return [
			nextNote + '#' + octaveNumber,
			nextNote + '♯' + octaveNumber
		];
	}
	else {
		return [];
	}
}

const validNoteMapPromise = fs.readdirAsync(soundfontPath).then(
	files => {
		const instrumentNotes = {};

		return Promise.all(
			files.map(
				file => {
					const instrumentPath = path.join(soundfontPath, file);
					return fs.statAsync(instrumentPath).then(
						stat => {
							if (!stat.isDirectory()) {
								return;
							}

							const instrumentName = file.replace(/-mp3$/, '');

							instrumentNotes[instrumentName] = {};

							return fs.readdirAsync(instrumentPath).then(
								files => files.forEach(
									file => {
										if (!/\.mp3$/.test(file)) {
											return;
										}

										const note = file.replace(/\.mp3$/, '');

										const notePath = path.join(instrumentPath, file);

										instrumentNotes[instrumentName][note] = notePath;

										getSharpsFromFlat(note).forEach(
											sharp => instrumentNotes[instrumentName][sharp] = notePath
										);
									}
								)
							);
						}
					)
				}
			)
		).then(() => instrumentNotes);
	}
);



function instrumentNameToFolderName(instrumentName) {
	return instrumentName.toLowerCase().replace(/[\(\)]/g, '').replace(/-/g, '').replace(/\W+/g, '_');
}


const sharpNoteRegex = /^([a-g])[#♯](\d+)$/i;

function normalizeNotes(notes) {
	if (!notes) {
		return notes;
	}

	return notes.map(
		note => {
			// Transform sharp into flat
			const matches = sharpNoteRegex.exec(note);

			if (matches) {
				const note = matches[1].toUpperCase();
				const octaveNumber = Number(matches[2]);
				const originalNoteIndex = noteNameList.indexOf(note);

				const nextNoteIndex = (originalNoteIndex + 1) % noteNameList.length;

				return noteNameList[nextNoteIndex] + 'b' +
					(nextNoteIndex < originalNoteIndex ? (octaveNumber + 1) : octaveNumber);
			}

			return note;
		}
	);
}

function findInvalidNotes(notes) {
	const invalidNotes = {};

	return validNoteMapPromise.then(
		validNotes => {
			// console.log('valid notes:', validNotes);
			// console.log('notes to check: ', notes);
			_.each(
				notes,
				(instrumentNotes, instrument) => {
					const instrumentFolder = instrumentNameToFolderName(instrument);

					if (!(instrumentFolder in validNotes)) {
						console.log(instrument + ' is not a valid instrument');
						invalidNotes[instrument] = instrumentNotes;
						return;
					}

					_.each(
						instrumentNotes,
						note => {
							if (!validNotes[instrumentFolder][note]) {
								console.log(instrument +'/' + note + ' is not a valid note');
								invalidNotes[instrument] = invalidNotes[instrument] || [];
								invalidNotes[instrument].push(note);
							}
						}
					);
				}
			);

			return invalidNotes;
		}
	);
}

function generateZip(instrumentMap) {
	const zip = new JSZip();

	return Promise.all(
		_.map(
			instrumentMap,
			(notes, instrument) => {
				const normalizedNoteMap = normalizeNotes(notes);
				const instrumentPath = path.join(soundfontPath, instrumentNameToFolderName(instrument) + '-mp3');

				return fs.readdirAsync(instrumentPath)
					.then(
						files => {
							for (let i = 0, len = files.length; i < len; i++) {
								const filename = files[i];

								if (notes && notes.length) {
									const noteName = path.basename(filename, '.mp3');

									if (!_.includes(normalizedNoteMap, noteName)) {
										continue;
									}
								}

								const filePath = path.join(instrumentPath, filename);

								zip.file(
									instrument + '/' + filename,
									fs.readFileSync(filePath),
									{
										binary: true,
										date: fs.statSync(filePath).mtime
									}
								);
							}
						}
					)
			}
		)
	).then(
		() => validNoteMapPromise
	).then(
		validNotes => {
			zip.file(
				'instrument-map.json',
				JSON.stringify(validNotes),
				{
					binary: false
				}
			)
		}
	).then(
		() => zip.generateAsync({type: 'nodebuffer'})
	)
}

router.route('/instruments')
	.get(function(req, res, next) {
		const instruments = req.query.instruments.split(',');
		const notes = req.query.notes ? req.query.notes.split(',') : undefined;

		generateZip(
			instruments.reduce(
				(map, instrument) => {
					map[instrument] = notes;

					return map;
				},
				{}
			)
		).then(
			result => {
				res.type('application/zip').send(result);
			}
		).catch(
			ex => next(ex)
		);
	})
	.post(function(req, res, next) {
		const instrumentMap = req.body.notes;

		findInvalidNotes(instrumentMap).then(
			invalidNotes => {
				if (!_.isEmpty(invalidNotes)) {
					res.status(404).json({
						invalidNotes: invalidNotes
					});
				}
				else {
					generateZip(instrumentMap).then(
						result => res.type('application/zip').send(result)
					).catch(ex => next(ex));
				}
			}
		);

	});

router.route('/:instrument')
	.get(function(req, res, next) {
		const instrumentName = req.param('instrument');
		const notes = req.query.notes ? req.query.notes.split(',') : undefined;

		const instrumentMap = {};

		instrumentMap[instrumentName] = notes;

		generateZip(instrumentMap).then(
			function(result) {
				res.type('application/zip').send(result);
			}
		).catch(
			function(ex) {
				next(ex);
			}
		);
	});

module.exports = router;
