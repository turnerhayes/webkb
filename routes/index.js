"use strict";

var express = require('express');
var router  = express.Router();

router.route('/').
	get(function(req, res, next) {
		res.render('index', { title: 'Web KB' });
	}
);

router.route('/receiver').
	get(function(req, res, next) {
		res.render('partials/midi-receiver', { title: 'Receiver' });
	}
);

router.route('/file-analysis').
	get(function(req, res, next) {
		res.render('partials/file-analysis', { title: 'File Analysis' });
	}
);

router.route('/timeline').
	get(function(req, res, next) {
		res.render('timeline', { title: 'Timeline' });
	}
);

module.exports = router;
