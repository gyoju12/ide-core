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
var os = require('os');
var path = require('path');
var rimraf = require('rimraf');
var EventEmitter = require("events").EventEmitter;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;



var g_secure = require('../goorm.core.secure/secure.js');
var g_auth_project = require('../goorm.core.auth/auth.project');




var check_valid_path = function(str) {
	if (!str) return false;
	return !(/\.\.|~|;|&|\|/.test(str));
};

var project_limit = 30;

module.exports = {
	get_limit: function() {
		return project_limit;
	},

	do_new: function(query, evt) {
		var self = this;
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.project_type && query.project_detailed_type && query.project_author && query.project_name) { //jeongmin: remove collaboration comparison (collaboration is disappered)
			//useonly(mode=goorm-oss)
			fs.readdir(global.__workspace + '/', function(err, files) {
				if (err) {
					data.err_code = 10;
					data.message = "Server can not response";

					evt.emit("project_do_new", data);
				} else {
					var project_dir = query.project_author + '_' + query.project_name;

					if (files.hasObject(project_dir)) {
						data.err_code = 20;
						data.message = "Same project name is exist.";
						fs.readFile(global.__workspace + "/" + project_dir + "/goorm.manifest", 'utf-8', function(err, goorm_manifest_json) {
							data.prev_project_type = JSON.parse(goorm_manifest_json).type;
							evt.emit("project_do_new", data);
						});
					} else {
						if (query.project_name.length > 50) {
							data.err_code = 39;
							data.message = "Project name is too long";
							evt.emit("project_do_new", data);
						} else {
							fs.mkdir(global.__workspace + '/' + project_dir, '0777', function(err) {
								if (err) {
									if (err.code == 'ENAMETOOLONG') {
										data.err_code = 39;
										data.message = "Project name is too long";
									} else {
										data.err_code = 30;
										data.message = "Cannot make directory";
										console.log('new project mkdir error:', err, data.message);
									}
									console.log('new project mkdir error:', err, data.message);
									evt.emit("project_do_new", data);
								} else {
									var today = new Date();
									var today_month = parseInt(today.getMonth(), 10) + 1;
									var date_string = today.getFullYear() + '/' + today_month + '/' + today.getDate() + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();

									var file_contents = {
										type: query.project_type,
										detailedtype: query.project_detailed_type,
										author: query.project_author,
										name: query.project_name,
										description: query.project_desc,
										date: date_string,
										// collaboration: query.use_collaboration,	//jeongmin: remove collaboration comparison (collaboration is disappered)
										plugins: query.plugins,
										is_user_plugin: false
									};
									if (global.plugins_list && global.plugins_list.length > 0) {
										var is_default_plg = global.plugins_list.some(function(o) {
											if (o && o.name === ("goorm.plugin." + query.project_type)) return true;
										});
										if (!is_default_plg) {
											file_contents.is_user_plugin = true;
										}
									}
									fs.writeFile(global.__workspace + '/' + project_dir + '/goorm.manifest', JSON.stringify(file_contents), {
										mode: 0700
									}, function(err) {
										if (err) {
											data.err_code = 40;
											data.message = "Can not make project file";

											evt.emit("project_do_new", data);
										} else {
											data.project_dir = project_dir;
											data.project_name = query.project_name;
											data.project_author = query.project_author;
											data.project_type = query.project_type;

											evt.emit("project_do_new", data);
										}
									});
								}
							});
						}
					}
				}
			});
			

			

			
		} else {
			data.err_code = 10;
			data.message = "Invalid query";

			evt.emit("project_do_new", data);
		}
	},

	do_delete: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		var user_list = [];
		var me = {
			'user': query.id,
			'project_path': query.project_path
		}

		

		

		//useonly(mode=goorm-oss)
		if (query.project_path) {
			rimraf(global.__workspace + '/' + query.project_path, function(err) {
				if (err) {
					data.err_code = 20;
					data.message = "Can not delete project";
				}

				//success
				if (evt) {
					evt.emit("project_do_delete", data);
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalid query";

			if (evt) {
				evt.emit("project_do_delete", data);
			}
		}
		
	},

	do_import_check: function(query, file, evt) {

		if (file == null) {
			return false;
		}

		var data = {};
		data.err_code = 0;
		data.type = 'check';
		data.message = "Process Done";

		var temp_path = __temp_dir + '/' + query.user.id;

		temp_path = g_secure.command_filter(temp_path);
		file.path = g_secure.command_filter(file.path);

		var file_type = file.path.split('.').pop();

		var cmd_get_list = {};
		var cmd_get_manifest = "";

		switch (file_type) {
			case "zip":
				cmd_get_list.cmd = 'unzip';
				cmd_get_list.opt = ('-Z -1 ' + file.path).split(' ');

				cmd_get_manifest = "unzip -p " + file.path;
				break;

			case "gz":
				cmd_get_list.cmd = 'tar';
				cmd_get_list.opt = ('-ztf ' + file.path).split(' ');

				cmd_get_manifest = "tar -zxf " + file.path + " -O";
				break;

			case "tar":
				cmd_get_list.cmd = 'tar';
				cmd_get_list.opt = ('-tf ' + file.path).split(' ');

				cmd_get_manifest = "tar -xf " + file.path + " -O";
				break;
		}

		var check_cmd = spawn(cmd_get_list.cmd, cmd_get_list.opt);

		var stdout = "",
			stderr = '',
			find = false,
			contents = null;

		check_cmd.stdout.on('data', function(data) {
			var buf = new Buffer(data);
			stdout += buf.toString();

			if (!find && stdout.indexOf('goorm.manifest') > -1) {
				find = true;


			}
		});
		check_cmd.on('close', function(code) {
			if (code) { // invalid compressed file
				data.err_code = code;

				evt.emit('project_do_import_check', data);
			} else {
				if (find) {
					var file_list = stdout.split('\n');
					var manifest_path = "";

					for (var i = 0; i < file_list.length; i++) {
						if (file_list[i].indexOf('goorm.manifest') != -1) {
							manifest_path = file_list[i];
							break;
						}
					}

					exec(cmd_get_manifest + " " + manifest_path, function(__err, manifest_content) {
						if (__err) {
							console.log(__err);


						} else {
							try {
								contents = JSON.parse(manifest_content);
								data.result = contents;
							} catch (e) {
								console.log(e);
							}
							evt.emit('project_do_import_check', data);
						}
					});
				} else {
					evt.emit('project_do_import_check', data);
				}
			}
		});
	},

	do_import: function(query, file, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";
		var save_project_json = {};
		if (query.project_import_location && file) {
			var project_abs_path = global.__workspace + "/" + query.project_import_location;
			project_abs_path = project_abs_path.replace(/\/\//g, "/");

			if (project_abs_path === global.__workspace || project_abs_path.indexOf('..') > -1) {
				data.err_code = 10;
				data.message = "Invalid Import Location";
				evt.emit("project_do_import", data);
				return false;
			}
			fs.readFile(project_abs_path + "/goorm.manifest", 'utf-8', function(err, project_json_data) {
				function _callback(_data) {
					save_project_json = _data;
					try { // jeongmin: try catching
						save_project_json = JSON.parse(save_project_json);

						project_abs_path = g_secure.command_filter(project_abs_path);

						// var clear_command = "rm -rf  " + project_abs_path + "/* ;";	// hidden by jeongmin: this command is redefined below

						var callback = function(error, stdout, stderr) {
							//temp_file delete
							rimraf(file.path, function(err) {});

							// some codes are hidden by jeongmin: These move codes are no need.

							// if (!error) {
							if (error == 0) { // error == code
								//mv 
								fs.readdir(project_abs_path, function(err, stdout) {

									if (!err && stdout && stdout.length !== 0) {
										// var ori_project_name = '';

										var delete_macosx = function() {
											for (var i = 0; i < stdout.length; i++) {
												// if (stdout[i][0] !== '.') {
												// 	ori_project_name = stdout[i];
												// 	break;
												// }

												// jeongmin: delete mac's additional unzip result directory
												if (stdout[i] == '__MACOSX')
													rimraf(project_abs_path + "/__MACOSX", function(err) {});
											}

											evt.emit("project_do_import", data);
										};

										// if (ori_project_name === '') {
										// 	data.message = 'Import Fail';
										// 	evt.emit("project_do_import", data);
										// 	return false;
										// }

										// project_abs_path = g_secure.command_filter(project_abs_path);
										// ori_project_name = g_secure.command_filter(ori_project_name);
										// ////// ISSUE: Sometimes, mv_command's 'project_abs_path + "/" + ori_project_name + "/* " + project_abs_path' becomes just '/*'. So, system files 'move' to project_path. This is disaster... (jeongmin) //////
										// var mv_command = "mv " + project_abs_path + "/" + ori_project_name + "/*   " + project_abs_path;

										// mv_command = mv_command.replace(/\/\//g, "/");
										// exec(mv_command, function(err, stdout) {
										// 	if (err) console.log(err);

										

										//useonly(mode=goorm-oss,goorm-client)
										delete_macosx();
										

										var revert_manifest = function() {
											fs.writeFile(project_abs_path + "/goorm.manifest", JSON.stringify(save_project_json), {
												mode: 0700,
												flag: 'w'
											}, function(err) {});
										};

										var lostfound = stdout.indexOf("lost+found");
										var manifest = stdout.indexOf("goorm.manifest");

										if (lostfound !== -1) {
											stdout.splice(lostfound, 1);
										}
										if (manifest !== -1) {
											stdout.splice(manifest, 1);
										}


										if (stdout.length == 1) {
											fs.exists(project_abs_path + "/" + stdout[0] + "/goorm.manifest", function(exists) {
												if (exists) {
													exec("mv " + project_abs_path + "/" + stdout[0] + "/* " + project_abs_path + "/; rm -rf " + project_abs_path + "/" + stdout[0], function(err) {
														if (!err) {
															revert_manifest();
														} else {
															console.log(err);
														}
													});
												} else {
													revert_manifest();
												}
											});
										} else {
											revert_manifest();
										}
										//delete empty folder
										// rimraf(project_abs_path + "/" + ori_project_name, function(err) {});

										// });
									} else {
										evt.emit("project_do_import", data);
									}
								});
							} else {

								

								data.err_code = 20;
								data.message = "Cannot extract zip file";

								evt.emit("project_do_import", data);
								fs.writeFile(project_abs_path + "/goorm.manifest", JSON.stringify(save_project_json), {
									mode: 0700
								}, function(err) {});
							}
						};

						// exec(clear_command + " unzip -o " + file.path + " -d " + global.__workspace + "/" + query.project_import_location, {
						// 	maxBuffer: 400 * 1024
						// }, function(error, stdout, stderr) {
						// 	callback(error, stdout, stderr);
						// });

						// jeongmin: first, clear target project
						var clear_command = spawn('rm', ['-rf', project_abs_path + '/*']);
						clear_command.stdout.on('data', function() {}); // for preventing process kill
						clear_command.on('close', function(code) {
							var _stdout = '',
								_stderr = '',
								zip_process = null;

							if (file.name.split('.').pop() === "zip") {
								//	console.log(clear_command + " unzip -o " + file.path + " -d " + global.__workspace + "/" + query.project_import_location);
								// exec(clear_command + " unzip -o " + file.path + " -d " + global.__workspace + "/" + query.project_import_location, {
								// 	maxBuffer: 400 * 1024
								// }, function(err, std_out, std_err) {
								// 	callback(err, std_out, std_err);
								// });
								// hidden by jeongmin: exec is not for processing big buffer. Spawn is more suitable.

								zip_process = spawn('unzip', ['-o', file.path, '-d', project_abs_path]);
							} else if (file.name.split('.').pop() === "tar") {
								//	console.log(clear_command + " tar -xvf " + file.path + " -C " + global.__workspace + "/" + query.project_import_location);
								// exec(clear_command + "tar -xvf " + file.path + " -C " + global.__workspace + "/" + query.project_import_location, {
								// 	maxBuffer: 400 * 1024
								// }, function(error, std_out, std_err) {
								// 	callback(err, std_out, std_err);
								// });

								zip_process = spawn('tar', ['-xvf', file.path, '-C', project_abs_path]);
							} else if (file.name.split('.').pop() === "gz") {
								//	console.log(clear_command + " tar -zxvf " + file.path + " -C " + global.__workspace + "/" + query.project_import_location);
								// exec(clear_command + " tar -zxvf " + file.path + " -C " + global.__workspace + "/" + query.project_import_location, {
								// 	maxBuffer: 400 * 1024
								// }, function(error, std_out, std_err) {
								// 	callback(err, std_out, std_err);
								// });

								zip_process = spawn('tar', ['-zxvf', file.path, '-C', project_abs_path]);
							}

							zip_process.stdout.on('data', function(data) {
								_stdout += data;
							});
							zip_process.stderr.on('data', function(data) {
								_stderr += data;
							});
							zip_process.on('close', function(code) {
								callback(code, _stdout, _stderr);
							});
						});
					} catch (e) {
						console.log('import project error:', e);
						data.err_code = 11;
						data.message = "goorm.manifest doesn't exist";
						evt.emit("project_do_import", data);
					}
				}

				if (!err) { // jeongmin: goorm.manifest exists
					_callback(project_json_data);
				} else { // jeongmin: goorm.manifest exists
					g_auth_project.valid_manifest(query.project_import_location, { // jeongmin: if author and name are '', make new goorm.manifest
						author: '',
						name: ''
					}, _callback);
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalid query ";

			evt.emit("project_do_import", data);
		}
	},

	do_export: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.user && query.project_path && query.project_name) {

			fs.mkdir(__temp_dir + '/' + query.user, '0777', function(err) {
				if (!err || err.errno === 47) { //errno 47 is exist folder error

					
					

					// export_terminal_command = g_secure.command_filter(export_terminal_command);
					// export_file_extension = g_secure.command_filter(export_file_extension);
					// query.user = g_secure.command_filter(query.user);
					// query.project_name = g_secure.command_filter(query.project_name);
					// query.project_path = g_secure.command_filter(query.project_path);
				} else {
					data.err_code = 30;
					data.message = "Cannot make directory";
					console.log('export project mkdir error:', err, data.message);
					evt.emit("project_do_export", data);
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalide query";

			evt.emit("project_do_export", data);
		}
	},

	get_list: function(project_option, evt, callback) {
		var projects = [];

		var options = {
			followLinks: false
		};

		var is_empty = true;

		//useonly(mode=goorm-oss)	
		fs.readdir(global.__workspace + '/', function(err, files) {
			if (!err) {
				var evt_get_project = new EventEmitter();
				evt_get_project.on('get_project_list', function(__evt_get_project, i) {

					if (files[i]) {
						var target_dir = global.__workspace + '/' + files[i];

						fs.exists(target_dir, function(exists) {
							if (exists && !fs.statSync(target_dir).isFile()) {
								fs.readFile(global.__workspace + '/' + files[i] + "/goorm.manifest", 'utf-8', function(err, data) {
									function _callback(_data) {
										data = _data;

										var project = {};
										project.name = files[i];
										try { // jeongmin: try catching
											project.contents = JSON.parse(data);

											projects.push(project);
										} catch (e) {
											console.log('getting project list error:', e);
										}

										evt_get_project.emit('get_project_list', evt_get_project, ++i);
									}

									if (!err) { // jeongmin: goorm.manifest exists
										_callback(data);
									} else { // jeongmin: goorm.manifest exists
										g_auth_project.valid_manifest(files[i], { // jeongmin: if author and name are '', make new goorm.manifest
											author: '',
											name: ''
										}, _callback);
									}
								});
							} else {
								evt_get_project.emit('get_project_list', evt_get_project, ++i);
							}
						});
					} else {
						projects.sort(function(a, b) {
							if (a.name < b.name) return -1;
							return 1;
						});

						if (evt) {
							evt.emit("project_get_list", projects);
						} else if (callback) {
							callback(projects);
						}
					}
				});
				evt_get_project.emit('get_project_list', evt_get_project, 0);
			} else {
				console.log('Directory Error : ', err);

				if (evt) {
					evt.emit("project_get_list", projects);
				} else if (callback) {
					callback(projects);
				}
			}
		});
		

		

		
	},

	

	set_property: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.project_path) {
			fs.readFile(global.__workspace + '/' + query.project_path + '/goorm.manifest', {
				encoding: 'utf8'
			}, function(err, cur_manifest) {
				function _callback(_data) {
					cur_manifest = _data;

					try {
						cur_manifest = JSON.parse(cur_manifest);
						new_property = JSON.parse(query.data);

						if (cur_manifest.author != new_property.author || cur_manifest.name != new_property.name) {
							console.log('Attempt to change author and name of project in set_property');

							data.err_code = 10;
							data.message = "Invalid query";
							evt.emit("set_property", data);
						} else {
							// jeongmin: prevent invalid build path
							for (var plugin_type in new_property.plugins) {
								for (var items in new_property.plugins[plugin_type]) {
									if (items.indexOf('compiler_type') > -1) { // jeongmin: compiler type has special character -> can be filtered, so skip
										continue;
									}
									if (new_property.plugins[plugin_type][items] != g_secure.command_filter(new_property.plugins[plugin_type][items])) {
										data.err_code = 10;
										data.message = "Invalid query<br/>" + new_property.plugins[plugin_type][items];
										evt.emit("set_property", data);

										break;
									}
								}
							}

							// jeongmin: remove scm property -> scm property should be not saved in goorm.manifest
							for (var key in new_property) {
								if (key.indexOf('scm') > -1) {
									delete new_property[key];
								}
							}

							if (data.err_code === 0) {
								fs.writeFile(global.__workspace + '/' + query.project_path + "/goorm.manifest", JSON.stringify(new_property), {
									encoding: 'utf-8',
									mode: 0700
								}, function(err) {
									if (!err) {
										evt.emit("set_property", data);
									} else {
										data.err_code = 20;
										data.message = "Can not write project file.";
										evt.emit("set_property", data);
									}
								});
							}
						}
					} catch (e) {
						console.log('parsing error in set_property:', e);

						data.err_code = 10;
						data.message = "Invalid query";
						evt.emit("set_property", data);
					}
				}

				if (err) { // jeongmin: goorm.manifest exists
					g_auth_project.valid_manifest(query.project_path, { // jeongmin: if author and name are '', make new goorm.manifest
						author: '',
						name: ''
					}, _callback);
				} else { // jeongmin: goorm.manifest exists
					_callback(cur_manifest);
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalid query";
			evt.emit("set_property", data);
		}
	},

	get_property: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";
		if (query.project_path !== null && query.project_path !== undefined) {
			if (query.project_path === "") {
				evt.emit("get_property", data);
			} else {
				fs.readFile(global.__workspace + '/' + query.project_path + "/goorm.manifest", 'utf-8', function(err, file_data) {
					function _callback(_data) {
						file_data = _data;

						try { // jeongmin: try catching
							data.contents = JSON.parse(file_data);

							evt.emit("get_property", data);
						} catch (e) {
							console.log('getting project property error:', e);
							data.err_code = 20;
							data.message = "Can not open project.";
							evt.emit("get_property", data);
						}
					}

					if (!err) { // jeongmin: goorm.manifest exists
						_callback(file_data);
					} else { // jeongmin: goorm.manifest exists
						g_auth_project.valid_manifest(query.project_path, { // jeongmin: if author and name are '', make new goorm.manifest
							author: '',
							name: ''
						}, _callback);

						// data.err_code = 20;
						// data.message = "Can not open project.";
						// evt.emit("get_property", data);
					}
				});
			}
		} else {
			data.err_code = 10;
			data.message = "Invalid query";
			evt.emit("get_property", data);
		}
	},

	do_clean: function(query, evt) {
		var self = this;
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.project_list) {

			var total_count = query.project_list.length;
			var clean_count = 0;
			var evt_clean = new EventEmitter();

			evt_clean.on("do_delete_for_clean", function() {

				clean_count++;
				if (clean_count < total_count) {
					self.do_delete_for_clean(query.project_list[clean_count], evt_clean);
				} else {
					evt.emit("project_do_clean", data);
				}
			});

			self.do_delete_for_clean(query.project_list[clean_count], evt_clean);
		} else {
			data.err_code = 10;
			data.message = "Invalide query";

			evt.emit("project_do_clean", data);
		}
	},

	do_delete_for_clean: function(project_path, evt_clean) {
		rimraf(global.__workspace + '/' + project_path + "/build", function(err) {
			evt_clean.emit("do_delete_for_clean");
		});
	},

	// move_file: function(data, evt) {
	// 	var length = data.current_path.length;
	// 	//var force = data.force ? '-f' : '';

	// 	var callback = function(err, stdout, stderr) {
	// 		if (err) {
	// 			console.log(err, stdout, stderr);

	// 			evt.emit('move_file', {
	// 				flag: false
	// 			});
	// 		}
	// 		if (i == length - 1 || i == length) {

	// 			evt.emit('move_file', {
	// 				flag: true
	// 			});
	// 		}
	// 	};

	// 	var move = function(current_path, target_path) {
	// 		exec('mv ' + global.__workspace + current_path + " " + global.__workspace + target_path, callback);
	// 	}

	// 	//console.log('move_file');
	// 	for (var i = 0; i < length; i++) {
	// 		data.current_path[i] = g_secure.command_filter(data.current_path[i]);
	// 		data.after_path = g_secure.command_filter(data.after_path);
	// 		var filename = data.current_path[i].split('/').slice(-1)[0];
	// 		var exist_check_path = path.join(global.__workspace, data.after_path, filename);


	// 		//console.log(exist_check_path, data.current_path[i], data.after_path);
	// 		if (fs.existsSync(exist_check_path)) {
	// 			exec('rm -rf ' + exist_check_path + ' | ' + 'mv ' + global.__workspace + data.current_path[i] + ' ' + global.__workspace + data.after_path, callback);
	// 		} else {
	// 			exec('mv ' + global.__workspace + data.current_path[i] + ' ' + global.__workspace + data.after_path, callback);
	// 			//move(data.current_path[i], data.after_path);
	// 		}
	// 	}
	// },

	check_running_project: function(req, evt) {
		var res = {};
		var i = 0;

		//"not_running_project";	-> can run user's proc
		res.result = 0;

		//by session id
		var id = req.id;


		id = g_secure.command_filter(id);

		//get user's bash
		exec("ps -lu " + id + "  | awk '{print $4, $5, $14}' | grep -v PID ", function(err, stdout, stderr) {
			//pid ppid cmd
			if (err || stderr) {
				evt.emit('check_running_project', res);
				return false;
			}

			var procs = stdout.split('\n');
			//bash's pid
			var bash_procs_pid = [];

			//etc proc's ppid
			var etc_procs_ppid = [];

			for (i = 0; i < procs.length; i++) {
				if (procs[i] === '') continue;

				if (procs[i].split(' ').pop() === 'bash') {
					bash_procs_pid.push(procs[i].split(' ')[0]);
				} else {
					etc_procs_ppid.push(procs[i].split(' ')[1]);
				}
			}

			for (i = 0; i < bash_procs_pid.length; i++) {
				for (var k = 0; k < etc_procs_ppid.length; k++) {
					if (etc_procs_ppid[k] === bash_procs_pid[i]) {
						//already running user's process 
						res.result = 1;
						break;
					}
				}
			}
			evt.emit('check_running_project', res);
		});
	},

	//Check property's file is available --heeje
	//query: project_path, project_type, class_name, source_path
	check_valid_property: function(query, evt) {
		var source_path = g_secure.command_filter(__workspace + query.project_path + "/" + query.source_path);
		var source_file = g_secure.command_filter(source_path + query.class_name);
		var makefile = g_secure.command_filter(__workspace + query.project_path + "/make");
		
		
		//useonly(mode=goorm-oss)
		fs.exists(makefile, function(exist) {
			if (!exist) {
				if (query.project_type == "java" || query.project_type == "java_examples") {
					exec("cp " + global.__path + '/plugins/goorm.plugin.java/template/make ' + __workspace + query.project_path);
				} else if (query.project_type == "c_examples" || query.project_type == "cpp") {
					exec("cp " + global.__path + '/plugins/goorm.plugin.cpp/template/cpp/make ' + __workspace + query.project_path);
				}

				exec('chmod 770 ' + __workspace + query.project_path + '/make');
			};
		});
		
		//2. directory and main file check
		switch (query.project_type) {
			case "c_examples":
				fs.exists(source_path, function(exist) {
					if (!exist) {
						evt.emit('check_valid_property', {
							result: false,
							code: 1
						});
						return false;
					} else {
						source_file = source_file + ".c";

						fs.exists(source_file, function(exist) {
							if (!exist) {
								evt.emit('check_valid_property', {
									result: false,
									code: 2
								});
								return false;
							} else {
								evt.emit('check_valid_property', {
									result: true
								});
								return true;
							}
						});
					}
				});
				break;
			case "cpp":
				fs.exists(source_path, function(exist) {
					if (!exist) {
						evt.emit('check_valid_property', {
							result: false,
							code: 1
						});
						return false;
					} else {
						source_file = (query.detail_type == "cpp") ? source_file + ".cpp" : source_file + ".c";

						fs.exists(source_file, function(exist) {
							if (!exist) {
								evt.emit('check_valid_property', {
									result: false,
									code: 2
								});
								return false;
							} else {
								evt.emit('check_valid_property', {
									result: true
								});
								return true;
							}
						});
					}
				});
				break;

			case "java":
			case "java_examples":
				fs.exists(source_path, function(exist) {
					if (!exist) {
						evt.emit('check_valid_property', {
							result: false,
							code: 1
						});
						return false;
					} else {
						source_file += ".java";

						fs.exists(source_file, function(exist) {
							if (!exist) {
								evt.emit('check_valid_property', {
									result: false,
									code: 2
								});
								return false;
							} else {
								evt.emit('check_valid_property', {
									result: true
								});
								return true;
							}
						});
					}
				});
				break;
			default:
				break;
		}
	},

	//checking latest build with whether build file exist --heeje
	check_latest_build: function(query, evt) {
		if (!query || !query.project_path || !check_valid_path(query.project_path)) {
			evt.emit('check_latest_build', false);
			return false;
		}

		if (/linux/.test(os.platform()) || /darwin/.test(os.platform())) {
			var exec_option = {};

			query.run_file_path = g_secure.command_filter(query.run_file_path);
			query.project_path = g_secure.command_filter(query.project_path);

			fs.exists(global.__workspace + query.run_file_path, function(exist) {
				if (!exist) {
					evt.emit('check_latest_build', {
						result: false
					});
					return false;
				} else {
					evt.emit('check_latest_build', {
						result: true
					});
					return true;
				}
			});
		} else { // 'find' has not -print option in other os.
			evt.emit('check_latest_build', false);
		}

		//depreciated function --cheking latest using timestamp gives false result
		// exec_option.cwd = global.__workspace + query.project_path;
		// exec("find . -type f -not -name '.*' -printf '%T@      %p\n' | sort -nr | head -n 1 | awk '{print $2}'", exec_option, function(err, stdout, stderr) {
		// 	if (err) {
		// 		evt.emit('check_latest_build', {
		// 			result: false
		// 		});
		// 	} else {
		// 		evt.emit('check_latest_build', {
		// 			result: true,
		// 			path: stdout
		// 		});
		// 	}
		// });
		// } else if (/darwin/.test(os.platform())) {
		// 	var exec_option = {};

		// 	query.run_file_path = g_secure.command_filter(query.run_file_path);
		// 	query.project_path = g_secure.command_filter(query.project_path);

		// 	fs.exists(query.run_file_path, function(exist) {
		// 		if (!exist) {
		// 			evt.emit('check_latest_build', {
		// 				result: false
		// 			});
		// 			return false;
		// 		} else {
		// 			evt.emit('check_latest_build', {
		// 				result: true
		// 			});
		// 			return true;
		// 		}
		// 	});

		// 	// exec_option.cwd = global.__workspace + query.project_path;
		// 	// exec("find . -type f -not -name '.*' -print0 | xargs -0 -n 1 stat -f '%m %N' | sort -nr | head -n 1 | awk '{print $2}'", exec_option, function(err, stdout, stderr) {
		// 	// 	if (err) {
		// 	// 		evt.emit('check_latest_build', {
		// 	// 			result: false
		// 	// 		});
		// 	// 	} else {
		// 	// 		evt.emit('check_latest_build', {
		// 	// 			result: true,
		// 	// 			path: stdout
		// 	// 		});
		// 	// 	}
		// 	// });

	},


	count_project_by_id: function(author_id, evt) {


		var __evt = new EventEmitter();
		__evt.on('project_get_list', function(projects) {
			if (!projects) projects = [];
			evt.emit("count_project_by_id", projects.length);
		});

		this.get_list({
			'author': {
				'author_id': author_id,
			},
			'get_list_type': 'owner_list'
		}, __evt);
	},

	authorize_project_by_id: function(id, project_path, evt) {

	},

	valid: function(msg, evt) {
		var project_name = msg.project_name;
		var author_id = msg.author.author_id;

		var limit = this.get_limit();

		var __evt = new EventEmitter();
		__evt.on('project_get_list', function(projects) {
			if (!projects) projects = [];
			if (projects.length < limit) {
				// check duplicate name 
				//
				var exist_project = projects.some(function(p) {
					if (p.project_path === project_name) return true;
					else return false;
				});

				if (exist_project) {
					evt.emit('project_exist');
				} else {
					
					//useonly(mode=goorm-oss)
					evt.emit('project_valid_success');
					
				}
			} else {
				// over limit
				//
				evt.emit('project_over_limit', limit);
			}
		});

		this.get_list({
			'author': msg.author,
			'get_list_type': 'owner_list'
		}, __evt);
	}
};