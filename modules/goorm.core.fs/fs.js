
var fs = require('fs');
var stackTrace = require('stack-trace');

function getCaller(func) {
	return func.caller;
}

function getData(func) {
	var trace = stackTrace.get(func || getCaller(getData));
	var caller = trace[0];
	return {
		typeName: caller.getTypeName(),
		functionName: caller.getFunctionName(),
		methodName: caller.getMethodName(),
		filePath: caller.getFileName(),
		lineNumber: caller.getLineNumber(),
		topLevelFlag: caller.isToplevel(),
		nativeFlag: caller.isNative(),
		evalFlag: caller.isEval(),
		evalOrigin: caller.getEvalOrigin()
	};
}

var http = require('http');
var querystring = require('querystring');

var g_auth = require('../goorm.core.auth/auth.js');

var goorm_fs = function (user_id, host) {
	var self = this;

	this.user_id = user_id;
	this.host = host;

	this.load = function () {
		var fn = getData().methodName;

		var args = Array.prototype.slice.call(arguments); // Array
		var last = args[args.length - 1];

		if (last && typeof(last) === 'function') { // is cb
			var cb = args.pop();

			this.send(this.host, fn, args, function (err, result) {
				cb(err, result);
			});
		}
	};

	this.loadSync = function () {
		var fn = getData().methodName;

		var args = Array.prototype.slice.call(arguments); // Array

		this.send(this.host, fn, args);
	};

	// LOAD FS
	//
	for (var name in fs) {
		if (typeof(fs[name]) === 'function') {
			if (name.indexOf('Sync') === -1) { // not exists
				this[name] = function () {
					this.name = name;
					self.load.apply(self, arguments);
				}
			}
			else {
				this[name] = function () {
					this.name = name;
					self.loadSync.apply(self, arguments);
				}
			}
		}
	};

	/*
	 * msg : {
	 * 		fn: String (function name),
	 * 		args: Array
	 * 		cb: Boolean
	 * }	
	 */
	this.send = function (host, fn, args, callback) {
		var obj = {};

		obj.fn = fn;
		obj.args = (!Array.isArray(args)) ? new Array(args) : args;

		if (callback && typeof(callback) === 'function') {
			obj.cb = true;
		} 

		var post_data = querystring.stringify(obj);

		var post_options = {
			host: host,
			port: '6000',
			path: '/fs',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': post_data.length
			}
		};

		var post_req = http.request(post_options, function(res) {
			res.setEncoding('utf8');

			var response = "";
			res.on('data', function(chunk) {
				response += chunk;
			});

			res.on('end', function() {
				try { // jeongmin: try catching
					response = JSON.parse(response);

					if (callback && typeof(callback) === 'function') {
						callback(response.err, response.result);
					}
				} catch (e) {
					callback(false, null);
				}
			});
		});

		post_req.on('error', function(e) {
			console.log(e);
		});

		post_req.write(post_data);
		post_req.end();
	}
}

module.exports = {
	queue: function () {

	},

	encode: function () {

	},

	connect: function (user_id, callback) {
		var self = this;

		g_auth.load_auth_data(user_id, function (auth_data) {
			if (auth_data && auth_data.host) {
				var host = auth_data.host;

				callback(new goorm_fs(user_id, host));
			}
			else {
				callback(fs);
			}
		});
	}
}
