/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var fs = require('fs');
var exec = require('child_process').exec;
var EventEmitter = require('events').EventEmitter;

var version_info = null;

module.exports = {
	init: function() {

	},

	get_server_info: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';

		var get_os_version = function(callback) {
			exec('uname -sr', function(err, version) {
				callback(version);
			});
		};

		var get_node_version = function(callback) {
			exec('node --version', function(err, version) {
				callback(version);
			});
		};

		

		//useonly(mode=goorm-oss)
		get_os_version(function(os_version) {
			get_node_version(function(node_version) {
				data.info = {
					'os_version': os_version,
					'node_version': node_version,
					'theme': 'default',
					'language': 'client'
				};

				evt.emit('preference_get_server_info', data);
			});
		});
		
	},

	get_goorm_info: function(query, evt) {
		var self = this;
		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';
		data.info = global.__path;

		fs.readFile(global.__path + 'package.json', 'utf8', function(_err, package_contents) {
			fs.readFile(global.__path + 'info_goorm.json', 'utf8', function(err, contents) {
				if (_err !== null || err !== null) {
					data.err_code = 40;
					data.message = 'Cannot find target file';
					console.log('get goorm info - error in reading info_goorm.json:', _err, err, data.message);
					evt.emit('preference_get_goorm_info', data);
				} else {
					try {
						var __package = JSON.parse(package_contents);

						data.info = JSON.parse(contents);
						data.info.version = __package.version;
					} catch (e) {
						console.log(e);
						data.info = {};
					}

					var evt_for_tools_version = new EventEmitter();

					evt_for_tools_version.on('get_tools_version', function(tools_version_info) {
						data.info.lib = tools_version_info.concat(data.info.lib);
						evt.emit('preference_get_goorm_info', data);
					});
					self.get_tools_version(evt_for_tools_version);
				}
			});
		});
	},

	// put_filetypes: function (query, evt) {	// hidden by jeongmin: file type is deprecated
	// 	var data = {};

	// 	fs.writeFile(global.__path + 'public/configs/filetype/filetype.json', query.data, function (err) {
	// 		if (err !== null) {
	// 			data.err_code = 10;
	// 			data.message = "Can not save";

	// 			evt.emit("preference_put_filetypes", data);
	// 		} else {
	// 			data.err_code = 0;
	// 			data.message = "saved";

	// 			evt.emit("preference_put_filetypes", data);
	// 		}
	// 	});
	// },

	// python -V;node --version;gcc --version;gdb --v;java -version

	get_tools_version: function(res_evt) {

		if (version_info) {
			res_evt.emit('get_tools_version', version_info);
			return false;
		}

		var evt_get_tools_version = new EventEmitter();
		var tools_version_info = [];

		evt_get_tools_version.on('gcc', function(data) {
			exec('gcc --version', function(err, stdout) {
				if (!err) {
					// gcc (Ubuntu/Linaro 4.7.2-2ubuntu1) 4.7.2
					stdout = stdout.split('\n')[0];
					data.push({
						'name': 'GCC',
						'version': stdout
					});
				}
				evt_get_tools_version.emit('gdb', data);
			});

		});

		evt_get_tools_version.on('gdb', function(data) {
			exec('gdb -v', function(err, stdout) {
				if (!err) {
					//   GNU gdb (GDB) 7.5-ubuntu
					stdout = stdout.split('\n')[0];
					// stdout = stdout.split(' ').pop();
					// stdout = stdout.split('-')[0];
					data.push({
						'name': 'GDB',
						'version': stdout + ''
					});
				}
				evt_get_tools_version.emit('node', data);
			});

		});

		evt_get_tools_version.on('node', function(data) {
			exec('node --version', function(err, stdout) {
				if (!err) {
					data.push({
						'name': 'Node',
						'version': stdout + ''
					});
				}
				evt_get_tools_version.emit('java', data);
			});

		});

		evt_get_tools_version.on('java', function(data) {
			//java version '1.7.0_04'
			exec('java -version', function(err, stdout) {
				if (!err && stdout !== '') {
					stdout = stdout.split('\n')[0];
					// stdout = stdout.split("\"")[1];
					// stdout = stdout.split("\"")[0];
					data.push({
						'name': 'Java',
						'version': stdout + ''
					});
				}
				evt_get_tools_version.emit('python', data);
			});
		});

		evt_get_tools_version.on('python', function(data) {
			exec('python -V', function(err, stdout) {
				if (!err && stdout !== '') {
					stdout = stdout.split(' ')[1];
					data.push({
						'name': 'Python',
						'version': stdout + ''
					});

				}
				version_info = data;
				res_evt.emit('get_tools_version', data);
			});
		});

		evt_get_tools_version.emit('gcc', tools_version_info);
	}
};
