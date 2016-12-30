const _ = require('lodash');
const express = require('express');
const path = require('path');
const favicon = require('static-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const hbs = require('express-hbs');
const debug = require('debug')('webkb:app');
const config = require('../config');

const pagesRoutes = require('./routes/pages');
const soundfontsRoutes = require('./routes/soundfonts');

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

app.locals.IS_DEVELOPMENT = config.app.isDevelopment;

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());


// In development, we will use the webpack middleware
if (config.app.isDevelopment) {
	const webpack = require('webpack');
	const webpackDevMiddleware = require('webpack-dev-middleware');
	const webpackHotMiddleware = require('webpack-hot-middleware');

	const webpackConfig = require('../webpack.config.js');
	const hotMiddlewareScript = 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=true';

	_.each(
		webpackConfig.entry,
		(entry, key) => {
			if (_.isString(entry)) {
				webpackConfig.entry[key] = entry = [entry];
			}

			entry.push(hotMiddlewareScript);

			entry.unshift('react-hot-loader/patch');
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
// In production, serve resources pre-built by webpack
else {
	app.use('/static/', express.static(distDir));
}

app.use(
	'/static/fonts/font-awesome',
	express.static(
		path.resolve(__dirname, '..', 'node_modules', 'font-awesome', 'fonts'),
		{
			fallthrough: false
		}
	)
);

app.use('/', pagesRoutes);
app.use('/soundfonts/', soundfontsRoutes);

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
		error: config.app.isDevelopment ? err : {}
	});
});


module.exports = app;
