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
var walk = require('walk');
var EventEmitter = require('events').EventEmitter;
var rimraf = require('rimraf');
var async = require('async');

var initial_list = {
	'ide': ['goorm.plugin.cpp', 'goorm.plugin.java', 'goorm.plugin.dart', 'goorm.plugin.go', 'goorm.plugin.jsp', 'goorm.plugin.nodejs', 'goorm.plugin.php', 'goorm.plugin.python', 'goorm.plugin.ruby'],
	'edu': ['goorm.plugin.edu', 'goorm.plugin.lecture'],
	'dev': ['goorm.plugin.nodejs', 'goorm.plugin.dev'],
	'book': ['goorm.plugin.nodejs', 'goorm.plugin.jquery'],
	'cpp': ['goorm.plugin.cpp'],
	'java': ['goorm.plugin.java'],
	'nodejs': ['goorm.plugin.nodejs'],
	'python': ['goorm.plugin.python'],
	'ruby': ['goorm.plugin.ruby'],
	'go': ['goorm.plugin.go'],
	'dart': ['goorm.plugin.dart'],
	'jsp': ['goorm.plugin.jsp'],
	'php': ['goorm.plugin.php'],
	'android': ['goorm.plugin.android'],
	'phonegap': ['goorm.plugin.phonegap']
};

var resource_list = [
	'dialogs/',
	'images/',
	'[name].preference.html',
	'[name].property.html',
	'localization.json',
	'plug.css',
	'plug.js',
	'preference.json',
	'tree.json'
];

module.exports = {
	get_mode_list: function(mode) { // mode --> Array
		if (mode && typeof(mode) === 'string') {
			mode = mode.split(',');
		}
		var list = [];

		if (mode && mode.length > 0) {
			for (var i = 0; i < mode.length; i++) {
				var item = mode[i];

				list = list.concat(initial_list[item]);
				list = list.unique();
			}
		}

		return list || [];
	},

	get_list: function(mode, evt) {
		if (mode === 'init') {
			var plugins = [];

			var walker = walk.walk(global.__path + 'plugins', {
				followLinks: false
			});

			walker.on('directories', function(root, dirStatsArray, next) {
				if (root == global.__path + 'plugins') {
					for (var i = 0; i < dirStatsArray.length; i++) {
						var name = dirStatsArray[i].name;

						if (name !== '.svn') {
							plugins.push({
								name: name
							});
						}
					}
				}

				next();
			});

			walker.on('end', function() {
				global.plugins_list = plugins;
			});
		} else {
			var list = this.get_mode_list(mode) || [];

			var plugins = [];

			var walker = walk.walk(global.__path + 'plugins', {
				followLinks: false
			});

			walker.on('directories', function(root, dirStatsArray, next) {
				if (root == global.__path + 'plugins') {
					for (var i = 0; i < dirStatsArray.length; i++) {
						var name = dirStatsArray[i].name;

						if (list.indexOf(name) > -1) {
							plugins.push({
								name: name
							});
						}
					}
				}

				next();
			});

			walker.on('end', function() {
				if (evt) {
					evt.emit('plugin_get_list', plugins);
				}
			});
		}
	},

	get_resource: function(options, callback) {
		var name = options.name;
		var path = options.path;

		var can = false;

		for (var i = 0; i < resource_list.length; i++) {
			var resource = resource_list[i];

			if (resource.indexOf('/') > -1) {
				if (path.indexOf(resource) === 0) {
					can = true;
				}
			} else if (resource.indexOf('[name]') > -1) {
				var _path = resource.replace('[name]', name);

				if (path === _path) {
					can = true;
				}
			} else if (path === resource) {
				can = true;
			}

			if (can) {
				break;
			}
		}

		if (can) {
			var fullpath = __path + 'plugins/goorm.plugin.' + name + '/' + path;

			fs.exists(fullpath, function(exists) {
				if (exists) {
					callback(fullpath);
				} else {
					console.log('plugin.js:get_resource fail - cannot find', name, path);
					callback(null);
				}
			});
		} else {
			console.log('plugin.js:get_resource fail - cannot access', name, path);
			callback(null);
		}
	},

	do_new: function(req, res) {
		var plugin = require('../../plugins/' + req.plugin + '/modules/');
		plugin.do_new(req, res);
	},
	make_template: function(req, res) {

		var plugin = require('../../plugins/' + req.plugin + '/modules/');
		plugin.make_template(req, res);

	},
	debug_server: function(io) {
		console.log('debug server started');
		io.set('log level', 0);
		io.sockets.on('connection', function(socket) {
			var plugin = null;
			var evt = new EventEmitter();

			console.log('debug server connected');

			evt.on('response', function(data) {
				socket.emit('debug_response', data);
			});

			socket.on('debug', function(msg) {
				if (msg.mode == 'init') {
					if (plugin !== null) {
						plugin.debug({
							'mode': 'close'
						}, evt);
					}
					plugin = require('../../plugins/' + msg.plugin + '/modules/');
				}
				if (plugin !== null) {
					plugin.debug(msg, evt);
				}
			});
		});
	},

	run: function(req, res) {
		// console.log(req);
		var plugin = require('../../plugins/' + req.plugin + '/modules/');
		plugin.run(req, res);
	},

	extend_function: function(req, res) {
		var plugin = require('../../plugins/' + req.query.plugin + '/modules/');
		plugin.extend_function(req, res);
	},

	load_userplugin: function(req, res, cb) {
		var user_plg_path = global.__temp_dir + req.query.id + '/plugins/';
		fs.exists(user_plg_path, function(exists) {
			if (exists) {
				var plug_name_list = [];
				fs.readdir(user_plg_path, function(err, files) {
					for (var i = 0; i < files.length; i++) {
						fstat = fs.statSync(user_plg_path + files[i]);
						if (fstat.isDirectory()) {
							if (fs.existsSync(user_plg_path + files[i] + '/plug.js')) {
								var pref_string = '{}';
								var tree_string = '{}';
								var loc_string = '{}';
								if (fs.existsSync(user_plg_path + files[i] + '/preference.json')) {
									pref_string = fs.readFileSync(user_plg_path + files[i] + '/preference.json', 'utf8');
								}
								if (fs.existsSync(user_plg_path + files[i] + '/tree.json')) {
									tree_string = fs.readFileSync(user_plg_path + files[i] + '/tree.json', 'utf8');
								}
								if (fs.existsSync(user_plg_path + files[i] + '/localization.json')) {
									loc_string = fs.readFileSync(user_plg_path + files[i] + '/localization.json', 'utf8');
								}
								plug_name_list.push({
									name: files[i],
									tree: tree_string,
									localization: loc_string,
									preference: pref_string
								});
							}
						}
					}
					cb((plug_name_list.length !== 0), plug_name_list);
				});
			} else {
				cb(false);
			}
		});
	},

	user_clean: function(query, res) {
		var absolute_path = query.absolute_path;
		var user_id = query.id;
		var user_plg_path = global.__temp_dir + user_id + '/plugins/';
		var complete_num = 0;
		var del_num = 0;
		var plug_name_list = [];
		var del_type_list = [];
		fs.exists(absolute_path + '.plg_list', function(exists) {
			if (exists) {
				plug_name_list = fs.readFileSync(absolute_path + '.plg_list', 'utf8').split('\n');
				plug_name_list.pop();
				rimraf.sync(absolute_path + '.plg_list');
			}

			if (plug_name_list.length) {
				for (var i = 0; i < plug_name_list.length; i++) {
					del_type_list.push(plug_name_list[i]);

					rimraf(user_plg_path + 'goorm.plugin.' + plug_name_list[i], function(err) {
						if (!err) {
							del_num++;
						}

						if (++complete_num == plug_name_list.length) {
							res.json({
								del_num: del_num,
								del_type_list: del_type_list
							});
						}
					});
				}
			} else {
				res.json({
					del_num: del_num,
					del_type_list: del_type_list
				});
			}
		});
	},

	set_property: function(query, res) {
		var workspace_path = query.workspace_path;
		var prev_name = query.prev_name;
		var replace_name = query.replace_name;
		var property_html = prev_name + '.property.html';
		var preference_html = prev_name + '.preference.html';
		var plug_js = 'plug.js';
		var tree_json = 'tree.json';
		var preference_json = 'preference.json';
		var modules_js = 'modules/index.js';
		var images1_png = 'images/' + prev_name + '.png';
		var images2_png = 'images/' + prev_name + '_console.png';
		async.parallel({
				property_html: function(callback) {
					var someFile = workspace_path + property_html;
					fs.readFile(someFile, 'utf8', function(err, data) {
						if (err) {
							return callback(null, 'read error');
						}

						var result = data.replace(RegExp(prev_name, 'g'), replace_name);

						fs.writeFile(someFile, result, 'utf8', function(err) {
							if (err) {
								return callback(null, 'write error');
							} else {
								fs.rename(someFile, someFile.replace(prev_name, replace_name), function() {
									if (err) {
										return callback(null, 'File name change error');
									} else {
										return callback(null, 'Modify Success');
									}
								});
							}
						});
					});
				},
				preference_html: function(callback) {
					var someFile = workspace_path + preference_html;
					fs.readFile(someFile, 'utf8', function(err, data) {
						if (err) {
							return callback(null, 'read error');
						}
						var result = data.replace(RegExp(prev_name, 'g'), replace_name);

						fs.writeFile(someFile, result, 'utf8', function(err) {
							if (err) {
								return callback(null, 'write error');
							} else {
								fs.rename(someFile, someFile.replace(prev_name, replace_name), function() {
									return callback(null, 'Modify Success');
								});
							}
						});
					});
				},
				tree_json: function(callback) {
					var someFile = workspace_path + tree_json;
					fs.readFile(someFile, 'utf8', function(err, data) {
						if (err) {
							return callback(null, 'read error');
						}

						var result = data.replace(RegExp(prev_name, 'g'), replace_name);
						result = result.replace(RegExp(prev_name.toUpperCase(), 'g'), replace_name.toUpperCase());

						fs.writeFile(someFile, result, 'utf8', function(err) {
							if (err) {
								return callback(null, 'write error');
							} else {
								return callback(null, 'Modify Success');
							}
						});
					});
				},
				plug_js: function(callback) {
					var someFile = workspace_path + plug_js;
					fs.readFile(someFile, 'utf8', function(err, data) {
						if (err) {
							return callback(null, 'read error');
						}

						var result = data.replace('name: \'' + prev_name + '\'', 'name: \'' + replace_name + '\'');
						result = result.replace('goorm.plugin.' + prev_name, 'goorm.plugin.' + replace_name);

						fs.writeFile(someFile, result, 'utf8', function(err) {
							if (err) {
								return callback(null, 'write error');
							} else {
								return callback(null, 'Modify Success');
							}
						});
					});
				},
				preference_json: function(callback) {
					var someFile = workspace_path + preference_json;
					fs.readFile(someFile, 'utf8', function(err, data) {
						if (err) {
							return callback(null, 'read error');
						}

						var result = data.replace(RegExp(prev_name, 'g'), replace_name);

						fs.writeFile(someFile, result, 'utf8', function(err) {
							if (err) {
								return callback(null, 'write error');
							} else {
								return callback(null, 'Modify Success');
							}
						});
					});
				},
				modules_js: function(callback) {
					var someFile = workspace_path + modules_js;
					fs.readFile(someFile, 'utf8', function(err, data) {
						if (err) {
							return callback(null, 'read error');
						}

						var result = data.replace(RegExp(prev_name, 'g'), replace_name);

						fs.writeFile(someFile, result, 'utf8', function(err) {
							if (err) {
								return callback(null, 'write error');
							} else {
								return callback(null, 'Modify Success');
							}
						});
					});
				},
				images1_png: function(callback) {
					var someFile = workspace_path + images1_png;
					fs.rename(someFile, someFile.replace(prev_name, replace_name), function(err) {
						if (err) {
							return callback(null, 'File name change error');
						} else {
							return callback(null, 'Modify Success');
						}
					});
				},
				images2_png: function(callback) {
					var someFile = workspace_path + images2_png;
					fs.rename(someFile, someFile.replace(prev_name, replace_name), function(err) {
						if (err) {
							return callback(null, 'File name change error');
						} else {
							return callback(null, 'Modify Success');
						}
					});
				}
			},
			function(err, results) {
				res.json(results);
			});
	}
};
