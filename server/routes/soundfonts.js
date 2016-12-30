const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const express = require('express');
const JSZip = require('jszip');

const router = express.Router();

const soundfontPath = path.resolve(__dirname, '..', '..', 'soundfonts', 'FluidR3_GM');

router.route('/:instrument')
	.get(function(req, res, next) {
		const instrumentName = req.param('instrument');
		let notes;

		if (req.query.notes) {
			notes = req.query.notes;
			if (!_.isArray(notes)) {
				notes = [notes];
			}

			notes = notes.map(
				function(noteName) {
					return noteName.toUpperCase();
				}
			);
		}

		const zip = new JSZip();

		const instrumentPath = path.join(soundfontPath, instrumentName + '-mp3');

		fs.readdir(instrumentPath, function(err, files) {
			if (err) {
				next(err);
				return;
			}

			for (let i = 0, len = files.length; i < len; i++) {
				const filename = files[i];

				if (notes && notes.length) {
					const noteName = path.basename(filename, '.mp3').toUpperCase();

					if (!_.includes(notes, noteName)) {
						continue;
					}
				}

				try {
					const filePath = path.join(instrumentPath, filename);
					zip.file(
						instrumentName + '/' + filename,
						fs.readFileSync(filePath),
						{
							binary: true,
							date: fs.statSync(filePath).mtime
						}
					);
				}
				catch (ex) {
					next(ex);
					return;
				}
			}

			zip.generateAsync({type: 'nodebuffer'}).then(
				function(result) {
					res.type('application/zip');

					res.send(result);
				}
			);
		});
	});

module.exports = router;
