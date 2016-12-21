const _ = require('lodash');
const express = require('express');
const path = require('path');
const favicon = require('static-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const hbs = require('express-hbs');
const debug = require('debug')('webkb:app');

const pagesRoutes = require('./routes/pages');

const app = express();

const distDir = path.join(__dirname, '..', 'dist');
const staticDir = path.join(__dirname, '..', 'public');
const viewPath = path.join(__dirname, 'views');
const layoutsPath = path.join(viewPath, 'layouts');

// view engine setup
app.set('views', viewPath);
app.engine('hbs', hbs.express4({
	partialsDir: viewPath,
	layoutsDir: layoutsPath,
	defaultLayout: path.join(layoutsPath, 'index.hbs')
}));
app.set('view engine', 'hbs');

const IS_DEVELOPMENT = app.get('env') !== 'production';

app.locals.IS_DEVELOPMENT = IS_DEVELOPMENT;

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('less-middleware')({ src: staticDir }));
// app.use('/static/', express.static(distDir));

if (IS_DEVELOPMENT) {
	const webpack = require('webpack');
	const webpackDevMiddleware = require('webpack-dev-middleware');
	const webpackHotMiddleware = require('webpack-hot-middleware');

	const webpackConfig = require('../webpack.config.js');
	const hotMiddlewareScript = 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=true';

	_.each(
		webpackConfig.entry,
		(entry, key) => {
			if (_.isString(entry)) {
				entry = [entry];
				webpackConfig.entry[key] = entry;
			}

			entry.push(hotMiddlewareScript);
		}
	);

	webpackConfig.plugins.push(
		// Webpack 1.0
		new webpack.optimize.OccurenceOrderPlugin(),
		// Webpack 2.0 fixed this mispelling
		// new webpack.optimize.OccurrenceOrderPlugin(),
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoErrorsPlugin()
    );

	const compiler = webpack(webpackConfig);

	app.use(webpackDevMiddleware(compiler, {
		publicPath: webpackConfig.output.publicPath,
		noInfo: true,
		stats: {
			colors: true
		}
	}));

	app.use(webpackHotMiddleware(compiler));
}

app.use('/', pagesRoutes);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});

/// error handlers

app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: IS_DEVELOPMENT ? err : {}
	});
});


module.exports = app;
