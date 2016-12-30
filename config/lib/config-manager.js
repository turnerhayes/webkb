const _ = require('lodash');
const pathsConfig = require('../paths');

class ConfigManager {
	constructor() {
		const props = {};

		const paths = {};

		const app = {};

		const environment = process.env.NODE_ENV || "development";

		Object.defineProperties(this, {
			paths: {
				enumerable: true,
				configurable: true,
				value: paths
			},

			app: {
				enumerable: true,
				configurable: true,
				value: app
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

		Object.defineProperties(
			app,
			{
				environment: {
					enumerable: true,
					configurable: true,
					value: environment
				},

				isDevelopment: {
					enumerable: true,
					configurable: true,
					value: environment === 'development'
				}
			}
		);
	}
}

module.exports = new ConfigManager();
