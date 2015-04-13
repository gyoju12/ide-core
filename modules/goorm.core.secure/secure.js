/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var fs = require("fs");
var encryptor = require('file-encryptor');
var execFile = require('child_process').execFile;

var regexp_filter = /^([가-힣0-9a-zA-Z \\\/._-{-}\=\[\]\(\)\/\/]|\:)*/g // jeongmin: add '/'. Add ' ' (Some commands have blanks). Add '{-}' for svn update by date({2014-01-01}).
var ecrypt_key = 'cordlfrwk)!(@';

module.exports = {
	filepath_filter: function(_str) {
		var str = _str || '';

		return str.replace(/([\.\ \(\)\[\]])/g, '\\$1');
	},

	command_filter: function(str) {
		// if (str.indexOf('rm ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('chmod ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('chown ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('userdel ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('cp ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('mv ') > -1) {
		// 	str = '';
		// }
		// else {
		// 	str = str.split(';')[0].split('&&')[0].split('||')[0];
		// }

		if (str) {
			str = str.match(regexp_filter).toString().split('..').join('');
		} else {
			console.log('SECURE.JS WARNING: ', str);
		}

		return str;
	},

	is_encrypted: function (path, callback) {
		execFile('file', [path], function (err, stdout, stderr) {
			if (err) {
				console.log('secure.js:is_encrypted fail', err);
				callback(false);
			}
			else if(stdout) {
				if (stdout.split(': ').pop().trim() === 'data') {
					callback(true);
				}
				else {
					callback(false);
				}
			}
			else {
				console.log('secure.js:is_encrypted fail', err, stdout, stderr);
				callback(false);
			}
		});
	},

	get_temp_path: function (path, user_id) {
		return path + '.' + (new Date()).getTime() + '.' + user_id;
	},

	read: function (options, callback) {
		var self = this;

		var path = options.path;
		var user_id = options.user_id;

		this.is_encrypted(path, function (encrypted) {
			if (encrypted) {
				// decrypt
				self.decrypt({
					'path': path,
					'user_id': user_id
				}, function (decrypt) {
					if (decrypt.result) {
						try {
							var data = decrypt.data;

							encodeURIComponent(data); //seongho.cha: Check it can be encoded and decoded by websocket
							callback({
								'result': true,
								'data': data
							});
						} catch (e) {
							callback({
								'result': false
							});
						}
					}
					else {
						callback({
							'result': false
						});
					}
				});
			}
			else {
				fs.readFile(path, "utf8", function(err, data) {
					if (!err) {
						try {
							encodeURIComponent(data); //seongho.cha: Check it can be encoded and decoded by websocket
							callback({
								'result': true,
								'data': data
							});
						} catch (e) {
							callback({
								'result': false
							});
						}
					} else {
						console.log('secure.js:read fail', err);
						callback({
							'result': false
						});
					}
				});
			}
		});
	},

	save: function (options, callback) {
		var self = this;

		var path = options.path;
		var user_id = options.user_id;
		var data = options.data;

		var append = options.append;

		if (append) {
			this.read(path, function (read) {
				if (read.result) {
					self.encrypt({
						'path': path,
						'user_id': user_id,
						'data': read.data + append
					}, callback);
				} 
				else {
					callback({
						'result': false
					});
				}
			});
		}
		else {
			this.encrypt({
				'path': path,
				'user_id': user_id,
				'data': data
			}, callback);
		}
	},

	encrypt: function (options, callback) {
		var path = options.path;
		var user_id = options.user_id;

		var data = options.data;

		var temp_path = this.get_temp_path(path, user_id);

		fs.writeFile(temp_path, data, function (err) {
			if (err) {
				console.log('secure.js:encrypt fail', err);
				callback({
					'result': false
				});
			}
			else {
				encryptor.encryptFile(temp_path, path, ecrypt_key, function(err) {
					fs.unlink(temp_path, function () {
						if (err) {
							console.log('secure.js:encrypt fail', err);
							callback({
								'result': false
							});
						}
						else {
							callback({
								'result': true
							});
						}
					});
				});
			}
		});
	},

	decrypt: function (options, callback) {
		var path = options.path;
		var user_id = options.user_id;

		var temp_path = this.get_temp_path(path, user_id);

		encryptor.decryptFile(path, temp_path, ecrypt_key, function(err) {
			if (err) {
				console.log('secure.js:decrypt fail', err);
				callback({
					'result': false
				});
			}
			else {
				fs.readFile(temp_path, 'utf8', function (err, data) {
					fs.unlink(temp_path, function () {
						if (err) {
							console.log('secure.js:decrypt fail', err);
							callback({
								'result': false
							});
						}
						else {
							callback({
								'result': true,
								'data': data
							});
						}
					});
				});
			}
		});
	}
}
// console.log(command_filter('../*/test.txt test'));
