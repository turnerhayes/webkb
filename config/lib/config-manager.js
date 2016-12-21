const _ = require('lodash');
const pathsConfig = require('../paths');

class ConfigManager {
	constructor() {
		const props = {};

		const paths = {};

		Object.defineProperties(this, {
			paths: {
				enumerable: true,
				configurable: true,
				value: paths
			}
		});

		Object.defineProperties(
			paths,
			_.reduce(pathsConfig, (props, path, key) => {
				props[key] = {
					enumerable: true,
					configurable: true,
					value: path
				};

				return props;
			}, {})
		);
	}
}

module.exports = new ConfigManager();
