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
				test: /\.less$/,
				loader: ExtractTextPlugin.extract(
					'css-loader?sourceMap!postcss-loader!less-loader?' +
						JSON.stringify({
							sourceMap: true,
							modifyVars: {
								'fa-font-path': '"/static/fonts/font-awesome/"'
							}
						}),
					{
						publicPath: '/static/css'
					}
				)
			},

			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract('css-loader?sourceMap!postcss', {
					publicPath: '/static/css'
				})
			},

			{
				test: /\.json$/,
				loader: 'json-loader'
			},

			{
				test: /\.woff(2)?(\?.*)?$/,
				loader: 'url-loader?limit=10000&mimetype=application/font-woff'
			},

			{
				test: /\.ttf(\?.*)?$/,
				loader: 'file-loader'
			},

			{
				test: /\.eot(\?.*)?$/,
				loader: 'file-loader'
			},

			{
				test: /\.svg(\?.*)?$/,
				loader: 'file-loader'
			}
		]
	},

	plugins: [
		new webpack.ProvidePlugin({
			"React": "react"
		}),

		// jQuery and Tether required by Bootstrap
		new webpack.ProvidePlugin({
			"jQuery": "jquery",
			"$": "jquery"
		}),

		new webpack.ProvidePlugin({
			"Tether": "tether"
		}),

		new webpack.DefinePlugin({
			"IS_DEVELOPMENT": JSON.stringify(config.app.isDevelopment),
		}),

        new ExtractTextPlugin('css/[name].bundle.css', {
            allChunks: true
        })
	],

	resolve: {
		extensions: ['', '.js', '.jsx', '.json', '.less', '.css'],
		root: [
			config.paths.static,
			path.join(config.paths.static, 'styles')
		]
	},

	node: {
		Buffer: true,
		fs: 'empty',
		assert: true,
		events: true
	},

	// devtool: "source-map"
	devtool: "cheap-eval-source-map"
};
