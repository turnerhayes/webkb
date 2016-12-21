const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const debug = require('debug')('webkb:webpack');
const config = require('./config/lib/config-manager');

const distDir = path.join(__dirname, 'dist');

const pageStartupDir = path.join(__dirname, 'static', 'scripts', 'page-startup');

const entries = {};

const jsxFilenameRegex = /\.jsx?$/;

_.each(
	fs.readdirSync(pageStartupDir),
	file => {
		if (jsxFilenameRegex.test(file)) {
			entries[file.replace(jsxFilenameRegex, '')] = [
				path.join(pageStartupDir, file)
			]
		}
	}
);

debug('Entry points: ', entries);

module.exports = {
	entry: entries,

	output: {
		path: distDir,
		publicPath: '/static/',
		filename: 'js/[name].bundle.js'
	},

	module: {
		loaders: [
			{
				test: jsxFilenameRegex,
				exclude: /node_modules/,
				loader: 'babel-loader'
			},

			{
				test: /\.scss$/,
				loader: ExtractTextPlugin.extract('css!postcss!sass-loader-once', {
					publicPath: '/static/css'
				})
			}
		]
	},

	plugins: [
		new webpack.ProvidePlugin({
			"React": "react"
		}),


        new ExtractTextPlugin('css/[name].bundle.css', {
            allChunks: true
        })
	],

	resolve: {
		extensions: ['', '.js', '.jsx', '.scss', '.css'],
		root: [config.paths.static, path.join(config.paths.static, 'styles')]
	},

	devtool: "source-map"
};
