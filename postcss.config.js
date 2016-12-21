const path = require('path');
const webpack = require('webpack');
const config = require('./config');

module.exports = {
	plugins: [
		require('postcss-discard-duplicates'),
		require('autoprefixer')({
			browsers: ['last 2 versions']
		}),
		require('postcss-smart-import')({
			path: [path.join(config.paths.static, 'styles')],
			addDependencyTo: webpack,
			onImport: function onImport() {
				console.log('imported files:', arguments);
			}
		}),
		/*,
		require('postcss-clean')*/
	]
};
