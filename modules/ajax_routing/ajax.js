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
var execFile = require('child_process').execFile;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var EventEmitter = require('events').EventEmitter;

var g_file = require('../goorm.core.file/file');
var g_preference = require('../goorm.core.preference/preference');
var g_project = require('../goorm.core.project/project');
var g_search = require('../goorm.core.search/search');
var g_edit = require('../goorm.core.edit/edit');
var g_secure = require('../goorm.core.secure/secure');
var g_plugin = require('../goorm.plugin/plugin');

var g_auth = require('../goorm.core.auth/auth');
var g_auth_manager = require('../goorm.core.auth/auth.manager');
var g_auth_project = require('../goorm.core.auth/auth.project');





var check_valid_path = function(str) {
	if (!str) {
		return false;
	}
	return !(/\.\.|~|;|&|\|/.test(str));
};



module.exports = {
	start: function(io) {
		var self = this;
		self.io = io;

		io.set('log level', 0);
		io.sockets.on('connection', function(socket) {
			// join to goorm. Jeong-Min Im.
			socket.on('access', function(raw_msg) {
				try {
					var msg_obj = JSON.parse(raw_msg);
					var channel = '';
					if (msg_obj.channel !== undefined) {
						channel = msg_obj.channel;
					}

					if (channel == 'join') {
						if (socket.handshake && socket.handshake.sessionID) {
							var sessionID = socket.handshake.sessionID;
							store.client.set('socket_' + sessionID, socket.id); //seongho.cha: this key will be removed later, I'm making to use sockets for multi windows
							store.client.sadd('sockets_' + global.__local_ip + '_' + sessionID, socket.id);
						}

						if (msg_obj.version) {
							socket.set('version', msg_obj.version.toString());
						}

						if (!msg_obj.reconnect) {
							socket.to().emit('user_access');
						}

						

						if (msg_obj.fs_express_id && msg_obj.fs_socket_id) {
							

							var fs_socket = io.sockets.socket(msg_obj.fs_socket_id);
							var fs_access = false;

							self.get_user_data(socket, function(user_data) {
								if (user_data.result) {
									fs_access = true;

									user_data = user_data.data;

									var id = user_data.id;

									fs_socket.set('fs_id', JSON.stringify({
										'id': id,
										'sessionID': msg_obj.fs_express_id
									}));

									if (msg_obj.version) {
										fs_socket.set('version', msg_obj.version.toString());
									}

									store.client.set(msg_obj.fs_express_id, JSON.stringify(user_data));
								}
								socket.to().emit('fs_access', fs_access);
							});
						}

						if (msg_obj.project_express_id && msg_obj.project_socket_id) {
							var project_socket = io.sockets.socket(msg_obj.project_socket_id);
							var project_access = false;

							self.get_user_data(socket, function(user_data) {
								if (user_data.result) {
									project_access = true;

									user_data = user_data.data;

									var id = user_data.id;

									project_socket.set('project_id', JSON.stringify({
										'id': id,
										'sessionID': msg_obj.project_express_id
									}));

									if (msg_obj.version) {
										project_socket.set('version', msg_obj.version.toString());
									}

									store.client.set(msg_obj.project_express_id, JSON.stringify(user_data));
								}

								socket.to().emit('project_access', project_access);
							});
						}
					}
				} catch (e) {
					console.log('socket access error in ajax:', e);
				}
			});

			////////
			//api start
			/////////

			//API : project

			socket.on('/project/valid', function(msg) {
				var evt = new EventEmitter();
				var valid = {};
				var _user_data = {};

				evt.once('project_over_limit', function(limit) {
					valid.result = false;
					valid.err_code = 1;
					valid.limit = limit;

					

					socket.emit('/project/valid', valid);
				});

				evt.once('project_exist', function() {
					valid.result = false;
					valid.err_code = 2;

					

					socket.emit('/project/valid', valid);
				});

				evt.once('project_duplicate_name', function() {
					valid.result = false;
					valid.err_code = 3;

					

					socket.emit('/project/valid', valid);
				});

				evt.once('project_valid_success', function() {
					valid.result = true;
					valid.err_code = 0;

					

					socket.emit('/project/valid', valid);
				});

				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = _user_data = user_data.data;

						msg['author'] = {
							author_id: user_data.id
						}
					}

					

					g_project.valid(msg, evt);
				});
			});

			socket.on('/project/new', function(msg) {
				var evt = new EventEmitter();
				var _user_data = {};

				//check user uses scm and if user uses, set scm info to goorm.manifest. Jeong-Min Im.
				evt.once('project_do_new', function(data) {

					

					// set goorm.manifest's uid as root. Jeong-Min Im.
					g_auth_project.manifest_setting(data.project_dir, function() {

						

						socket.emit('/project/new', data);
					});
				});

				

				

				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = _user_data = user_data.data;

						

						msg.project_author = user_data.id;
						g_project.do_new(msg, evt);
					}
				});
			});

			socket.on('/project/delete', function(msg) {
				var evt = new EventEmitter();
				var _user_data = {};

				evt.once('project_do_delete', function(data) {

					

					socket.emit('/project/delete', data);
				});

				

				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = _user_data = user_data.data;

						msg.id = user_data.id;

						

						
						//useonly(mode=goorm-oss)
						g_project.do_delete(msg, evt);
						
					}
				});
			});

			socket.on('/project/get_list', function(msg) {
				var evt = new EventEmitter();

				evt.once('project_get_list', function(data) {
					// jeongmin: differ socket's destination according to get_list_type
					switch (msg.get_list_type) {
						
						case 'export_list':
							socket.emit('/project/get_list/export', data);
							break;

						case 'owner_list':
							socket.emit('/project/get_list/owner', data);
					}
				});

				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg['author'] = {
							author_id: user_data.id
						}

						g_project.get_list(msg, evt);
					}
				});

			});

			//cannot file
			// socket.on('/project/import', function(msg) {});
			//cannot file
			socket.on('/project/do_export', function(postdata) {
				var evt = new EventEmitter();
				var data = {};

				function project_doing_export(data) {
					socket.emit('/project/do_export', data);
				}

				evt.on('project_doing_export', project_doing_export);

				evt.once('project_do_export', function(data) {
					evt.removeListener('project_doing_export', project_doing_export);
					socket.emit('/project/done_export', data);
				});

				
				//useonly(mode=goorm-oss)
				g_project.do_export(postdata, evt);
				
			});

			//not used
			// socket.on('/project/clean', function(msg) {
			// 	var evt = new EventEmitter();

			// 	evt.once('project_do_clean', function(data) {
			// 		socket.emit('/project/clean', data);
			// 	});

			// 	g_project.do_clean(msg, evt);
			// });

			socket.on('/project/get_property', function(msg) {
				var evt = new EventEmitter();
				evt.once('get_property', function(data) {
					if (data.contents) {
						
						//useonly(mode=goorm-oss)
						socket.emit('/project/get_property', data);
						
					} else {
						socket.emit('/project/get_property', data);
					}
				});

				g_project.get_property(msg, evt);
			});

			socket.on('/project/set_property', function(msg) {
				var evt = new EventEmitter();
				evt.once('set_property', function(data) {
					socket.emit('/project/set_property', data);
				});

				g_project.set_property(msg, evt);
			});

			// socket.on('/project/check_running_project', function(msg) {
			// 	socket.emit('/project/check_running_project', {
			// 		'result': 0
			// 	});
			// });

			socket.on('/project/check_latest_build', function(msg) {
				var evt = new EventEmitter();
				evt.once('check_latest_build', function(data) {
					socket.emit('/project/check_latest_build', data);
				});
				g_project.check_latest_build(msg, evt);
			});

			socket.on('/project/check_valid_property', function(msg) {
				var evt = new EventEmitter();
				evt.once('check_valid_property', function(data) {
					socket.emit('/project/check_valid_property', data);
				});

				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.uid = user_data.uid;
						msg.gid = user_data.gid;
						g_project.check_valid_property(msg, evt);
					}
				});
			});

			

			socket.on('/project/available', function(msg) {
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						var project_path = msg.project_path;

						if (project_path) {

							

							g_auth_project.can_read_project(user_data.id, project_path, function(can) {
								if (can === 404) {

									

									socket.to().emit('/project/available', {
										'result': false,
										'err_code': 404
									});
								} else if (can) {
									var mode = user_data.mode;
									var list = g_plugin.get_mode_list(mode);

									

									g_auth_project.get({
										'project_path': project_path
									}, function(project_data) {
										var project_type = project_data.project_type;
										var plugin_name = 'goorm.plugin.' + project_type;

										if (list.indexOf(plugin_name) > -1) {

											

											socket.to().emit('/project/available', {
												'result': true
											});
										} else {
											var err_code = 21;

											if (MODE) { // cannot dynamic load
												err_code = 20;
											}

											

											socket.to().emit('/project/available', {
												'result': false,
												'err_code': err_code
											});
										}
									});
								} else {
									

									console.log('can\'t read project');
									socket.to().emit('/project/available', {
										'result': false,
										'err_code': 20
									});
								}
							});
						} else {

							

							socket.to().emit('/project/available', {
								'result': true
							});
						}
					} else {
						socket.to().emit('/project/available', {
							'result': false,
							'err_code': 20
						});
					}
				});
			});

			socket.on('/plugin/create', function(msg) {
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						var uid = null;
						var gid = null;

						var copy = function() {
							var plugin_name = msg.plugin;
							var project_data = msg.data;

							var workspace = global.__workspace + '/' + project_data.project_dir;
							var template_path = global.__path + 'temp_files/' + user_data.id + '/plugins/' + plugin_name;

							// Default Plugin
							//
							if (global.plugins_list && global.plugins_list.length > 0) {
								var is_default_plg = global.plugins_list.some(function(o) {
									if (o && o.name === plugin_name) {
										return true;
									}
								});

								if (is_default_plg) {
									template_path = global.__path + 'plugins/' + plugin_name;
								}
							}

							var template = template_path + '/template';

							if (project_data.project_detailed_type) {
								try {
									var syncStat = fs.statSync(template + '/' + project_data.project_detailed_type.replace(/\s/g, '\ '));
									if (!syncStat || !syncStat.isDirectory()) {

									} else {
										template += '/' + project_data.project_detailed_type.replace(/\s/g, '\\ ');
									}
								} catch (e) {

								}
							}

							// jeongmin: show copy progress
							var copy_progress = spawn('rsync', ['-ah', '--progress', template + '/', workspace]);

							copy_progress.stderr.on('data', function(data) {
								var buf = new Buffer(data);

								console.log('copy error in do_create:', buf.toString());
							});

							copy_progress.stdout.on('data', function(data) {
								var buf = new Buffer(data);
								var progress = buf.toString();
								// jeongmin: don't show detail progress
								if (progress.indexOf('to-check') < 0 && progress.indexOf('to-chk') < 0) { // to-check: mac, to-chk: linux
									socket.to().emit('/plugin/create/progress', progress);
								}
							});

							copy_progress.on('close', function(code, signal) {
								var make_manifest = function() {
									fs.readFile(workspace + '/goorm.manifest', 'utf-8', function(err, file_data) {
										var contents = JSON.parse(file_data);

										contents.plugins = project_data.plugins;
										contents.detailedtype = project_data.project_detailed_type;

										fs.writeFile(workspace + '/goorm.manifest', JSON.stringify(contents), {
											encoding: 'utf-8',
											mode: 0700
										}, function(err) {
											if (err) {
												console.log('goorm.manifest write err in do_create:', err);
											}

											

											

											//useonly(mode=goorm-oss)
											socket.to().emit('/plugin/create', {
												code: 200,
												message: 'success'
											});
											
										});
									});
								};

								var _replace = function(item, cb) {
									var _path = item.path;
									var _data = item.data;

									fs.exists(workspace + '/' + _path, function(exists) {
										if (exists) {
											var cmd = 'sed -i ';

											for (var key in _data) {
												cmd += ' -e s#' + key + '#' + _data[key] + '#g';
											}

											cmd += ' ./' + _path;
											cmd = cmd.split(' ');

											execFile(cmd.shift(), cmd, {
												'cwd': workspace
											}, function() {
												cb(true);
											});
										} else {
											cb(true);
										}
									});
								};

								if (msg.replace) {
									var replace = msg.replace;

									async.map(msg.replace, _replace, function() {
										make_manifest();
									});
								} else {
									make_manifest();
								}
							});
						};

						//useonly(mode=goorm-client,goorm-oss)
						copy();
						

						
					}
				});
			});

			socket.on('/plugin/do_web_run', function(msg) {
				var uid = null;
				var gid = null;
				var copy = function() {
					var workspace = global.__workspace + '/' + msg.project_path;

					var target_path = (msg.deploy_path) ? msg.deploy_path + '/' + msg.project_path : __temp_dir + 'plugins/web/' + msg.project_path;

					var run_path = target_path.split('temp_files').pop();
					fse.ensureDir(target_path, function(__err1) {
						fse.copy(workspace, target_path, function(__err2) {
							if (__err1 || __err2) {
								console.log('do_web_run Err:', __err1, __err2);
								socket.to().emit('/plugin/do_web_run', {
									code: 500,
									message: 'Copy Error'
								});
							} else {
								

								//useonly(mode=goorm-server,goorm-client,goorm-oss)
								var callback = function(_socket, _run_path) {
									_socket.to().emit('/plugin/do_web_run', {
										code: 200,
										message: 'success',
										run_path: _run_path
									});
								};
								//if msg.chown exist, do chown. if msg.chmod exist, do chmod, when everything done, callback
								if (msg.chown) {
									execFile('chown', ['-R', msg.chown, target_path], function(err) {
										if (msg.chmod) {
											execFile('chmod', ['-R', msg.chmod, target_path], function(err) {
												callback(socket, run_path);
											});
										} else {
											callback(socket, run_path);
										}
									});
								} else if (msg.chmod) {
									execFile('chmod', ['-R', msg.chmod, target_path], function(err) {
										callback(socket, run_path);
									});
								} else {
									callback(socket, run_path);
								}
								
							}
						});
					});
				};
				
				//useonly(mode=goorm-server,goorm-client,goorm-oss)
				copy();
				
			});

			//API : FS
			socket.on('/file/new', function(msg) {
				var evt = new EventEmitter();

				evt.once('file_do_new', function(data) {
					socket.emit('/file/new', data);
				});

				

				//useonly(mode=goorm-oss)
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.user_id = user_data.id;
						g_file.do_new(msg, evt);
					}
				});
				
			});
			socket.on('/file/new_folder', function(msg) {
				var evt = new EventEmitter();

				evt.once('file_do_new_folder', function(data) {
					socket.emit('/file/new_folder', data);
				});

				

				//useonly(mode=goorm-oss)
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.user_id = user_data.id;
						g_file.do_new_folder(msg, evt);
					}
				});
				
			});
			socket.on('/file/new_untitled_text_file', function(msg) {
				var evt = new EventEmitter();

				evt.once('file_do_new_untitled_text_file', function(data) {
					socket.emit('/file/new_untitled_text_file', data);
				});

				

				//useonly(mode=goorm-oss)
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.user_id = user_data.id;
						g_file.do_new_untitled_text_file(msg, evt);
					}
				});
				
			});
			socket.on('/file/new_other', function(msg) {

				var evt = new EventEmitter();

				evt.once('file_do_new_other', function(data) {
					socket.emit('/file/new_other', data);
				});

				

				//useonly(mode=goorm-oss)
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.user_id = user_data.id;
						g_file.do_new_other(msg, evt);
					}
				});
				
			}); //context ...
			socket.on('/file/save_as', function(msg) {
				var evt = new EventEmitter();

				evt.once('file_do_save_as', function(data) {
					socket.emit('/file/save_as', data);
				});

				

				

				//useonly(mode=goorm-oss)
				g_file.do_save_as(msg, evt);
				
			});

			socket.on('/file/delete', function(msg) {
				if (msg.files || msg.directorys) {
					var evt = new EventEmitter();
					var files = (msg.files || []).concat(msg.directorys || []);

					evt.once('file_do_delete', function(data) {
						socket.emit('/file/delete', data);
					});

					

					//useonly(mode=goorm-oss)
					g_file.do_delete(files, evt);
					
				} else { // invalid query
					socket.emit('/file/delete', {
						err_code: 1
					});
				}
			});

			socket.on('/file/get_contents', function(msg) {
				var path = msg.path;
				var abs_path = global.__path + path;
				var reply_event = '/file/get_contents' + path;

				//1. valid path
				if (!check_valid_path(path)) {
					console.log('invalid path in get_contents');
					socket.emit(reply_event, false);
					return false;
				}

				//2. don't need to check (ex) dialog html
				if (msg.type !== 'get_workspace_file') {
					// console.log(abs_path);
					// fs.readFile(abs_path, 'utf8', function(err, data) {
					// 	if (!err) {
					// 		socket.emit(reply_event, data);
					// 	} else {
					// 		socket.emit(reply_event, false);
					// 	}
					// 	//jeongmin: most frequently executable condition should be appeared first
					// });
					return true;
				}

				//from here workspace file!!!!!
				abs_path = global.__workspace + path;
				//local -> do not check any thing

				//useonly(mode=goorm-oss)
				fs.readFile(abs_path, 'utf8', function(err, data) {
					if (!err) {
						try {
							encodeURIComponent(data); //seongho.cha: Check it can be encoded and decoded by websocket
							socket.emit(reply_event, data);
						} catch (e) {
							socket.emit(reply_event, false);
						}
					} else {
						socket.emit(reply_event, false);
					}
					//jeongmin: most frequently executable condition should be appeared first
				});
				

				
			});

			

			socket.on('/file/put_contents', function(msg) {
				var evt = new EventEmitter();
				var _user_data = {};

				evt.once('file_put_contents', function(data) {

					g_log.save({
						'user_id': _user_data.id,
						'type': 'active',
						'action': '/file/put_contents | end | in file_put_contents',
						'date': new Date(),
						'url': IDE_HOST
					});

					socket.emit('/file/put_contents', data);
				});

				

				//useonly(mode=goorm-oss)
				g_file.put_contents(msg, evt);
				
			});

			//later....test
			socket.on('/file/get_result_ls', function(msg) {
				var evt = new EventEmitter();

				evt.once('got_result_ls', function(data) {
					socket.emit('/file/get_result_ls' + msg.path, data);
				});

				

				//useonly(mode=goorm-oss)
				g_file.get_result_ls(msg, evt);
				
			});

			socket.on('/file/check_valid_edit', function(msg) {
				var evt = new EventEmitter();
				var project_path = msg.project_path;
				var filepath = msg.filepath;
				var filename = msg.filename;

				if (project_path && filepath && filename) {
					filepath = filepath.replace(/\/\//g, '/');
					if (!check_valid_path(project_path) || !check_valid_path(filepath) || !check_valid_path(filename)) {
						socket.emit('/file/check_valid_edit', {});
						return false;
					}
				} else {
					socket.emit('/file/check_valid_edit', {});
					return false;
				}
				

				

				//useonly(mode=goorm-oss)
				// file validate
				//
				evt.once('check_valid_edit', function(data) {
					if (!data.result) {
						switch (data.code) {
							case 0:
								console.log('Error: check_valid_edit, project not found.', global.__workspace + project_path);
								break;

							case 1:
								console.log('Error: check_valid_edit, project path is not directory.', global.__workspace + project_path);

							case 2:
								console.log('Error: check_valid_edit, project path cannot read.', global.__workspace + project_path);
							default:
								break;
						}
					}
					socket.emit('/file/check_valid_edit', data);
				});
				g_file.check_valid_edit(project_path, filepath, filename, evt);
				
			});

			// context ....
			socket.on('/file/move', function(msg) {
				var evt = new EventEmitter();
				var user_level = null;
				var author_level = null;

				// var move_fail = function(fail_msg) {
				// 	var res_data = {
				// 		err_code: 20,
				// 		message: fail_msg,
				// 		path: msg
				// 	};

				// 	socket.emit('/file/move', res_data);
				// };
				evt.once('file_do_move', function(data) {
					socket.emit('/file/move', data);
				});

				
				//useonly(mode=goorm-oss)
				g_file.do_move(msg, evt);
				
			});
			socket.on('/file/rename', function(msg) {
				var evt = new EventEmitter();
				var user_level = null;
				var author_level = null;

				evt.once('file_do_rename', function(data) {
					socket.emit('/file/rename', data);
				});

				if (msg.ori_path === '/' || msg.ori_path === '') {
					var res_data = {
						err_code: 20,
						message: 'alert_deny_rename_folder_in_workspace_root',
						path: msg.ori_name
					};
					socket.emit('/file/rename', res_data);
				} else {
					

					//useonly(mode=goorm-oss)
					g_file.do_rename(msg, evt);
					
				}
			});

			

			//context ...
			socket.on('/file/get_property', function(msg) {
				var evt = new EventEmitter();

				evt.once('file_get_property', function(data) {
					socket.emit('/file/get_property', data);
				});

				g_file.get_property(msg, evt);
			});

			socket.on('/file/search_on_project', function(msg) {
				var evt = new EventEmitter();

				evt.once('file_do_search_on_project', function(data) {
					socket.emit('/file/search_on_project', data);
				});

				

				//useonly(mode=goorm-oss)
				g_search.do_search(msg, evt);
				
			});

			socket.on('kill_process', function(msg) {
				var allowed_process = ['svn', 'git', 'grep'];
				if (allowed_process.indexOf(msg.kill) === -1) {
					return;
				}

				
				//useonly(mode=goorm-oss)
				execFile('pkill', [msg.kill], function(err) {
					if (err) {
						console.log('kill search err : ' + err);
					}
				});
				

			})

			// check file or folder exists. Jeong-Min Im.
			socket.on('/file/exist', function(msg) {
				var evt = new EventEmitter();

				evt.once('file_check_exist', function(data) {
					socket.emit('/file/exist', data);
				});

				g_file.check_exist(msg, evt);
			});

			socket.on('/user/friend/list', function(msg) {
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						var m = {};
						m.user_id = user_data.id;
						m.query = msg.query;
						m.length = msg.length;
						m.seed = msg.seed;

						g_auth_manager.get_friend_list(m, function(user_list, end, seed) {
							socket.emit('/user/friend/list', {
								'result': true,
								'data': user_list,
								'end': end,
								'seed': seed
							});
						});
					} else {
						socket.emit('/user/friend/list', {
							'result': false
						});
					}
				});
			});

			// socket.on('/user/project/list/no_co_developers', function(msg) {});
			// socket.on('/user/project/collaboration/invitation/push', function(msg) {});
			

			//EDIT

			// socket.on('/edit/get_dictionary', function(msg) {
			// 	socket.emit('/edit/get_dictionary', {});
			// });

			
			
			
			//useonly(mode=goorm-standalone,goorm-oss)
			socket.on('/edit/save_tags', function(msg) {
				var option = msg;

				g_edit.save_tags_data(option, function() {
					socket.emit('/edit/save_tags', true);
				});

			});
			

			

			//svn socket. Jeong-Min Im.
			socket.on('/scm/svn', function(msg) {
				var evt = new EventEmitter();

				// for giving uid and gid to scm repository. Jeong-Min Im.
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.author_id = user_data.id;
						
						
						////// check user's permission //////
						if (msg.project_path && msg.project_path != '') { // exist project
							valid_project(user_data.id, msg.project_path, 'writable', function(result) {
								if (result) { // have permission
									g_scm.index(msg, evt); // go to scm.js -> sort commands
								} else { // have no permission
									var res_data = {
										err_code: 20,
										message: 'alert_scm_permission',
										path: msg.repository
									}
									socket.emit('/scm/svn/' + msg.mode, res_data);
								}
							});
						} else { // new project
							g_scm.index(msg, evt); // go to scm.js -> sort commands
						}
					}
				});

				// show checkout progress. Jeong-Min Im.
				var checkout_callback = function(data) {
					socket.emit('/scm/svn/checkout_progress', data);
				};
				var stdin_callback = function(option) {
					socket.emit('/scm/svn/stdin', option);
				};

				//check user uses scm and if user uses, set scm info to goorm.manifest. Jeong-Min Im.
				evt.once('scm_svn_do', function(data) { //get event from scm.svn.js -> result of svn command
					if (data === 0 && msg.scm_info) { // only when checkout(data will be 0 or 1) and checkout successes
						g_scm.set_scm_property(msg.author_id, msg.project_path, msg.scm_info, function(success) {
							if (!success) { // checkout fails
								socket.emit('/scm/svn/' + msg.mode, !success); //scm config setting is done. !success == true, true != 0 -> checkout fails
							} else {
								socket.emit('/scm/svn/' + msg.mode, data); //scm config setting is done. data == 0 (checkout success)
							}
						});
					} else {
						socket.emit('/scm/svn/' + msg.mode, data); //send this result to client scm.svn.js
					}

					// remove checkout progress socket listener
					if (msg.mode == 'checkout' || msg.mode == 'update') {
						evt.removeListener('scm_svn_do_checkout', checkout_callback);
					} else if (msg.mode === 'info') {
						evt.removeListener('scm_svn_stdin', stdin_callback);
					}
				});

				// add checkout progress socket listener
				if (msg.mode == 'checkout' || msg.mode == 'update') {
					evt.on('scm_svn_do_checkout', checkout_callback);
				} else if (msg.mode === 'info') {
					evt.once('scm_svn_stdin', stdin_callback);
				}
			});

			socket.on('/scm/svn/stdin', function(option) {
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						option.author_id = user_data.data.id; // for finding ps_list
						option.scm = 'svn'; // for indexing
						option.mode = 'stdin';

						g_scm.index(option);
					}
				});
			});

			//git socket. Jeong-Min Im.
			socket.on('/scm/git', function(msg) {
				var evt = new EventEmitter();

				// for giving uid and gid to scm repository. Jeong-Min Im.
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.author_id = user_data.id;
						
						
						////// check user's permission //////
						if (msg.project_path && msg.project_path != '') { // new project
							valid_project(user_data.id, msg.project_path, 'writable', function(result) {
								if (result) { // have permission
									g_scm.index(msg, evt); // go to scm.js -> sort commands
								} else { // have no permission
									var res_data = {
										err_code: 20,
										message: 'alert_scm_permission',
										path: msg.repository
									}
									socket.emit('/scm/git' + msg.mode, res_data);
								}
							});
						} else { // exist project
							g_scm.index(msg, evt); // go to scm.js -> sort commands
						}
					}
				});

				// show checkout progress. Jeong-Min Im.
				var checkout_callback = function(data) {
					socket.emit('/scm/git/checkout', data);
				};

				//check user uses scm and if user uses, set scm info to goorm.manifest. Jeong-Min Im.
				evt.once('scm_git_do', function(data) { //get event from scm.git.js -> result of git command
					if (data === 0 && msg.scm_info) { // only when checkout(data will be 0 or 1) and checkout successes
						g_scm.set_scm_property(msg.author_id, msg.project_path, msg.scm_info, function(success) {
							if (!success) {
								socket.emit('/scm/git' + msg.mode, !success); //scm config setting is done. !success == true, true != 0 -> checkout fails
							} else {
								socket.emit('/scm/git' + msg.mode, data); //scm config setting is done. data == 0 (checkout success)
							}
						});
					} else {
						socket.emit('/scm/git' + msg.mode, data); //send this result to client scm.git.js
					}

					// remove checkout progress socket listener
					if (msg.mode == 'checkout' || msg.mode == 'pull') {
						evt.removeListener('scm_git_do_checkout', checkout_callback);
					}
				});

				// add checkout progress socket listener
				if (msg.mode == 'checkout' || msg.mode == 'pull') {
					evt.on('scm_git_do_checkout', checkout_callback);
				}
			});

			

			

			

			
			/*
			

			
			*/
			socket.on('/upload/dir_skeleton', function(msg) {
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						var evt = new EventEmitter();

						var path = msg.target_path.split('/');
						var project_path = (path[0] !== '') ? path[0] : path[1];

						evt.once('upload_dir_skeleton', function(data) {
							socket.emit('/upload/dir_skeleton', data);
						});

						// validate permission
						//
						g_auth_project.can_edit_project(user_data.id, project_path, function(can_edit) {
							if (can_edit) {
								msg.user_id = user_data.id;

								g_file.upload_dir_skeleton(msg, evt);
							} else {
								socket.emit('/upload/dir_skeleton', {
									err_code: 20,
									message: 'Permission denied'
								});
							}
						});
					}
				});
			});

			

			

			///////
			//API end
			////////////

		});

	},

	get_session_id: function(socket_id, callback) {
		var client = this.io.sockets.socket(socket_id);
		var url = 'id_type';

		

		client.get(url, function(err, data) {
			if (data) {
				try { // jeongmin: try catching
					data = JSON.parse(data);

					var id = data.id;
					var sessionID = data.sessionID;

					if (sessionID) {
						callback(sessionID);
					} else {
						if (global.__redis_mode) {
							store.client.get('session_' + IDE_HOST + '_' + id, function(err, sessionID) {
								callback(sessionID);
							});
						} else {
							store.get('session_' + IDE_HOST + '_' + id, function(err, session_data) {
								var sessionID = session_data.session_id;

								callback(sessionID);
							});
						}
					}
				} catch (e) {
					console.log('get session id error:', e);
					callback({
						'result': false
					});
				}
			} else {
				callback({
					'result': false
				});
			}
		});
	},

	get_user_data: function(socket, callback) {
		var self = this;

		var load_from_socket_id = function(cb) {
			var socket_id = socket.id;

			self.get_session_id(socket_id, function(sessionID) {
				if (global.__redis_mode) {
					store.client.get(sessionID, function(err, user_data) {
						if (user_data) {
							try { // jeongmin: try catching
								user_data = JSON.parse(user_data);
								user_data.mode = MODE || user_data.mode || ['ide'];

								cb({
									'result': true,
									'data': user_data
								});
							} catch (e) {
								console.log('get user data error:', e);
								cb({
									'result': false
								});
							}
						} else {

							cb({
								'result': false
							});
						}
					});
				} else {
					store.get(sessionID, function(err, user) {
						try {
							var user_data = null;

							if (user && user.auth && user.auth.password) {
								user_data = user.auth.password.user;
							}
							if (user_data) {
								cb({
									'result': true,
									'data': user_data
								});
							} else {
								cb({
									'result': false
								});
							}
						} catch (e) {
							console.log('get_user_data error:', err, e);

							cb({
								'result': false
							});
						}
					});
				}
			});
		};

		var load_from_session_id = function(cb) {
			var sessionID = socket.handshake.sessionID;

			store.client.get(sessionID, function(err, user_data) {
				if (user_data) {
					try { // jeongmin: try catching
						user_data = JSON.parse(user_data);
						user_data.mode = MODE || user_data.mode || ['ide'];

						cb({
							'result': true,
							'data': user_data
						});
					} catch (e) {
						console.log('collaboration client store error:', e);
						cb({
							'result': false
						});
					}
				} else {
					cb({
						'result': false
					});
				}
			});
		};

		if (global.__redis_mode && socket && socket.handshake && socket.handshake.sessionID) {
			load_from_session_id(function(load) {
				if (load.result) {
					callback(load);
				} else {
					load_from_socket_id(function(load) {
						if (load.result) {
							callback(load);
						} else {

						}
					});
				}
			});
		} else {
			load_from_socket_id(callback);
		}
	}
}
