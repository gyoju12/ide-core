/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var project_fields = {
	project_author: String,
	project_name: String,
	project_path: {
		type: String,
		index: true,
		unique: true
	},
	project_type: String,
	author_id: String,
	collaboration_list: Array,
	invitation_list: Array,
	group_name: String, // match gid
	gid: Number,
	// scm_id: String,
	// scm_pw: String,
	// scm_URL: String,
	// scm_type: String,
	// scm_auth: String,
	// scm_path: String
	original_hash: String,
	
	use_terminal: Boolean
};

var db = {
	project: mongoose.model('project', new Schema(project_fields)),
};

var EventEmitter = require("events").EventEmitter;
var exec = require('child_process').exec;
// spawn = require('child_process').spawn;
var fs = require('fs');


var g_auth_manager = require('./auth.manager.js');
var g_secure = require('../goorm.core.secure/secure');
var platform = require('os');

var os = {

	// Group Add
	'get_new_group': function(author) {
		var randomStringfunc = function(bits) {
			var chars, rand, i, ret;

			chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzabcdefghijkl';
			ret = '';

			while (bits > 0) {
				// 32-bit integer
				rand = Math.floor(Math.random() * 0x100000000);
				// base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
				for (i = 26; i > 0 && bits > 0; i -= 6, bits -= 6) {
					ret += chars[0x3F & rand >>> i];
				}
			}

			return ret;
		};

		var new_group = randomStringfunc(54).toLowerCase() + (new Date()).getTime();

		return new_group;
	},

	'generate_group': function(new_group) {
		var c = '';

		if (new_group) {
			new_group = g_secure.command_filter(new_group);
			c = 'addgroup ' + new_group;
		}

		return c;
	},

	'get_uid': function(author) {
		var c = '';

		if (author) {
			author = g_secure.command_filter(author);
			c = 'id -u ' + author;
		}

		return c;
	},

	'get_gid': function(group_name) {
		var c = '';

		if (group_name) {
			group_name = g_secure.command_filter(group_name);
			c = 'cat /etc/group | grep ^' + group_name + ':';
		}

		return c;
	},

	'group_del': function(group_name) {
		var c = '';

		if (group_name) {
			group_name = g_secure.command_filter(group_name);
			c = 'groupdel ' + group_name;
		}

		return c;
	},

	'user_add': function(group, user) {
		var c = '';

		if (group && user) {
			group = g_secure.command_filter(group);
			user = g_secure.command_filter(user);
			c = 'usermod -a -G ' + group + ' ' + user;
		}

		return c;
	},

	'user_del': function(group, user) {
		var c = '';

		if (group && user) {
			group = g_secure.command_filter(group);
			user = g_secure.command_filter(user);
			c = 'gpasswd -d ' + user + ' ' + group + ' &';
		}

		return c;
	}
};

module.exports = {
	add: function(project, callback) {
		var self = this;
		var doc = new db.project();

		for (var attr in project_fields) {
			doc[attr] = project[attr];
		}
		
		this.__remove_from_db({
			'project_path': project.project_path
		}, function() {
			

			
		});
	},
	
	
	
	
	
	
	
	
	
	
	add_user: function(user_list, group_name, callback) {
		var self = this;
		var evt = new EventEmitter();

		evt.on('add_user', function(evt, i) {
			if (user_list[i]) {
				var user = user_list[i];
				// if (user_list[i].indexOf('_') > -1) {
				// 	user = user.split('_');
				// 	user.pop();
				// 	user.join('_');
				// 	user = user[0];
				// }

				self.g_exec(os.user_add(group_name, user), function(result) {
					evt.emit('add_user', evt, ++i);
				});
			} else {
				callback(true);
			}
		});
		evt.emit('add_user', evt, 0);
	},

	del_user: function(user_list, group_name, callback) {
		var self = this;
		var evt = new EventEmitter();

		evt.on('del_user', function(evt, i) {
			if (user_list[i]) {
				// var user = user_list[i].split('_')[0];
				var user = user_list[i];

				self.g_exec(os.user_del(group_name, user), function(result) {
					evt.emit('del_user', evt, ++i);
				});
			} else {
				callback(true);
			}
		});
		evt.emit('del_user', evt, 0);
	},
	
	get: function(option, callback) {
		var project_path = option.project_path;
		var author_id = option.author_id;
		var project_name = option.project_name;

		var q = {};

		if (project_path) q.project_path = project_path;
		if (author_id) q.author_id = author_id;
		if (project_name) q.project_name = project_name;

		db.project.findOne(q, function(err, data) {
			if (err) {
				console.log(err);
			}

			callback(data);
		});
	},

	get_project_gid: function(option, callback) {
		var self = this;

		this.get(option, function(project_data) {
			if (project_data) {
				if (project_data.gid) {
					callback(project_data.gid);
				} else if (project_data.group_name) {
					self.g_exec(os.get_gid(project_data.group_name), function(gid_stdout) {
						if (gid_stdout) {
							var gid = parseInt(gid_stdout.split(':')[2], 10);
							callback(gid);
						} else {
							callback(false);
						}
					});
				} else {
					callback(false);
				}
			} else {
				callback(false);
			}
		});
	},

	// All List
	get_all_list: function(option, callback) {
		db.project.find({}, function(err, data) {
			callback(data);
		});
	},

	// option
	get_no_co_developers_list: function(option, callback) {
		var user_list = option.user_list;
		var is_in = function(list, user) {
			var exist = false;

			if (list && list.length > 0) {
				exist = list.some(function(o) {
					return (o.user == user);
				});
			}

			return exist;
		};

		this.get({
			'project_path': option.project_path
		}, function(project_data) {
			if (project_data && user_list) {
				user_list = user_list.filter(function(o) {
					var user_id_type = o.id;
					var collaboration_list = project_data.collaboration_list;

					if (is_in(collaboration_list, user_id_type)) {
						return false;
					} else {
						return true;
					}
				});
				callback(user_list);
			} else {
				callback([]);
			}
		});
	},

	// Owner List
	get_owner_list: function(option, callback) {
		var prj_data = {
			author_id: option.author_id
		};

		db.project.find(prj_data, function(err, data) {
			callback(data);
		});
	},
	
	get_export_list: function(option, callback) {
		var author_id = option.author_id;
		var project_path = option.project_path;

		if (!project_path) {
			db.project.find({
				'collaboration_list.user': {
					$in: [author_id]
				}
			}, function(err, data) {
				callback(data);
			});
		} else {
			db.project.find({
				'collaboration_list.user': {
					$in: [author_id]
				},
				'project_path': project_path
			}, function(err, data) {
				callback(data);
			});
		}
	},
	
	remove: function(option, callback) {
		var self = this;
		var project_path = option.project_path;

		self.get({
			'project_path': project_path
		}, function(prj_data) {
			if (prj_data) {

				

				

				self.__remove_from_db({
					'project_path': project_path
				}, callback);
			}
		});
	},

	__remove_from_db: function(option, callback) {
		db.project.remove(option, function(err) {
			if (!err && callback) callback(true);
			else {
				console.log(err);
				if (callback) callback(false);
			}
		});
	},

	add_group: function(option, callback) {
		var self = this;

		var author = option.author; // user id
		var project_path = option.project_path;

		// 1. get new group
		var new_group = os.get_new_group(author);

		// 2-1. add group to ubuntu
		self.g_exec(os.group_generate(author), function(group_generate_result) {

			// 3. user add

		});

		// 2-2. add group to db 
		var set_group_data = {
			'project_path': project_path,
			'new_group': new_group
		};

		this.set_group(set_group_data);
	},

	set_group: function(option, callback) {
		var project_path = option.project_path;
		var new_group = option.new_group;

		db.project.update({
			'project_path': project_path
		}, {
			$set: {
				'group_name': new_group
			}
		}, function(err) {
			if (err) {
				console.log(err);
				if (callback) callback(false);
			} else {
				if (callback) callback(true);
			}
		});
	},

	get_project_doc: function() {
		return db.project;
	},

	g_exec: function(command, callback) {

		exec(command, function(err, stdout, stderr) {
			if (err) {
				console.log(err, stdout, stderr);
				if (callback) callback(false);
			} else {
				var result = stdout || true;
				if (callback) callback(result);
			}
		});
	},

	

	
	
	
	
	
	
	
	
	// change goorm.manifest's permission and owner. Jeong-Min Im.
	manifest_setting: function(project_path, callback) {
		var perm = null,
			own_group = null,
			chattr_cmd = null,
			path = null,
			callback = callback || function() {};

		if (project_path) {
			if (project_path.indexOf(global.__workspace) > -1) {
				path = project_path;
			} else {
				path = global.__workspace + project_path;
			}

			if (platform.platform().indexOf('darwin') > -1) {
				perm = '740 ';
				own_group = ' ';
				chattr_cmd = 'chflags uchg ';
			} else {
				perm = '774 ';
				own_group = ':root ';
				chattr_cmd = 'chattr +i ';
			}

			if (perm && own_group)
				exec('chmod ' + perm + path + '/goorm.manifest', function(err) {
					exec('chown root' + own_group + path + '/goorm.manifest', function(err) {
						// exec(chattr_cmd + path + '/goorm.manifest', function(err) {	// hidden by jeongmin: change attribute command is not for every file system and if this command is applied, modification isn't permitted
						// if (err)
						// console.log('chattr err in manifest_setting:', err);

						callback();
						// });
					});
				});
			else
				callback();
		} else { // jeongmin: error
			callback();
		}
	},

	// change bin's group permission. Jeong-Min Im.
	bin_setting: function(project_path, callback) {
		exec('find ' + global.__workspace + project_path + '/bin -exec chmod -R 774 {} \\;', function(err) {
			callback();
		});
	},

	// check manifest is valid or not. Jeong-Min Im.
	valid_manifest: function(project_path, cur_manifest, callback) {
		var self = this;
		var today = new Date();
		var today_month = parseInt(today.getMonth(), 10) + 1;
		var date_string = today.getFullYear() + '/' + today_month + '/' + today.getDate() + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();

		// validate manifest and fix it. Jeong-Min Im.
		function fix_manifest() {
			if (cur_manifest.author + '_' + cur_manifest.name != project_path) { // wrong goorm.manifest -> fix it!
				self.get({
					project_path: project_path
				}, function(data) {
					if (data) {
						fs.readFile(global.__path + '/plugins/goorm.plugin.' + data.project_type + '/preference.json', {
							encoding: 'utf8'
						}, function(_err, plugins_data) {
							if (_err) {
								console.log('preference.json reading error in valid_manifest:', _err);

								self.manifest_setting(project_path, callback);
							} else {
								try {
									plugins_data = JSON.parse(plugins_data);

									cur_manifest.author = data.project_author;
									cur_manifest.type = data.project_type;
									cur_manifest.name = data.project_name;
									cur_manifest.date = date_string;
									cur_manifest.plugins = {};
									cur_manifest.plugins['goorm.plugin.' + data.project_type] = plugins_data;

									fs.writeFile(global.__workspace + project_path + '/goorm.manifest', JSON.stringify(cur_manifest), {
										encoding: 'utf8',
										mode: 0700
									}, function(__err) {
										self.manifest_setting(project_path, function() {
											if (__err) {
												console.log('goorm.manifest writing error in valid_manifest:', __err);
												callback();
											} else {
												callback(JSON.stringify(cur_manifest));
											}
										});
									});
								} catch (_e) {
									console.log('plugin data parsing error in valid_manifest:', _e);

									self.manifest_setting(project_path, callback);
								}
							}
						});
					} else {
						console.log('get project db error');

						self.manifest_setting(project_path, callback);
					}
				});
			} else { // right goorm.manifest
				self.manifest_setting(project_path, function() {
					callback(JSON.stringify(cur_manifest));
				});
			}
		}

		if (!cur_manifest) {
			fs.readFile(global.__workspace + project_path + '/goorm.manifest', { // getting cur_manifest
				encoding: 'utf8'
			}, function(err, data) {
				if (err) { // jeongmin: no goorm.manifest
					console.log('goorm.manifest reading error in valid_manifest:', err);

					// jeongmin: dummy cur_manifest
					cur_manifest = {
						author: '',
						name: ''
					};

					fix_manifest(); // jeongmin: make goorm.manifest
				} else { // jeongmin: goorm.manifest exists
					try {
						cur_manifest = JSON.parse(data);

						fix_manifest();
					} catch (e) {
						console.log('goorm.manifest parsing error in valid_manifest:', e);

						self.manifest_setting(project_path, callback);
					}
				}
			});
		} else {
			fix_manifest();
		}
	}
};