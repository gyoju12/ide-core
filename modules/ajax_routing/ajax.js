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
var fse = require("fs-extra");
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var EventEmitter = require('events').EventEmitter;

var g_file = require("../goorm.core.file/file");
var g_preference = require("../goorm.core.preference/preference");
var g_project = require("../goorm.core.project/project");
// var g_terminal = require("../goorm.core.terminal/terminal");
// var g_plugin = require("../goorm.plugin/plugin");
var g_help = require("../goorm.core.help/help");
var g_search = require("../goorm.core.search/search");
var g_edit = require("../goorm.core.edit/edit");
var g_secure = require("../goorm.core.secure/secure");


var g_auth = require("../goorm.core.auth/auth");
var g_auth_manager = require("../goorm.core.auth/auth.manager");
var g_auth_project = require("../goorm.core.auth/auth.project");





var check_special_characters = function(str) {
	str = str.replace(/([\~\!\@\#\$\%\^\&\*\=\+\|\:\;\?\"\<\>\(\)\[\]\{\}])/g, "\\$1");
	return str;
};

var check_valid_path = function(str) {
	if (!str) return false;
	return !(/\.\.|~|;|&|\|/.test(str));
};



module.exports = {
	start: function(io) {
		var self = this;
		self.io = io;

		// g_cloud_dropbox.start(io);
		io.set('log level', 0);
		io.sockets.on('connection', function(socket) {
			// join to goorm. Jeong-Min Im.
			socket.on('access', function(raw_msg) {
				try {
					var msg_obj = JSON.parse(raw_msg);
					var channel = "";
					if (msg_obj.channel !== undefined) {
						channel = msg_obj.channel;
					}

					if (channel == "join") {
						if (socket && socket.handshake && socket.handshake.sessionID) {
							var sessionID = socket.handshake.sessionID;
							store.client.set('socket_' + sessionID, socket.id);
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
										'id': id
									}));

									store.client.set(msg_obj.fs_express_id, JSON.stringify(user_data));
								}

								socket.to().emit('fs_access', fs_access);
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

			
			
			socket.on('/help/get_oss_license_ver', function() {
				var evt = new EventEmitter();

				evt.on('get_oss_license_ver', function(versions) {
					socket.emit('/help/get_oss_license_ver', versions);
				});

				g_help.get_oss_license_ver(evt);
			});
			
			//API : project

			socket.on('/project/valid', function(msg) {
				var evt = new EventEmitter();
				var valid = {};

				evt.on("project_over_limit", function(limit) {
					valid.result = false;
					valid.err_code = 1;
					valid.limit = limit;

					socket.emit("/project/valid", valid);
				});

				evt.on("project_exist", function() {
					valid.result = false;
					valid.err_code = 2;

					socket.emit("/project/valid", valid);
				});

				evt.on("project_duplicate_name", function() {
					valid.result = false;
					valid.err_code = 3;

					socket.emit("/project/valid", valid);
				});

				evt.on("project_valid_success", function() {
					valid.result = true;
					valid.err_code = 0;

					socket.emit("/project/valid", valid);
				});

				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg['author'] = {
							author_id: user_data.id
						}
					}

					g_project.valid(msg, evt);
				});
			});

			socket.on('/project/new', function(msg) {
				var evt = new EventEmitter();

				//check user uses scm and if user uses, set scm info to goorm.manifest. Jeong-Min Im.
				evt.on("project_do_new", function(data) {
					// set goorm.manifest's uid as root. Jeong-Min Im.
					g_auth_project.manifest_setting(data.project_dir, function() {
						socket.emit("/project/new", data);
					});
				});
				

				

				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.user_id = user_data.id;
						g_project.do_new(msg, evt);
					}
				});
			});

			socket.on('/project/delete', function(msg) {
				var evt = new EventEmitter();

				evt.on("project_do_delete", function(data) {
					socket.emit("/project/delete", data);
				});

				

				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg.id = user_data.id;

						
						
						g_project.do_delete(msg, evt);
						
					}
				});
			});

			socket.on('/project/get_list', function(msg) {
				var evt = new EventEmitter();

				evt.on("project_get_list", function(data) {
					// jeongmin: differ socket's destination according to get_list_type
					switch (msg.get_list_type) {
						
						case 'export_list':
							socket.emit("/project/get_list/export", data);
							break;

						case 'owner_list':
							socket.emit("/project/get_list/owner", data);
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
			socket.on('/project/import', function(msg) {});
			//cannot file
			socket.on('/project/export', function(msg) {});

			//not used
			socket.on('/project/clean', function(msg) {
				var evt = new EventEmitter();

				evt.on("project_do_clean", function(data) {
					socket.emit("/project/clean", data);
				});

				g_project.do_clean(msg, evt);
			});

			socket.on('/project/get_property', function(msg) {
				var evt = new EventEmitter();
				evt.on("get_property", function(data) {
					if (data.contents) {
						
						
						socket.emit("/project/get_property", data);
						
					} else {}
					// socket.emit("/project/get_property", data);  :emit twice, so removed
				});

				g_project.get_property(msg, evt);
			});

			socket.on('/project/set_property', function(msg) {
				var evt = new EventEmitter();
				evt.on("set_property", function(data) {
					socket.emit("/project/set_property", data);
				});

				g_project.set_property(msg, evt);
			});


			socket.on('/project/check_running_project', function(msg) {
				socket.emit("/project/check_running_project", {
					'result': 0
				});
			});

			socket.on('/project/check_latest_build', function(msg) {
				var evt = new EventEmitter();
				evt.on("check_latest_build", function(data) {
					socket.emit("/project/check_latest_build", data);
				});
				g_project.check_latest_build(msg, evt);
			});

			socket.on('/project/check_valid_property', function(msg) {
				var evt = new EventEmitter();
				evt.on("check_valid_property", function(data) {
					socket.emit("/project/check_valid_property", data);
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

			socket.on('/project/move_file', function(msg) {
				var evt = new EventEmitter();
				evt.on('move_file', function(data) {
					socket.emit('/project/move_file', data);
				});

				g_project.move_file(msg, evt);
			});


			// goorm.manifest validation when login. Jeong-Min Im.
			socket.on('/project/valid_manifest', function(msg) {
				var evt = new EventEmitter();

				// validate goorm.manifest. Jeong-Min Im.
				evt.on('project_get_list', function(data) {
					for (var i = data.length - 1; 0 <= i; i--) {
						g_auth_project.valid_manifest(data[i].name, data[i].contents, function() {
							socket.emit('/project/valid_manifest');
						});
					}
				});

				// get user's project list. Jeong-Min Im.
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						msg['author'] = {
							author_id: user_data.id
						};
						msg.get_list_type = 'collaboration_list';

						g_project.get_list(msg, evt);
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

							var workspace = global.__workspace + "/" + project_data.project_dir;
							var template_path = global.__path + 'temp_files/' + user_data.id + '/plugins/' + plugin_name;

							// Default Plugin
							//
							if (global.plugins_list && global.plugins_list.length > 0) {
								var is_default_plg = global.plugins_list.some(function(o) {
									if (o && o.name === plugin_name) return true;
								});

								if (is_default_plg) {
									template_path = global.__path + 'plugins/' + plugin_name;
								}
							}

							var template = template_path + "/template";

							if (project_data.project_detailed_type) {
								try {
									var syncStat = fs.statSync(template + "/" + project_data.project_detailed_type.replace(/\s/g, "\ "));
									if (!syncStat || !syncStat.isDirectory()) {

									} else {
										template += "/" + project_data.project_detailed_type.replace(/\s/g, "\\ ");
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
								fs.readFile(workspace + "/goorm.manifest", 'utf-8', function(err, file_data) {
									var contents = JSON.parse(file_data);

									contents.plugins = project_data.plugins;
									contents.detailedtype = project_data.project_detailed_type;

									fs.writeFile(workspace + "/goorm.manifest", JSON.stringify(contents), {
										encoding: 'utf-8',
										mode: 0700
									}, function(err) {
										if (err) {
											console.log('goorm.manifest write err in do_create:', err);
										}
										

										

										

										
										socket.to().emit('/plugin/create', {
											code: 200,
											message: "success"
										});
										
									});
								});
							});

							// fse.copy(template, workspace, function (__err) {
							// 	if (__err) {
							// 		console.log("do_create error!:", __err);
							// 	}
							// 	fs.readFile(workspace + "/goorm.manifest", 'utf-8', function(err, file_data) {
							// 		var contents = JSON.parse(file_data);

							// 		contents.plugins = project_data.plugins;
							// 		contents.detailedtype = project_data.project_detailed_type;

							// 		fs.writeFile(workspace + "/goorm.manifest", JSON.stringify(contents), {
							// 			encoding: 'utf-8',
							// 			mode: 0700
							// 		}, function(err) {
							// 			if (err) {
							// 				console.log(err);
							// 			}
							// 			

							// 			

							// 			

							// 			
							// 			socket.to().emit('/plugin/create', {
							// 				code: 200,
							// 				message: "success"
							// 			});
							// 			
							// 		});
							// 	});
							// });
						};

						
						copy();
						

						
					}
				});
			});

			socket.on('/plugin/do_web_run', function(msg) {
				var uid = null;
				var gid = null;
				var copy = function() {
					var workspace = global.__workspace + "/" + msg.project_path;

					var target_path = (msg.deploy_path) ? msg.deploy_path + '/' + msg.project_path : __temp_dir + "plugins/web/" + msg.project_path;

					var run_path = target_path.split("temp_files").pop();
					fse.ensureDir(target_path, function(__err1) {
						fse.copy(workspace, target_path, function(__err2) {
							if (__err1 || __err2) {
								console.log('do_web_run Err:', __err1, __err2);
								socket.to().emit('/plugin/do_web_run', {
									code: 500,
									message: "Copy Error",
								});
							} else {

								

								socket.to().emit('/plugin/do_web_run', {
									code: 200,
									message: "success",
									run_path: run_path
								});
							}
						});
					});
				};
				
				
				copy();
				
			});

			//API : FS
			socket.on('/file/new', function(msg) {
				var evt = new EventEmitter();

				evt.on("file_do_new", function(data) {
					socket.emit("/file/new", data);
				});

				// for edu (ver 1.5)
				// self.get_user_data(socket, function(user_data) {
				// 	var msg_path = msg.path.split("/");

				// 	var project_path = msg_path[0];
				// 	if (project_path == "")
				// 		project_path = msg_path[1];
				// 	//jeongmin: minimize executing split

				// 	g_auth_project.get({
				// 		'project_path': project_path
				// 	}, function(data) {
				// 		if (data != null) {
				// 			var user_level = user_data.level;

				// 			g_auth_manager.get({
				// 				'id': data.author_id,
				// 				'type': data.author_type
				// 			}, function(data) {
				// 				var author_level = data.level;

				// 				if (user_level == 'Member' && author_level == 'Assistant') {
				// 					var res_data = {
				// 						err_code: 20,
				// 						message: 'alert_file_permission',
				// 						path: msg.ori_name
				// 					};

				// 					socket.emit("/file/new", res_data);
				// 				} else {
				// 					g_file.do_new(msg, evt);
				// 				}
				// 			});
				// 		} else {
				// 			var res_data = {
				// 				err_code: 20,
				// 				message: 'alert_file_permission',
				// 				path: msg.ori_name
				// 			};
				// 			socket.emit("/file/new", res_data);
				// 		}
				// 	});
				// });

				

				
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

				evt.on("file_do_new_folder", function(data) {
					socket.emit("/file/new_folder", data);
				});

				// for edu (ver 1.5)
				// self.get_user_data(socket, function(user_data) {
				// 	var msg_current_path = msg.current_path.split("/");

				// 	var project_path = msg_current_path[0];
				// 	if (project_path == "")
				// 		project_path = msg_current_path[1];
				// 	//jeongmin: minimize executing split

				// 	g_auth_project.get({
				// 		'project_path': project_path
				// 	}, function(data) {
				// 		if (data != null) {
				// 			var user_level = user_data.level;

				// 			g_auth_manager.get({
				// 				'id': data.author_id,
				// 				'type': data.author_type
				// 			}, function(data) {
				// 				var author_level = data.level;

				// 				if (user_level == 'Member' && author_level == 'Assistant') {
				// 					var res_data = {
				// 						err_code: 20,
				// 						message: 'alert_file_permission',
				// 						path: msg.ori_name
				// 					};
				// 					socket.emit("/file/new_folder", res_data);

				// 				} else {
				// 					g_file.do_new_folder(msg, evt);
				// 				}
				// 			});
				// 		} else {
				// 			var res_data = {
				// 				err_code: 20,
				// 				message: 'alert_file_permission',
				// 				path: msg.ori_name
				// 			};
				// 			socket.emit("/file/new_folder", res_data);
				// 		}
				// 	});
				// });
				

				

				
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

				evt.on("file_do_new_untitled_text_file", function(data) {
					socket.emit("/file/new_untitled_text_file", data);
				});

				// for edu (ver 1.5)
				// self.get_user_data(socket, function(user_data) {
				// 	var msg_current_path = msg.current_path.split("/");

				// 	var project_path = msg_current_path[0];
				// 	if (project_path == "")
				// 		project_path = msg_current_path[1];
				// 	//jeongmin: minimize executing split

				// 	g_auth_project.get({
				// 		'project_path': project_path
				// 	}, function(data) {
				// 		if (data != null) {
				// 			var user_level = user_data.level;

				// 			g_auth_manager.get({
				// 				'id': data.author_id,
				// 				'type': data.author_type
				// 			}, function(data) {
				// 				var author_level = data.level;

				// 				if (user_level == 'Member' && author_level == 'Assistant') {
				// 					var res_data = {
				// 						err_code: 20,
				// 						message: 'alert_file_permission',
				// 						path: msg.ori_name
				// 					};

				// 					socket.emit("/file/new_untitled_text_file", res_data);
				// 				} else {
				// 					g_file.do_new_untitled_text_file(msg, evt);
				// 				}
				// 			});
				// 		} else {
				// 			var res_data = {
				// 				err_code: 20,
				// 				message: 'alert_file_permission',
				// 				path: msg.ori_name
				// 			};

				// 			socket.emit("/file/new_untitled_text_file", res_data);
				// 		}
				// 	});
				// });
				

				

				
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

				evt.on("file_do_new_other", function(data) {
					socket.emit("/file/new_other", data);
				});

				//for edu(ver 1.5)
				// self.get_user_data(socket, function(user_data) {
				// 	var msg_current_path = msg.current_path.split("/");

				// 	var project_path = msg_current_path[0];
				// 	if (project_path == "")
				// 		project_path = msg_current_path[1];
				// 	//jeongmin: minimize executing split

				// 	g_auth_project.get({
				// 		'project_path': project_path
				// 	}, function(data) {
				// 		if (data != null) {
				// 			var user_level = user_data.level;

				// 			g_auth_manager.get({
				// 				'id': data.author_id,
				// 				'type': data.author_type
				// 			}, function(data) {
				// 				var author_level = data.level;

				// 				if (user_level == 'Member' && author_level == 'Assistant') {
				// 					var res_data = {
				// 						err_code: 20,
				// 						message: 'alert_file_permission',
				// 						path: msg.ori_name
				// 					};

				// 					socket.emit("/file/new_other", res_data);
				// 				} else {
				// 					g_file.do_new_other(msg, evt);
				// 				}
				// 			});
				// 		} else {
				// 			var res_data = {
				// 				err_code: 20,
				// 				message: 'alert_file_permission',
				// 				path: msg.ori_name
				// 			};

				// 			socket.emit("/file/new_other", res_data);
				// 		}
				// 	});
				// });
				

				

				
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

				evt.on("file_do_save_as", function(data) {
					socket.emit("/file/save_as", data);
				});

				

				

				
				g_file.do_save_as(msg, evt);
				
			});

			socket.on('/file/delete', function(msg) {


				var evt = new EventEmitter();
				var user_level = null;
				var author_level = null;

				evt.on("file_do_delete", function(data) {
					socket.emit("/file/delete", data);
				});

				//for edu(ver 1.5)
				// self.get_user_data(socket, function(user_data) {
				// 	var msg_filename = msg.filename.split("/");

				// 	var project_path = msg_filename[0];
				// 	if (project_path == "")
				// 		project_path = msg_filename[1];
				// 	//jeongmin: minimize executing split

				// 	g_auth_project.get({
				// 		'project_path': project_path
				// 	}, function(data) {
				// 		if (data != null) {
				// 			var user_level = user_data.level;

				// 			g_auth_manager.get({
				// 				'id': data.author_id,
				// 				'type': data.author_type
				// 			}, function(data) {
				// 				var author_level = data.level;

				// 				if (user_level == 'Member' && author_level == 'Assistant') {
				// 					var res_data = {
				// 						err_code: 20,
				// 						message: 'alert_file_permission',
				// 						path: msg.ori_name
				// 					};

				// 					socket.emit("/file/delete", res_data);
				// 				} else {
				// 					g_file.do_delete(msg, evt);
				// 					g_history.empty_file_history(msg.filename);
				// 				}
				// 			});
				// 		} else {
				// 			var res_data = {
				// 				err_code: 20,
				// 				message: 'alert_file_permission',
				// 				path: msg.ori_name
				// 			};

				// 			socket.emit("/file/delete", res_data);
				// 		}
				// 	});

				// });
				

				

				
				g_file.do_delete(msg, evt);
				
			});

			//context menu err
			socket.on('/file/delete_all', function(msg) {
				var files = msg.files;
				var directories = msg.directorys;

				

				
				g_file.do_delete_all(msg, function(result) {
					socket.emit("/file/delete_all", result);
				});
				
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
					// fs.readFile(abs_path, "utf8", function(err, data) {
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

				
				fs.readFile(abs_path, "utf8", function(err, data) {
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

				evt.on("file_put_contents", function(data) {
					socket.emit("/file/put_contents", data);
				});

				

				
				g_file.put_contents(msg, evt);
				
			});


			//later....test
			socket.on('/file/get_result_ls', function(msg) {
				var evt = new EventEmitter();

				evt.on("got_result_ls", function(data) {
					socket.emit("/file/get_result_ls" + msg.path, data);
				});

				

				
				g_file.get_result_ls(msg, evt);
				
			});

			socket.on('/file/check_valid_edit', function(msg) {
				var evt = new EventEmitter();
				var project_path = msg.project_path;
				var filepath = msg.filepath;
				var filename = msg.filename;

				if (project_path && filepath && filename) {
					filepath = filepath.replace(/\/\//g, "/");
					if (!check_valid_path(project_path) || !check_valid_path(filepath) || !check_valid_path(filename)) {
						socket.emit("/file/check_valid_edit", {});
						return false;
					}
				} else {
					socket.emit("/file/check_valid_edit", {});
					return false;
				}
				
				
				// file validate
				// 
				evt.on("check_valid_edit", function(data) {
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
					socket.emit("/file/check_valid_edit", data);
				});
				g_file.check_valid_edit(project_path, filepath, filename, evt);
				
			});


			// context ....
			socket.on('/file/move', function(msg) {
				var evt = new EventEmitter();
				var user_level = null;
				var author_level = null;

				var move_fail = function(fail_msg) {
					var res_data = {
						err_code: 20,
						message: fail_msg,
						path: msg
					};

					socket.emit("/file/move", res_data);
				};
				evt.on("file_do_move", function(data) {
					socket.emit("/file/move", data);
				});

				

				
				g_file.do_move(msg, evt);
				
			});
			socket.on('/file/rename', function(msg) {
				var evt = new EventEmitter();
				var user_level = null;
				var author_level = null;

				evt.on("file_do_rename", function(data) {
					socket.emit("/file/rename", data);
				});

				if (msg.ori_path === '/' || msg.ori_path === '') {
					var res_data = {
						err_code: 20,
						message: 'alert_deny_rename_folder_in_workspace_root',
						path: msg.ori_name
					};
					socket.emit("/file/rename", res_data);
				} else {
					//for edu (ver 1.5)
					// self.get_user_data(socket, function(user_data) {
					// 	var msg_ori_path = msg.ori_path;
					// 	var msg_ori_path_split = msg_ori_path.split("/");

					// 	var __ori_path = (msg_ori_path == "/") ? msg_ori_path + msg.ori_file : msg_ori_path;
					// 	__ori_path = (msg_ori_path_split[0] == "") ? msg_ori_path_split[1] : msg_ori_path_split[0];
					// 	//jeongmin: access object member less and minimize executing split

					// 	g_auth_project.get({
					// 		'project_path': __ori_path
					// 	}, function(data) {
					// 		if (data != null) {
					// 			var user_level = user_data.level;

					// 			g_auth_manager.get({
					// 				'id': data.author_id,
					// 				'type': data.author_type
					// 			}, function(data) {
					// 				var author_level = data.level;

					// 				if (user_level == 'Member' && author_level == 'Assistant') {
					// 					var res_data = {
					// 						err_code: 20,
					// 						message: 'alert_file_permission',
					// 						path: msg.ori_name
					// 					};
					// 					socket.emit("/file/rename", res_data);
					// 				} else {
					// 					g_file.do_rename(msg, evt);
					// 				}
					// 			});
					// 		} else {
					// 			var res_data = {
					// 				err_code: 20,
					// 				message: 'alert_file_permission',
					// 				path: msg.ori_name
					// 			};
					// 			socket.emit("/file/rename", res_data);
					// 		}
					// 	});
					// });
					

					

					
					g_file.do_rename(msg, evt);
					
				}
			});

			

			//context ...
			socket.on('/file/get_property', function(msg) {
				var evt = new EventEmitter();

				evt.on("file_get_property", function(data) {
					socket.emit("/file/get_property", data);
				});

				g_file.get_property(msg, evt);
			});

			socket.on('/file/search_on_project', function(msg) {
				var evt = new EventEmitter();

				evt.on("file_do_search_on_project", function(data) {
					socket.emit("/file/search_on_project", data);
				});

				

				
				g_search.do_search(msg, evt);
				
			});

			// check file or folder exists. Jeong-Min Im.
			socket.on('/file/exist', function(msg) {
				var evt = new EventEmitter();

				evt.on('file_check_exist', function(data) {
					socket.emit('/file/exist', data);
				});

				g_file.check_exist(msg, evt);
			});

			//cannot
			socket.on('/file/copy_file_paste', function(msg) {});
			//cannot
			socket.on('/file/get_file', function(msg) {});
			//cannot
			socket.on('/file/import', function(msg) {});
			//cannot
			socket.on('/file/export', function(msg) {});

			//API : Preference
			socket.on("/preference/workspace_path", function(msg) {

				socket.emit("/preference/workspace_path", {
					"path": global.__workspace
				});
			});

			socket.on('/preference/get_server_info', function(msg) {
				var evt = new EventEmitter();
				evt.on("preference_get_server_info", function(data) {
					socket.emit("/preference/get_server_info", data);
				});
				g_preference.get_server_info(msg, evt);
			});
			socket.on('/preference/get_goorm_info', function(msg) {

				var evt = new EventEmitter();
				evt.on("preference_get_goorm_info", function(data) {
					socket.emit("/preference/get_goorm_info", data);
				});

				g_preference.get_goorm_info(msg, evt);

			});
			// socket.on('/preference/put_filetypes', function(msg) {	// hidden by jeongmin: file type is deprecated

			// 	var evt = new EventEmitter();
			// 	evt.on("preference_put_filetypes", function(data) {
			// 		socket.emit("/preference/put_filetypes", data);
			// 	});

			// 	g_preference.put_filetypes(msg, evt);
			// });

			

			//EDIT

			socket.on('/edit/get_dictionary', function(msg) {
				socket.emit("/edit/get_dictionary", {});
			});

			
			
			
			
			
			
			socket.on('/edit/save_tags', function(msg) {
				var option = msg;

				g_edit.save_tags_data(option);
				socket.emit("/edit/save_tags", true);
			});
			
			
			
			

			

			

			

			

			
			
			/*
			
			

			
			*/
			socket.on('/upload/dir_skeleton', function(msg) {
				self.get_user_data(socket, function(user_data) {
					if (user_data.result) {
						user_data = user_data.data;

						var evt = new EventEmitter();

						var path = msg.target_path.split('/');
						var project_path = (path[0] !== "") ? path[0] : path[1];

						evt.on("upload_dir_skeleton", function(data) {
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
									message: "Permission denied"
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

					if (global.__redis_mode) {
						store.client.get('session_' + id, function(err, sessionID) {
							callback(sessionID);
						});
					} else {
						store.get('session_' + id, function(err, session_data) {
							var sessionID = session_data.session_id;

							callback(sessionID);
						});
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

	// update_session: function(sessionID, user) {
	// 	var user_data = user;

	// 	// for (var attr in user_schema) {
	// 	// 	if (attr == 'deleted' || attr == 'last_access_time')
	// 	// 		continue;
	// 	// 	user_data[attr] = user[attr];
	// 	// }

	// 	// Redis Store
	// 	if (global.__redis_mode) {
	// 		store.client.set('session_' + user_data.id, sessionID);
	// 		store.client.set(sessionID, JSON.stringify(user_data));
	// 	} else {
	// 		// session.auth = {
	// 		// 	loggedIn: true
	// 		// };
	// 		// session.auth[user.type.toLowerCase()] = {
	// 		// 	user: user_data
	// 		// };
	// 		//jeongmin: literal is faster

	// 		store.set('session_' + user_data.id, {
	// 			'cookie': {
	// 				'expires': null
	// 			},
	// 			'session_id': sessionID
	// 		});
	// 		store.set(sessionID, {
	// 			'cookie': {
	// 				'expires': null
	// 			},
	// 			'user_data': JSON.stringify(user_data)
	// 		});
	// 	}

	// 	if (global.__sso_mode) {
	// 		var postdata = {
	// 			'user_data': user_data,
	// 			'session_id': sessionID,
	// 			'session_type': global.__service_config.session_type
	// 		};

	// 		var post_data = querystring.stringify({
	// 			'data': JSON.stringify(postdata)
	// 		});
	// 		var post_options = {
	// 			'host': '127.0.0.1',
	// 			'port': 81,
	// 			'path': '/session/save',
	// 			'method': 'POST',
	// 			'headers': {
	// 				'Content-Type': 'application/x-www-form-urlencoded',
	// 				'Content-Length': post_data.length
	// 			}
	// 		};

	// 		var content = "";
	// 		var post_req = http.request(post_options);
	// 		post_req.on('error', function(e) {
	// 			console.log(e);
	// 		});

	// 		post_req.write(post_data);
	// 		post_req.end();
	// 	}
	// }
}