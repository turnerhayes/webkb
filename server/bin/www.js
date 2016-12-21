#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const debug = require('debug')('webkb:server');
const app = require('../app');
const spdy = require('spdy');

app.set('port', process.env.PORT || 3000);

const server = app.listen(app.get('port'), function() {
	debug('Express server listening on port ' + server.address().port);
});

const options = {
	key: fs.readFileSync(path.join(__dirname, "..", "..", "server.key")),
	cert: fs.readFileSync(path.join(__dirname, "..", "..", "server.crt"))
};

spdy.createServer(
	options,
	app
).listen(
	12345,
	() => {
		debug(`Express HTTP/2 server listening on port 12345`);
	}
);
