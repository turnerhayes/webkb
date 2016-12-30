const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('../../config/lib/config-manager');
const pageTitles = require('./utils/page-titles');
const router = express.Router();


const pageStartupDir = path.join(config.paths.static, 'scripts', 'page-startup');

const jsxFilenameRegex = /\.jsx?$/;

_.each(
	fs.readdirSync(pageStartupDir),
	file => {
		if (jsxFilenameRegex.test(file)) {
			let strippedName = file.replace(jsxFilenameRegex, '');

			const bundleName = strippedName;

			if (strippedName === 'home') {
				strippedName = '';
			}

			router.route('/' + strippedName)
				.get(
					function(req, res) {
						res.render('page', {
							title: pageTitles[bundleName],
							req: req,
							bundleName: bundleName
						});
					}
				);
		}
	}
);

module.exports = router;
