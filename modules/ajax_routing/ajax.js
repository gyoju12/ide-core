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
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var EventEmitter = require('events').EventEmitter;

var g_file = require("../goorm.core.file/file");
var g_preference = require("../goorm.core.preference/preference");
var g_project = require("../goorm.core.project/project");
// var g_terminal = require("../goorm.core.terminal/terminal");
// var g_plugin = require("../goorm.plugin/plugin");
// var g_help = require("../goorm.core.help/help");
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
						

						socket.set('id_type', JSON.stringify({
							'id': msg_obj.user
						}));

						

						if (!msg_obj.refresh) {
							socket.to().emit('user_access');
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

				self.get_user_data(socket.id, function(user_data) {
					msg['author'] = {
						author_id: user_data.id
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
					// if (msg.use_scm)
					// 	g_auth_project.set_scm_property(data.project_author, data.project_name, msg.scm_info, function(success) {
					// 		if (success)
					// 			socket.emit("/project/new", !success); //scm config setting is done
					// 		else
					// 			socket.emit("/project/new", data); //scm config setting is done
					// 	}); // evt.emit('project_new_scm_setting', data)
					// else

				});
				
				self.get_user_data(socket.id, function(user_data) {
					msg.user_id = user_data.id;
					g_project.do_new(msg, evt);
				});
			});

			socket.on('/project/delete', function(msg) {
				var evt = new EventEmitter();

				evt.on("project_do_delete", function(data) {
					socket.emit("/project/delete", data);
				});

				
				self.get_user_data(socket.id, function(user_data) {
					
					
					g_project.do_delete(msg, evt, user_data);
					
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


				self.get_user_data(socket.id, function(user_data) {
					msg['author'] = {
						author_id: user_data.id
					}

					g_project.get_list(msg, evt);
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

				self.get_user_data(socket.id, function(user_data) {
					msg.uid = user_data.uid;
					msg.gid = user_data.gid;
					g_project.check_valid_property(msg, evt);
				});
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
				self.get_user_data(socket.id, function(user_data) {
					msg['author'] = {
						author_id: user_data.id
					};
					msg.get_list_type = 'collaboration_list';

					g_project.get_list(msg, evt);
				});
			});

			//API : FS
			socket.on('/file/new', function(msg) {
				var evt = new EventEmitter();

				evt.on("file_do_new", function(data) {
					socket.emit("/file/new", data);
				});

				// for edu (ver 1.5)
				// self.get_user_data(socket.id, function(user_data) {
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

				

				
				self.get_user_data(socket.id, function(user_data) {
					msg.user_id = user_data.id;
					g_file.do_new(msg, evt);
				});
				
			});
			socket.on('/file/new_folder', function(msg) {
				var evt = new EventEmitter();

				evt.on("file_do_new_folder", function(data) {
					socket.emit("/file/new_folder", data);
				});

				// for edu (ver 1.5)
				// self.get_user_data(socket.id, function(user_data) {
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
				

				

				
				self.get_user_data(socket.id, function(user_data) {
					msg.user_id = user_data.id;
					g_file.do_new_folder(msg, evt);

				});
				
			});
			socket.on('/file/new_untitled_text_file', function(msg) {
				var evt = new EventEmitter();

				evt.on("file_do_new_untitled_text_file", function(data) {
					socket.emit("/file/new_untitled_text_file", data);
				});

				// for edu (ver 1.5)
				// self.get_user_data(socket.id, function(user_data) {
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
				

				

				
				self.get_user_data(socket.id, function(user_data) {
					msg.user_id = user_data.id;
					g_file.do_new_untitled_text_file(msg, evt);
				});
				
			});
			socket.on('/file/new_other', function(msg) {

				var evt = new EventEmitter();

				evt.on("file_do_new_other", function(data) {
					socket.emit("/file/new_other", data);
				});

				//for edu(ver 1.5)
				// self.get_user_data(socket.id, function(user_data) {
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
				

				

				
				self.get_user_data(socket.id, function(user_data) {
					msg.user_id = user_data.id;
					g_file.do_new_other(msg, evt);
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
				// self.get_user_data(socket.id, function(user_data) {
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
					// self.get_user_data(socket.id, function(user_data) {
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
			
			
			
			//not used???
			socket.on('/edit/load_tags', function(msg) {
				var option = msg;

				g_edit.load_tags_data(option, function(response) {
					socket.emit("/edit/load_tags", response);
				});
			});
			
			
			
			//API : dropbox
			// dropbox app authorized
			// socket.on('/cloud/dropbox_login', function() {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			var access_token = {};

			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				if (preference.api) {
			// 					if (preference.api.dropbox && preference.api.dropbox.access_token) {
			// 						access_token = preference.api.dropbox.access_token;
			// 					}
			// 				}
			// 				g_cloud_dropbox.login(user_data, access_token, socket, function(user) {
			// 					self.get_session_id(socket.id, function(session_id) {
			// 						self.update_session(session_id, user);
			// 					});
			// 				});
			// 			} catch (e) {
			// 				console.log('dropbox login error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // dropbox app authorized out
			// socket.on('/cloud/dropbox_logout', function() {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		g_cloud_dropbox.logout(user_data, function(user) {
			// 			self.get_session_id(socket.id, function(session_id) {
			// 				console.log("dropbox: logout access_token is { null } ");
			// 				self.update_session(session_id, user);
			// 				g_cloud_dropbox.check_login(socket.id, user);
			// 			});
			// 		});
			// 	});
			// });

			// // change UI state (login or logout)
			// socket.on('/cloud/dropbox_islogin', function() {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		g_cloud_dropbox.check_login(socket.id, user_data);
			// 	});
			// });

			// // dropbox make directory
			// socket.on('/cloud/dropbox_mkdir', function(dir_name) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				//		if(preference.api){
			// 				//			if(preference.api.dropbox){
			// 				var access_token = preference.api.dropbox.access_token;
			// 				g_cloud_dropbox.make_dir(dir_name, access_token, function(reply) {
			// 					console.log("dropbox: make directory");
			// 					console.log(reply);
			// 				});
			// 				//			}
			// 				//		}
			// 			} catch (e) {
			// 				console.log('making dropbox directory error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // dropbox make file
			// socket.on('/cloud/dropbox_mkfile', function(file_name, file_text) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				//		if(preference.api){
			// 				//			if(preference.api.dropbox){
			// 				var access_token = preference.api.dropbox.access_token;
			// 				g_cloud_dropbox.make_file(file_name, file_text, access_token, function(reply) {
			// 					console.log("dropbox: make file");
			// 					console.log(reply);
			// 				});
			// 				//			}
			// 				//		}
			// 			} catch (e) {
			// 				console.log('making dropbox file error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // dropbox copy file
			// socket.on('/cloud/dropbox_cpfile', function(from_path, to_path) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				//		if(preference.api){
			// 				//			if(preference.api.dropbox){
			// 				var access_token = preference.api.dropbox.access_token;
			// 				g_cloud_dropbox.copy_file(from_path, to_path, access_token, function(reply) {
			// 					console.log("dropbox: copy file from " + from_path + "  to " + to_path);
			// 					console.log(reply);
			// 				});
			// 				//			}
			// 				//		}
			// 			} catch (e) {
			// 				console.log('copying dropbox file error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // dropbox move file
			// socket.on('/cloud/dropbox_mvfile', function(from_path, to_path) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				//		if(preference.api){
			// 				//			if(preference.api.dropbox){
			// 				var access_token = preference.api.dropbox.access_token;
			// 				g_cloud_dropbox.move_file(from_path, to_path, access_token, function(reply) {
			// 					console.log("dropbox: move file from " + from_path + "  to " + to_path);
			// 					console.log(reply);
			// 				});
			// 				//			}
			// 				//		}
			// 			} catch (e) {
			// 				console.log('moving dropbox file error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // delete file or directory
			// socket.on('/cloud/dropbox_delete', function(file_name) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				//		if(preference.api){
			// 				//			if(preference.api.dropbox){
			// 				var access_token = preference.api.dropbox.access_token;
			// 				g_cloud_dropbox.delete_file(file_name, access_token, function(reply) {
			// 					socket.emit("dropbox_delete_file");
			// 				});
			// 				//			}
			// 				//		}
			// 			} catch (e) {
			// 				console.log('deleting dropbox error(can\'t cat user preference):', e);
			// 			}
			// 		}
			// 	});
			// });

			// socket.on('/cloud/dropbox_upload_files', function(from_path, to_path, is_dir) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				//		if(preference.api){
			// 				//			if(preference.api.dropbox){
			// 				var access_token = preference.api.dropbox.access_token;
			// 				g_cloud_dropbox.upload_files(from_path, to_path, is_dir, access_token, function() {});
			// 				//			}
			// 				//		}
			// 			} catch (e) {
			// 				console.log('uploading dropbox files error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // make new project (in dropbox)
			// socket.on('/cloud/dropbox_make_new_project', function(data, plugin_name) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				//		if(preference.api){
			// 				//			if(preference.api.dropbox){
			// 				var access_token = preference.api.dropbox.access_token;
			// 				g_cloud_dropbox.make_new_project(data, plugin_name, socket.id, access_token, function() {});
			// 				//			}
			// 				//		}
			// 			} catch (e) {
			// 				console.log('making new dropbox project error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // get file information (type)
			// socket.on('/cloud/dropbox_get_metadata', function(path) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				//		if(preference.api){
			// 				//			if(preference.api.dropbox){
			// 				var access_token = preference.api.dropbox.access_token;
			// 				g_cloud_dropbox.get_metadata(path, access_token, function(reply) {
			// 					console.log("dropbox: get directory or file metadata");
			// 					console.log(reply);
			// 				});
			// 				//			}
			// 				//		}
			// 			} catch (e) {
			// 				console.log('getting dropbox metadata error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // get file contents 
			// socket.on('/cloud/dropbox_get_file_contents', function(filepath, filename, filetype) {
			// 	var path = filepath + filename;
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				if (preference.api) {
			// 					if (preference.api.dropbox) {
			// 						var access_token = preference.api.dropbox.access_token;
			// 						g_cloud_dropbox.get_file_contents(path, access_token, function(status, contents) {
			// 							// show editor
			// 							var data = "";
			// 							if (status == 200) {
			// 								data = contents;
			// 							} else {
			// 								data = status + " : " + contents;
			// 							}
			// 							socket.emit("dropbox_get_contents" + filepath + filename, data);
			// 						});
			// 					}
			// 				}
			// 			} catch (e) {
			// 				console.log('getting dropbox file contents error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // open new window (media file)
			// socket.on('/cloud/dropbox_get_media_url', function(filepath, filename, filetype) {
			// 	var path = filepath + filename;
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				if (preference.api) {
			// 					if (preference.api.dropbox) {
			// 						var access_token = preference.api.dropbox.access_token;
			// 						g_cloud_dropbox.get_media_url(path, access_token, function(media) {
			// 							socket.emit("dropbox_get_media_url" + filepath + filename, media.url);
			// 						});
			// 					}
			// 				}
			// 			} catch (e) {
			// 				console.log('getting dropbox media url error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // get projects (directory that have goorm.manifest)
			// socket.on('/cloud/dropbox_get_project_list', function() {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				if (preference.api) {
			// 					if (preference.api.dropbox) {
			// 						var access_token = preference.api.dropbox.access_token;
			// 						g_cloud_dropbox.get_project_list(access_token, function(list) {
			// 							socket.emit("dropbox_get_project_list", list);
			// 						});
			// 					}
			// 				}
			// 			} catch (e) {
			// 				console.log('getting dropbox project list error:', e);
			// 			}
			// 		}
			// 	});
			// });

			// // read directory and file
			// socket.on('/cloud/dropbox_get_file_list', function(path, recursive, details) {
			// 	self.get_user_data(socket.id, function(user_data) {
			// 		if (user_data.result) {
			// 			try { // jeongmin: try catching
			// 				var preference = JSON.parse(user_data.preference);

			// 				if (preference.api) {
			// 					if (preference.api.dropbox) {
			// 						var access_token = preference.api.dropbox.access_token;
			// 						var options = {
			// 							recursive: recursive,
			// 							details: details
			// 						}

			// 						var evt = new EventEmitter();
			// 						evt.on("dropbox_got_result_ls", function(data) {
			// 							socket.emit("/cloud/dropbox_get_file_list" + path, data);
			// 						});

			// 						g_cloud_dropbox.read_dir(path, options, access_token, function(reply) {
			// 							socket.emit("dropbox_get_file_list" + path, reply);
			// 						});
			// 					}
			// 				}
			// 			} catch (e) {
			// 				console.log('getting dropbox file list error:', e);
			// 			}
			// 		}
			// 	});
			// });


			socket.on('/get_lxc_data', function(msg) {
				var __name = msg.name;
				var send = function(user_id, name, i, last) {
					console.log("Send: " + i);

					// SEND & WAITING
					//
					g_auth.load_auth_data(user_id, function(auth_data) {
						if (auth_data.lxc_loaded) {
							socket.to().emit('/get_lxc_data.' + name, {
								'data': {
									'host': auth_data.host,
									'user_ports': auth_data.lxc_data.user_ports
								}
							});
						} else {
							if (i < 5) {
								console.log("ReSend: " + i);

								// RESEND
								//
								setTimeout(function() {
									send(user_id, name, ++i, last);
								}, 10 * 1000);
							} else {
								console.log("CANNOT GET " + user_id + " LXC - TIMEOVER");

								if (!last) {
									console.log("RECONNECT TO VM: " + user_id);

									g_auth.connect_vm({
										'id': user_id
									}, function() {
										send(user_id, __name, 0, true);
									});
								}
							}
						}
					});
				};

				self.get_user_data(socket.id, function(user_data) {
					if (user_data && user_data.id) {
						var user_id = user_data.id;

						send(user_id, __name, 1);
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

		client.get('id_type', function(err, data) {
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

	get_user_data: function(socket_id, callback) {
		this.get_session_id(socket_id, function(sessionID) {
			if (global.__redis_mode) {
				store.client.get(sessionID, function(err, user_data) {
					if (user_data) {
						try { // jeongmin: try catching
							user_data = JSON.parse(user_data);

							user_data.result = true;
							callback(user_data);
						} catch (e) {
							console.log('get user data error:', e);
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
			} else {
				store.get(sessionID, function(err, user) {
					try {
						var user_data = null;

						if (user && user.auth && user.auth.password) {
							user_data = user.auth.password.user;
						}
						if (user_data) {
							user_data.result = true;
							callback(user_data);
						} else {
							callback({
								'result': false
							});
						}
					} catch (e) {
						console.log('get_user_data error:', err, e);

						callback({
							'result': false
						});
					}
				});
			}
		});
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