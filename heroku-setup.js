"use strict";

var debug = require('debug')('webkb:heroku-setup');

process.env.CONFIG_SESSION_STORE_URL = process.env.MONGOLAB_URI;
process.env.CONFIG_DATA_STORE_URL    = process.env.MONGOLAB_URI;
