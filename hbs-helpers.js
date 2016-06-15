"use strict";

var MIDIPrograms    = require('./lib/utils/midi-file-parser/midi-programs');
var MIDIControllers = require('./static/scripts/lib/midi-controller-numbers');

module.exports = function(Handlebars, _) {
	return {
		Times: function(num, options) {
			var i;
			var result;
			var data;

			if (options.data) {
				data = Handlebars.createFrame(options.data);
			}

			num = parseInt(num);

			if (num !== num || num < 0) {
				num = 0;
			}

			if (num === 0) {
				return options.inverse ?
					new Handlebars.SafeString(options.inverse(this)) :
					new Handlebars.SafeString('');
			}

			result = '';

			for(i = 0; i < num; i++) {
				if (data) {
					data.index = i;
				}

				result += options.fn(this, { data: data });
			}

			return new Handlebars.SafeString(result);
		},

		Range: function(min, max, options) {
			var i;
			var result;

			if (options === void 0) {
				options = max;
				max = min;
				min = 0;
			}

			if (max <= min) {
				return [];
			}

			result = [];

			for (i = min; i < max; i++) {
				result.push(i);
			}

			return result;
		},

		Serialize: function(obj) {
			return JSON.stringify(obj);
		},

		Default: function(value, defaultValue) {
			return value || defaultValue;
		},

		Compare: function(lvalue, operator, rvalue, options) {
			var operators, result;
			
			if (arguments.length < 3) {
				throw new Error("Helper 'Compare' needs 2 parameters");
			}
			
			if (options === undefined) {
				options = rvalue;
				rvalue = operator;
				operator = "===";
			}

			operators = {
				'==': function (l, r) { return l == r; },
				'===': function (l, r) { return l === r; },
				'!=': function (l, r) { return l != r; },
				'!==': function (l, r) { return l !== r; },
				'<': function (l, r) { return l < r; },
				'>': function (l, r) { return l > r; },
				'<=': function (l, r) { return l <= r; },
				'>=': function (l, r) { return l >= r; },
				'typeof': function (l, r) { return typeof l == r; },
				'regex': function(l, r) { return (new RegExp(r)).test(l); }
			};
			
			if (!(operator in operators)) {
				throw new Error("Helper 'Compare' doesn't know the operator " + operator);
			}
			
			result = operators[operator](lvalue, rvalue);

			// Being called as a subexpression
			if (!options.fn) {
				return result;
			}

			if (result) {
				return options.fn(this);
			} else if (options.inverse) {
				return options.inverse(this);
			}
		},

		Modulo: function(left, mod) {
			left = Number(left);

			mod = Number(mod);

			return left % mod;
		},

		Add: function(left, right) {
			left = Number(left);

			right = Number(right);

			return left + right;
		},

		Subtract: function(left, right) {
			left = Number(left);

			right = Number(right);

			return left - right;
		},

		Divide: function(numerator, denominator) {
			numerator = Number(numerator);

			denominator = Number(denominator);

			return numerator / denominator;
		},

		Multiply: function(left, right) {
			left = Number(left);

			right = Number(right);

			return left * right;
		},

		Round: function(value, numberOfPlaces) {
			numberOfPlaces = (numberOfPlaces && parseInt(numberOfPlaces, 10)) || 0;

			value = Number(value);

			if (numberOfPlaces === 0) {
				return Math.round(value);
			}
			else {
				return Number(value.toFixed(numberOfPlaces));
			}
		},

		"Object": function(options) {
			var obj = {};
			var key;

			if (!options.hash) {
				return obj;
			}

			for (key in options.hash) {
				if (options.hash.hasOwnProperty(key)) {
					obj[key] = options.hash[key];
				}
			}

			return obj;
		},

		"Array": function() {
			return arguments.length === 0 ?
				[] :
				Array.prototype.slice.call(arguments, 0, arguments.length - 1);
		},

		Capitalize: function(word, options) {
			// Can be called either as {{#Capitalize "word"}}{{/Capitalize}} or
			// {{#Capitalize}}word{{/Capitalize}}
			if (!options) {
				options = word;
				word = options.fn(this);
			}

			if (word) {
				word = word[0].toUpperCase() + word.substring(1);
			}

			return word;
		},

		ProgramOptions: function(options) {
			var programOpts = _.map(
				_.groupBy(
					_.map(
						MIDIPrograms,
						function(program, index) {
							return _.extend(
								{},
								program,
								{
									number: index
								}
							);
						}
					),
					'category'
				),
				function(programs, categoryName) {
					return {
						name: categoryName,
						programs: programs
					};
				}
			);

			return new Handlebars.SafeString(
				_.map(
					programOpts,
					options.fn
				).join('')
			);
		},

		ControllerOptions: function() {
			var undefinedControllerCount = 0;

			return _.map(
				MIDIControllers,
				function(controllerName, index) {
					return {
						number: index,
						name: controllerName || 'Undefined controller ' + ++undefinedControllerCount
					};
				}
			);
		}
	};
};
