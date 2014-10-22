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
var async = require('async');
// var walk = require('walk');
var EventEmitter = require("events").EventEmitter;
var rimraf = require('rimraf');
var http = require('http');
var https = require('https');
var path = require('path');
var exec = require('child_process').exec;
// var spawn = require('child_process').spawn;
var Q = require('q');
var fs_readdir = Q.denodeify(fs.readdir);
var fs_stat = Q.denodeify(fs.stat);

var g_secure = require('../goorm.core.secure/secure.js');



var check_valid_path = function(str) {
	if (!str) return false;
	return !(/\.\.|~|;|&|\|/.test(str));
};


var check_special_characters = function(str) {
	var regex = ['~', '!', '#', '$', '^', '&', '*', '=', '+', '|', ':', ';', '?', '"', '<', '.', '>', ' '];
	var modify_regex = ['\~', '\!', '\#', '\$', '\^', '\&', '\*', '\=', '\+', '\|', '\:', '\;', '\?', '\"', '\<', '\.', '\>', '\ '];

	if (str) {
		var index = 0;

		for (index = 0; index < regex.length; index++) {
			var ch = regex[index];
			var modify_ch = regex[index];

			str = str.split(ch).join(modify_ch);
		}
	}

	return str;
};


module.exports = {
	
	do_new: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = "Process Done";
		if (query.path !== null) {
			var path = query.path;
			if (query.type !== "") {
				path += "." + query.type;
			}

			// make new file. Jeong-Min Im.
			function create_file() {
				fs.writeFile(global.__workspace + '/' + path, "", function(err) {
					if (err !== null) {
						data.err_code = 40;
						data.message = "Can not make a file";

						evt.emit("file_do_new", data);
					} else {
						
						evt.emit("file_do_new", data);
					}
				});
			}

			fs.stat(global.__workspace + '/' + path, function(err, stats) {
				if (err) { // no exist
					create_file();
				} else if (stats) { // exist
					if (stats.isDirectory()) { // jeongmin: can't make file using this name
						data.err_code = 28; // jeongmin: EISDIR
						data.message = 'alert_same_name_folder';
						evt.emit("file_do_new", data);
					} else if (query.new_anyway == "false" || query.new_anyway == false) { // jeongmin: let user know same name exists
						data.err_code = 99;
						data.message = "exist file";
						evt.emit("file_do_new", data);
					} else if ((query.new_anyway == 'true' || query.new_anyway == true) && stats.isFile()) { // jeongmin: overwrite file
						create_file();
					} else {
						data.err_code = 10;
						data.message = "Invalid query";
						evt.emit("file_do_new", data);
					}
				} else {
					data.err_code = 10;
					data.message = "Invalid query";
					evt.emit("file_do_new", data);
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalid query";
			evt.emit("file_do_new", data);
		}
	},

	do_new_folder: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.current_path !== null && query.folder_name !== null) {
			fs.exists(global.__workspace + '/' + query.path, function(exists) {
				if (exists) {
					data.err_code = 20;
					data.message = "Exist folder";

					evt.emit("file_do_new_folder", data);
				} else {
					fs.mkdir(global.__workspace + '/' + query.current_path + '/' + query.folder_name, '0777', function(err) {

						if (err !== null) {
							data.err_code = 30;
							data.message = "Cannot make directory";

							evt.emit("file_do_new_folder", data);
						} else {
							
							evt.emit("file_do_new_folder", data);
						}
					});
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalid query";
			evt.emit("file_do_new_folder", data);
		}
	},

	do_new_untitled_text_file: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.current_path !== null) {
			fs.readdir(global.__workspace + '/' + query.current_path, function(err, files) {
				if (err !== null) {
					data.err_code = 10;
					data.message = "Server can not response";

					evt.emit("file_do_new_untitled_text_file", data);
				} else {
					var temp_file_name = "untitled";
					var i = 1;

					while (1) {
						if (files.hasObject(temp_file_name + i + ".txt")) {} else {
							break;
						}
						i++;
					}

					fs.writeFile(global.__workspace + '/' + query.current_path + '/' + temp_file_name + i + '.txt', "", function(err) {
						if (err !== null) {
							data.err_code = 40;
							data.message = "Can not make project file";

							evt.emit("file_do_new_untitled_text_file", data);
						} else {
							
							evt.emit("file_do_new_untitled_text_file", data);
						}
					});
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalid query";
			evt.emit("file_do_new_untitled_text_file", data);
		}
	},

	do_new_other: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.current_path !== null && query.file_name !== null) {
			fs.exists(global.__workspace + '/' + query.path, function(exists) {
				if (exists) {
					data.err_code = 20;
					data.message = "Exist file";

					evt.emit("file_do_new_other", data);
				} else {
					fs.writeFile(global.__workspace + '/' + query.current_path + '/' + query.file_name, "", function(err) {
						if (err !== null) {
							data.err_code = 40;
							data.message = "Can not make file";

							evt.emit("file_do_new_other", data);
						} else {
							
							evt.emit("file_do_new_other", data);
						}
					});
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalid query";
			evt.emit("file_do_new_other", data);
		}
	},

	put_contents: function(query, evt) {

		var data = {};
		var abs_path = global.__workspace + '/' + query.path;
		if (!check_valid_path(abs_path)) {
			data.err_code = 10;
			data.message = "Can not save";

			evt.emit("file_put_contents", data);
		} else {
			if (query.options != undefined && query.options.append == true) {
				fs.appendFile(abs_path, query.data, function(err) {
					if (err !== null) {
						data.err_code = 10;
						data.message = "Can not save";

						evt.emit("file_put_contents", data);
					} else {
						data.err_code = 0;
						data.message = "saved";

						evt.emit("file_put_contents", data);
					}
				});
			} else {
				fs.writeFile(abs_path, query.data, function(err) {
					if (err !== null) {
						data.err_code = 10;
						data.message = "Can not save";

						evt.emit("file_put_contents", data);
					} else {
						data.err_code = 0;
						data.message = "saved";

						evt.emit("file_put_contents", data);
					}
				});
			}
		}
	},


	make_dir_tree: function(root, dirs) {
		var tree = [];
		var rest = [];

		for (var i = 0; i < dirs.length; i++) {
			if (dirs[i].root == root || dirs[i].root == root + '/') {
				tree.push(dirs[i]);
			} else {
				rest.push(dirs[i]);
			}
		}

		for (var i = 0; i < tree.length; i++) {
			var children = this.make_dir_tree(root + tree[i].name + '/', rest);
			tree[i].children = children;
		}

		return tree;
	},

	make_file_tree: function(tree, files) {
		if (tree !== undefined) {
			var marked = [];

			// files on root
			for (var j = 0; j < files.length; j++) {
				if (files[j].root == "") {
					marked.push(j);
					tree.push(files[j]);
				}
			}

			for (var i = 0; i < tree.length; i++) {
				for (var j = 0; j < files.length; j++) {
					if (!marked.hasObject(j) && tree[i].root + tree[i].name + '/' == files[j].root) {
						marked.push(j);
						tree[i].children.push(files[j]);
					}
				}
			}

			var rest_files = [];

			for (var j = 0; j < files.length; j++) {
				if (!marked.hasObject(j)) {
					rest_files.push(files[j]);
				}
			}

			for (var i = 0; i < tree.length; i++) {
				if (tree[i].children.length > 0) {
					tree[i].children.join(this.make_file_tree(tree[i].children, rest_files));
				}
			}

			return tree;
		} else {
			return null;
		}
	},

	do_delete: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.filename !== null) {
			rimraf(global.__workspace + '/' + query.filename, function(err) {
				if (err !== null) {
					data.err_code = 20;
					data.message = "Can not delete file";

					evt.emit("file_do_delete", data);
				} else {
					//success
					evt.emit("file_do_delete", data);
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalide query";

			evt.emit("file_do_delete", data);
		}

	},

	do_rename: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.ori_path !== null && query.ori_name !== null && query.dst_name !== null) {
			var path = global.__workspace + '/' + query.ori_path;

			fs.rename(path + query.ori_name, path + query.dst_name, function(err) {
				if (err) {
					data.err_code = 11;
					data.message = "Fail to rename";

					console.log(err);
				} else {
					data.path = query.ori_path;
					data.file = query.dst_name;
				}

				evt.emit("file_do_rename", data);
			});
		} else {
			data.err_code = 10;
			data.message = "Invalide query";

			evt.emit("file_do_rename", data);
		}
	},

	do_move: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.ori_path && query.ori_file && query.dst_path && query.dst_file) {
			var ori_full = global.__workspace + '/' + query.ori_path + "/" + query.ori_file;
			var dst_full = global.__workspace + '/' + query.dst_path + "/" + query.dst_file;

			fs.rename(ori_full, dst_full, function(err) {

				if (err !== null) {
					data.err_code = 20;
					data.message = "Can not move file";

					evt.emit("file_do_move", data);
				} else {

					data.path = query.dst_path;
					data.file = query.dst_file;

					evt.emit("file_do_move", data);
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalide query";

			evt.emit("file_do_move", data);
		}
	},

	do_import: function(query, file, evt) {
		var data = {};
		data.err_code = 0;
		// data.message = "Process Done";
		data.file = [];

		if (file && query.file_import_location_path !== null && query.file_import_location_path !== undefined) {

			if (!(file instanceof Array))
				file = new Array(file);

			var load_count = 0;
			var unload_count = 0;
			var exist_file = [];
			var exist_dir = [];
			var is_exist_file = false;
			var is_exist_dir = false;

			// 덮어쓰기일 경우
			if (query.is_overwrite == 'true') {
				// 중복된 파일만 로드
				for (var i = 0; i < file.length; i++) {
					var __file = file[i];
					var file_path = query.file_import_location_path + '/' + __file.name;

					if (fs.existsSync(global.__workspace + '/' + file_path)) {
						var is = fs.createReadStream(__file.path);
						var os = fs.createWriteStream(global.__workspace + '/' + query.file_import_location_path + '/' + __file.name);

						is.pipe(os);

						is.on('end', function() {
							// fs.unlink(__file.path, function (err){
							// 	if (err) console.log(err);
							// });
							load_count++;
							if (load_count + unload_count === file.length) {
								evt.emit("file_do_import", data);
							}

						});
					} else {
						unload_count++;
					}
				}
			}
			// 덮어쓰기 아닐 경우
			else {
				// 중복되지 않은 파일전부 로드
				// 중복있으면 저장하고 err code 전송
				async.map(file, function(item, callback) {
					var __file = item;
					var file_path = query.file_import_location_path + '/' + __file.name;

					// 이미 존재하는지 검사
					if (fs.existsSync(global.__workspace + '/' + file_path)) {

						fs.stat(global.__workspace + file_path, function(fs_err, stats) {
							if (fs_err) {
								console.log(fs_err);
							}
							// 디렉토리인 경우
							if (stats.isDirectory()) {
								is_exist_dir = true;
								exist_dir.push(__file.name);
							}
							// 디렉토리가 아닌 경우(파일)
							else {
								is_exist_file = true;
								exist_file.push(__file.name);
							}
							callback(null, __file);
						});

					}
					// 중복된 파일이 아닌 경우
					else {
						var is = fs.createReadStream(__file.path);
						var os = fs.createWriteStream(global.__workspace + '/' + query.file_import_location_path + '/' + __file.name);

						is.pipe(os);

						is.on('end', function() {
							callback(null, __file);
						});
					}
				}, function(err, results) {
					if (err) {
						console.log(err);
					}
					if (results) {
						if (is_exist_dir) {
							data.err_code = 30;
							for (var i = 0; i < exist_dir.length; i++) {
								data.file.push(exist_dir[i]);
							}
						} else if (is_exist_file) {
							data.err_code = 21;
							for (var i = 0; i < exist_file.length; i++) {
								data.file.push(exist_file[i]);
							}
						}
						evt.emit("file_do_import", data);
					}
				});

			}

			/*
			// file path
			var file_path = query.file_import_location_path + '/' + file.name;

			if (fs.existsSync(global.__workspace + '/' + file_path) && query.is_overwrite != 'true') {
				data.err_code = 21;
				data.message = "The file '" + file.name  + "'" + " already exists. Do you want to overwrite the file?";

				evt.emit("file_do_import", data);

			} else {
				var loaded = 0; // jeongmin: number of loaded files
				var	stream = function(_file, length) {
						var is = fs.createReadStream(_file.path);
						var os = fs.createWriteStream(global.__workspace + '/' + query.file_import_location_path + "/" + _file.name);

						is.pipe(os);

						is.on('end', function() {
							fs.unlink(_file.path, function(err) {
								if (err) console.log(err);
							});

							loaded++; // jeongmin: file is loaded

							// true: all file's imported
							if (loaded == length)
								evt.emit("file_do_import", data);
						});
					};

				if (Array.isArray(file)) // array: multiple files
					for (var i = 0; i < file.length; i++)
						stream(file[i], file.length);
				else // object: one file
					stream(file, 1); // jeongmin: length == 1(one file)
			}*/
		} else {
			data.err_code = 10;
			// data.message = "Invalide query";

			evt.emit("file_do_import", data);
		}
	},

	do_export: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.user && query.path && query.file) {
			fs.mkdir(__temp_dir + '/' + query.user, '0777', function(err) {
				if (!err || err.errno == 47) { //errno 47 is exist folder error

					query.path = g_secure.command_filter(query.path);
					query.user = g_secure.command_filter(query.user);
					query.file = g_secure.command_filter(query.file);

					exec("cp " + global.__workspace + '/' + query.path + '/' + query.file + " " + __temp_dir + '/' + query.user + '/' + query.file, function(error, stdout, stderr) {
						if (!error) {
							data.path = query.user + '/' + query.file;
							evt.emit("file_do_export", data);
						} else {
							data.err_code = 20;
							// data.message = "Cannot export file";

							evt.emit("file_do_export", data);
						}
					});
				} else {
					data.err_code = 30;
					// data.message = "Cannot make directory";

					evt.emit("file_do_export", data);
				}
			});
		} else {
			data.err_code = 10;
			// data.message = "Invalide query";

			evt.emit("file_do_export", data);
		}
	},
	
	get_property: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.path !== null) {

			fs.stat(global.__workspace + '/' + query.path, function(err, stats) {
				if (err === null) {
					var temp_path = query.path.split("/");
					var path = "";
					for (var i = 0; i < temp_path.length - 1; i++) {
						path += temp_path[i] + "/";
					}

					data.filename = temp_path[temp_path.length - 1];
					data.filetype = temp_path[temp_path.length - 1].split(".")[1];
					data.path = path;
					data.size = stats.size;
					data.atime = stats.atime;
					data.mtime = stats.mtime;
					data.isFile = stats.isFile(); //jeongmin: whether this is file or directory

					evt.emit("file_get_property", data);
				} else {
					data.err_code = 20;
					data.path = query.path;
					data.message = "Can not find target file";
					console.log('get property stat error:', err, data.message);
					evt.emit("file_get_property", data);
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalide query";

			evt.emit("file_get_property", data);
		}
	},

	do_save_as: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = "Process Done";

		if (query.path !== null) {
			var path = query.path;
			if (query.type !== "") {
				path += "." + query.type;
			}

			fs.exists(global.__workspace + '/' + path, function(exists) {
				if (exists && (query.save_anyway == "false" || query.save_anyway == false)) {
					data.err_code = 99;
					data.message = "exist file";
					evt.emit("file_do_save_as", data);
				} else {
					fs.writeFile(global.__workspace + '/' + path, query.data, function(err) {
						if (err !== null) {
							data.err_code = 40;
							data.message = "Can not save file";

							evt.emit("file_do_save_as", data);
						} else {
							

							

							
							exec('chmod 770 ' + global.__workspace + '/' + path);

							evt.emit("file_do_save_as", data);
							
						}
					});
				}
			});
		} else {
			data.err_code = 10;
			data.message = "Invalid query";
			evt.emit("file_do_save_as", data);
		}
	},

	get_file: function(filepath, filename, evt) {
		if (!fs.existsSync(__temp_dir)) {
			fs.mkdirSync(__temp_dir);
		}
		if (!fs.existsSync(__temp_dir + "/files")) {
			fs.mkdirSync(__temp_dir + "/files");
		}

		if (filepath) {
			var continue_path = "";
			var paths = filepath.split('/');

			for (var i = 0; i < paths.length; i++) {
				if (paths[i] !== "") {
					continue_path = continue_path + paths[i] + '/';
					if (!fs.existsSync(__temp_dir + "/files/" + continue_path)) {
						fs.mkdirSync(__temp_dir + "/files/" + continue_path);
					}
				}
			}
		}

		this.copy_file_sync(global.__workspace + filepath + filename, __temp_dir + "/files/" + filepath + filename);

		evt.emit("got_file", {
			result: true
		});
	},

	check_valid_edit: function(project_path, filepath, filename, evt) {
		var project_real_path = global.__workspace + '/' + project_path;

		var valid_path = function(base_path, filepath, filename, evt) {
			if (!check_valid_path(base_path + '/' + filepath + filename)) {
				evt.emit("check_valid_edit", {
					result: false,
					code: 3
				});
				return false;
			}
			fs.exists(base_path + '/' + filepath + filename, function(exists) {
				//valid file
				if (exists) {
					evt.emit("check_valid_edit", {
						result: true
					});
				} else {
					base_path = g_secure.command_filter(base_path);
					filepath = g_secure.command_filter(filepath);

					exec('mkdir -p ' + base_path + '/' + filepath, function(err, stdout, stderr) {
						evt.emit("check_valid_edit", {
							result: true,
							code: 10,
							exists: exists
						});
					});

				}
			});
		}

		fs.exists(project_real_path, function(project_exists) {
			if (project_exists) {
				fs.lstat(project_real_path, function(err, stats) {
					if (stats.isDirectory()) {
						if (stats.isSymbolicLink()) {

							// get real path
							//
							fs.readlink(project_real_path, function(read_err, link_path) {
								fs.realpath(link_path, function(real_path_err, link_real_path) {
									if (read_err || real_path_err) {
										evt.emit("check_valid_edit", {
											result: false,
											code: 2
										});
									} else {
										valid_path(link_real_path, filepath, filename, evt);
									}
								});
							});
						} else {
							valid_path(global.__workspace, filepath, filename, evt);
						}
					} else {
						evt.emit("check_valid_edit", {
							result: false,
							code: 1
						});
					}
				});


			} else {
				evt.emit("check_valid_edit", {
					result: false,
					code: 0
				});
			}
		});
	},

	copy_file_sync: function(srcFile, destFile) {
		var BUF_LENGTH = 64 * 1024;
		var buff = new Buffer(BUF_LENGTH);
		var fdr = fs.openSync(srcFile, 'r');
		var fdw = fs.openSync(destFile, 'w');
		var bytesRead = 1;
		var pos = 0;
		while (bytesRead > 0) {
			bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
			fs.writeSync(fdw, buff, 0, bytesRead);
			pos += bytesRead;
		}
		fs.closeSync(fdr);
		fs.closeSync(fdw);
	},


	do_delete_all: function(query, callback) {
		var directorys = query.directorys;
		var files = query.files;
		var data = {};
		if (files) {
			files.forEach(function(o) {
				rimraf(global.__workspace + '/' + o, function(err) {
					if (err !== null) {
						data.err_code = 20;
						data.message = "Can not delete file";
					}
				});
			});
		}
		if (directorys) {
			directorys.forEach(function(o) {
				rimraf(global.__workspace + '/' + o, function(err) {
					if (err !== null) {
						data.err_code = 20;
						data.message = "Can not delete file";
					}
				});
			});
		}
		callback({
			result: data
		});
	},
	do_copy_file_paste: function(req, callback) {
		var query = req.query;
		var data = "";

		if (query.source) {
			var files = query.source.files;
			var directorys = query.source.directorys;
			var target = query.target;
			target = g_secure.command_filter(target);

			if (files) {

				files.forEach(function(o) {

					var filename_split = o.split('/');
					var filename_full = filename_split[filename_split.length - 1];
					var filename, extension;

					//define filename (check if the file has extension)
					if (filename_full.indexOf('.') < 0) {
						filename = filename_full;
						extension = '';
					} else {
						filename = filename_full.substr(0, filename_full.lastIndexOf('.'));
						extension = '.' + filename_split[filename_split.length - 1].substr(filename_full.lastIndexOf('.') + 1);
					}

					//check if _copy file is exist and add the count.
					fs.exists(global.__workspace + target + '/' + filename + extension, function(e) {

						if (e) {

							var exist_func = function(i) {

								fs.exists(global.__workspace + target + '/' + filename + '_copy' + i + extension, function(e) {

									if (!e) {
										var path = target + '/' + filename + '_copy' + i + extension;
										exec("cp " + global.__workspace + '/' + o + " " + global.__workspace + target + '/' + filename + '_copy' + i + extension, function(error, stdout, stderr) {
											
											if (error !== null) {
												console.log(error);
												data += (" " + error.Error);
											}
										});
									} else exist_func(i + 1);
								});
							}

							exist_func(0);

						} else {

							var path = target + '/' + filename_full;
							exec("cp " + global.__workspace + '/' + o + " " + global.__workspace + target, function(error, stdout, stderr) {
								
								if (error !== null) {
									console.log(error);
									data += (" " + error.Error);
								}
							});
						}

					});
				});
			}
			if (directorys) {
				directorys.forEach(function(o) {
					exec("cp -r " + global.__workspace + o + " " + global.__workspace + target, function(error, stdout, stderr) {
						o = o.split("/");
						var path = target + "/" + o[o.length - 1];
						
						if (error !== null) {
							console.log(error);
							data += (" " + error.Error);
						}
					});
				});
			}
		}
		callback({
			result: ""
		});
	},

	upload_file_dd: function(req, evt) {
		var data = {
			'result': true,
			'err_code': 0
		}

		var file = req.files.file;
		var project_path = req.body.project_path;
		var force = (req.body.force == 'false' || req.body.force == false) ? false : ((req.body.force == 'true' || req.body.force == true) ? true : false);

		var abs_path = __workspace + '/' + project_path;
		var abs_file_path = abs_path + '/' + file.name;

		if (!check_valid_path(abs_path)) {
			data.result = false;
			data.err_code = 1;

			evt.emit('upload_finish', data);
			return false;
		}

		fs.exists(abs_file_path, function(exists) {
			var uid = parseInt(req.__user.uid, 10);
			var gid = parseInt(((Array.isArray(req.__user.gid) === true) ? req.__user.gid[0] : req.__user.gid), 10);

			if (global.__dev_mode) {
				uid = 501;
				gid = 501;
			}

			if (!exists) {
				var is = fs.createReadStream(file.path);
				var os = fs.createWriteStream(abs_file_path);

				is.pipe(os);

				is.on('end', function() {
					fs.unlink(file.path, function(err) {
						if (err) console.log(err);
					});

					exec('chmod 770 ' + abs_file_path + '; chown ' + uid + ':' + gid + ' ' + abs_file_path);

					data.path = file.name;
					evt.emit("upload_finish", data);
				});
			} else if (force) {
				fs.unlink(abs_file_path, function(err) {
					var is = fs.createReadStream(file.path);
					var os = fs.createWriteStream(abs_file_path);

					is.pipe(os);

					is.on('end', function() {
						fs.unlink(file.path, function(err) {
							if (err) console.log(err);
						});

						exec('chmod 770 ' + abs_file_path + '; chown ' + uid + ':' + gid + ' ' + abs_file_path);

						data.path = file.name;
						evt.emit("upload_finish", data);
					});
				});
			} else {
				data.result = false;
				data.err_code = 2;

				if (force) {
					data.err_code = 3;
				}

				evt.emit('upload_finish', data);
			}
		});
	},
	

	/**
	 * Get file list from the path
	 * @method get_result_ls
	 * @param  {Object{path, state}}      query
	 * @param  {[type]}      evt
	 * @return {[type]}
	 */
	get_result_ls: function(query, evt) {
		var _this = this;

		if (!check_valid_path(query.path)) {
			evt.emit('got_result_ls', false);
			return false;
		}

		var abs_path = path.join(global.__workspace, query.path);
		// console.log("get_result_ls");
		// console.log(abs_path);

		var opened_folders = (query.state) ? query.state : [];
		var author = query.author;
		var owner_roots = [];

		// console.log(opened_folders);

		var _read_dir = function() {
			if (opened_folders.length > 0) {
				////// push omitted parent folder. Jeong-Min Im. //////
				for (var i = 0; i < opened_folders.length; i++) {
					var folder_path = opened_folders[i];

					if (folder_path.lastIndexOf('/') > -1) {
						var parent = folder_path.slice(0, folder_path.lastIndexOf('/'));

						if (opened_folders.indexOf(parent) < 0)
							opened_folders.push(parent);
					}
				}
				opened_folders.sort();

				var promises = opened_folders.map(function(_path) {
					abs_path = path.join(__workspace, _path);
					return _this._read_dir(_path, abs_path, true);
				});

				// get only folders first.
				// after then get all files from these folders.
				Q.all(promises).then(function(list) {
					var file_list = [];
					list.map(function(files) {
						files.map(function(file) {
							file_list.push(file.id);
						});
					});

					// Remove duplicated path.
					opened_folders.map(function(path, i) {
						file_list.map(function(path2, j) {
							if (path === path2) {
								file_list.splice(j, 1);
							}
						});
					});
					file_list = opened_folders.concat(file_list);

					// get all files from these folders.
					var promises = file_list.map(function(_path) {
						abs_path = path.join(__workspace, _path);
						return _this._read_dir(_path, abs_path, false);
					});

					return Q.all(promises);
				}).then(function(list) {
					var file_list = [];
					list.map(function(files) {
						files.map(function(file) {
							file_list.push(file);
						});
					});
					// console.log(1);
					// console.log(file_list);
					evt.emit('got_result_ls', file_list);
				});
			} else {
				try {
					_this._read_dir(query.path, abs_path)
						.then(function(files) {
							// console.log(2);
							// console.log(files);
							evt.emit('got_result_ls', files);
						});
				} catch (e) {
					console.log('_read_dir error:', e);
					evt.emit('got_result_ls', files);
				}
			}
		};

		
		
		_read_dir();
		
	},

	_read_dir: function(relative_path, abs_path, folder_only) {
		var _this = this;
		if (folder_only === null) folder_only = false;
		if (fs.existsSync(abs_path)) {
			// return Promise
			return fs_readdir(abs_path)
				.then(function(files) {
					var promises = files.map(function(file) {
						return fs_stat(path.join(abs_path, file));
					});
					return Q.all(promises).then(function(stats) {
						return [files, stats];
					});
				})
				.then(function(data) {
					var files = data[0];
					var stats = data[1];
					var file_list = [];

					for (var i = 0; i < files.length; i++) {
						var name = files[i];
						var stat = stats[i];
						var file = {};

						if (name[0] === "." || name === "goorm.manifest" || /_run.js$/.test(name)) {} else {
							file.filename = name;
							file.text = name;
							file.id = relative_path + "/" + name;
							file.type = 'html';
							file.li_attr = {
								"path": file.id
							};
							file.parent = relative_path;

							if (stat.isFile()) {
								if (folder_only) continue;
								var type = path.extname(name);
								if (type[0] === '.') type = type.replace(".", "");
								file.li_attr.file_type = (type !== "") ? _this._set_filetype(type) : "etc";
								file.type = "file";
								file_list.push(file);
							} else {
									
								
								if (abs_path === "") {
									file.type = 'folder';
									file_list.push(file);
								}
								
								else {
									file.type = 'folder';
									file_list.push(file);
								}
							}
						}
					}

					return file_list;
				})
				.catch(function(error) {
					console.log(error);
					return [];
				});
		} else {
			console.log('_read_dir error(abs_path no exists):', abs_path);
			return [];
		}
	},

	_set_filetype: function(type) {
		switch (type) {
			case 'c':
			case 'c#':
			case 'c++':
			case 'class':
			case 'config':
			case 'cpp':
			case 'css':
			case 'doc':
			case 'docs':
			case 'gif':
			case 'go':
			case 'h':
			case 'html':
			case 'java':
			case 'jpeg':
			case 'jpg':
			case 'js':
			case 'json':
			case 'package':
			case 'pdf':
			case 'php':
			case 'png':
			case 'ppt':
			case 'pptx':
			case 'psd':
			case 'py':
			case 'rb':
			case 'rule':
			case 'tar':
			case 'template':
			case 'txt':
			case 'ui':
			case 'uml':
			case 'xib':
			case 'xls':
			case 'xlsx':
			case 'xml':
			case 'xoz':
			case 'zip':
			case 'blk':
				break;
			default:
				type = 'etc';
		}

		return type;
	},

	// check file or folder exists. Jeong-Min Im.
	check_exist: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = 'notice_process_done';
		data.exist = null;

		var path = query.ori_path || query.current_path;
		var name = query.dst_name || query.folder_name;

		if (path && name) {
			fs.stat(global.__workspace + '/' + path + '/' + name, function(err, stats) { // exist = true or false
				if (err) { // jeongmin: no exists
					data.exist = false;
					data.type = null;
				} else { // jeongmin: exists
					data.exist = true;
					data.type = stats.isFile() ? 'file' : 'directory';
				}

				evt.emit('file_check_exist', data);
			});
		} else {
			data.err_code = 10;
			data.message = "alert_invalide_query";

			evt.emit('file_check_exist', data);
		}
	}
};