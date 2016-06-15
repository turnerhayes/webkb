"use strict";

var _             = require('lodash');
var express       = require('express');
var path          = require('path');
var fs            = require('fs');
var favicon       = require('serve-favicon');
var debug         = require('debug')('webkb:app');
var mongoose      = require('mongoose');
var logger        = require('morgan');
var cookieParser  = require('cookie-parser');
var bodyParser    = require('body-parser');
var hbs           = require('express-hbs');
var session       = require('./session');
var setupPassport = require('./passport-authentication');

var config = require('./lib/utils/config');

var routes               = require('./routes/index');
var authenticationRoutes = require('./routes/authentication');
var gameRoutes = require('./routes/game');

debug('Connecting to database at ', config.data.store.url);
mongoose.connect(config.data.store.url);
if (process.env.DEBUG_DB) {
	mongoose.set('debug', true);
}

var app = express();

// view engine setup
app.engine('hbs', hbs.express4({
	defaultLayout: path.join(config.paths.templates, 'layout.hbs'),
	partialsDir: config.paths.partials,
}));

hbs.registerHelper(require(path.join(__dirname, "hbs-helpers"))(hbs.handlebars, _));

app.set('views', config.paths.templates);
app.set('view engine', 'hbs');

app.set('env', config.app.environment);
app.locals.IS_DEVELOPMENT = config.app.environment === 'development';

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session.instance);
app.use('/static', express.static(config.paths.static));

setupPassport(app);

app.use('/', routes);
app.use('/auth', authenticationRoutes);
app.use('/game', gameRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers
app.use(function(err, req, res, next) {
	var status = err.status || 500;
	res.status(status);

	res.format({
		json: function() {
			res.json({
				error: err.message
			});
		},
		default: function() {
			var errorTemplateName = path.join('errors', '' + status);
			var errorTemplatePath = path.join(config.paths.templates, errorTemplateName + '.hbs');


			fs.stat(
				errorTemplatePath,
				function(statError) {
					if (statError && statError.code === 'ENOENT') {
						errorTemplateName = 'errors/500';
					}

					res.render(errorTemplateName, {
						req: req,
						message: err.message,
						// no stacktraces leaked to user in production
						error: config.app.environment === 'development' ?
							err :
							{}
					});
				}
			);
		}
	});
});


module.exports = app;
