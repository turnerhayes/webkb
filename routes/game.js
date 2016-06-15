"use strict";

var express = require('express');
var router  = express.Router();

router.route('/').
	get(function(req, res, next) {
		res.render('game', { title: 'Web KB' });
	}
);

module.exports = router;
