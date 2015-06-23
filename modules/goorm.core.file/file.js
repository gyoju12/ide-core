/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var fs = require('fs-extra');
var async = require('async');
// var walk = require('walk');
var rimraf = require('rimraf');
var http = require('http');
var https = require('https');
var path = require('path');
var spawn = require('child_process').spawn;
var Q = require('q');
var fs_readdir = Q.denodeify(fs.readdir);
var fs_stat = Q.denodeify(fs.stat);

var g_secure = require('../goorm.core.secure/secure.js');



var check_valid_path = function(str) {
	if (!str) {
		return false;
	}
	return !(/\.\.|~|;|&|\|/.test(str));
};

module.exports = {
	
	do_new: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';
		if (query.path !== null) {
			var path = query.path;
			if (query.type !== '') {
				path += '.' + query.type;
			}

			// make new file. Jeong-Min Im.
			var create_file = function() {
console.log('file.do_new:', path);

				fs.writeFile(global.__workspace + '/' + path, '', function(err) {
					if (err !== null) {
						data.err_code = 40;
						data.message = 'Can not make a file';

						evt.emit('file_do_new', data);
					} else {
						
						evt.emit('file_do_new', data);
					}
				});
			};

			fs.stat(global.__workspace + '/' + path, function(err, stats) {
				if (err) { // no exist
					create_file();
				} else if (stats) { // exist
					if (stats.isDirectory()) { // jeongmin: can't make file using this name
						data.err_code = 28; // jeongmin: EISDIR
						data.message = 'alert_same_name_folder';
						evt.emit('file_do_new', data);
					} else if (query.new_anyway === 'false' || query.new_anyway === false) { // jeongmin: let user know same name exists
						data.err_code = 99;
						data.message = 'exist file';
						evt.emit('file_do_new', data);
					} else if ((query.new_anyway === 'true' || query.new_anyway === true) && stats.isFile()) { // jeongmin: overwrite file
						create_file();
					} else {
						data.err_code = 10;
						data.message = 'Invalid query';
						evt.emit('file_do_new', data);
					}
				} else {
					data.err_code = 10;
					data.message = 'Invalid query';
					evt.emit('file_do_new', data);
				}
			});
		} else {
			data.err_code = 10;
			data.message = 'Invalid query';
			evt.emit('file_do_new', data);
		}
	},

	do_new_folder: function(query, evt) {
		var data = {};
		data.err_code = 0;

		if (query.current_path !== null && query.folder_name !== null) {
			fs.exists(path.join(global.__workspace, query.current_path, query.folder_name), function(exists) {
				if (exists) {
					data.err_code = 20;
					evt.emit('file_do_new_folder', data);
				} else {
console.log('file.do_new_folder:', query.current_path + '/' + query.folder_name);

					fs.mkdir(global.__workspace + '/' + query.current_path + '/' + query.folder_name, '0777', function(err) {
						if (err !== null) {
							data.err_code = 30;
							evt.emit('file_do_new_folder', data);
						} else {
							
							evt.emit('file_do_new_folder', data);
						}
					});
				}
			});
		} else {
			data.err_code = 10;
			evt.emit('file_do_new_folder', data);
		}
	},

	do_new_untitled_text_file: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';

		if (query.current_path !== null) {
			fs.readdir(global.__workspace + '/' + query.current_path, function(err, files) {
				if (err !== null) {
					data.err_code = 10;
					data.message = 'Server can not response';

					evt.emit('file_do_new_untitled_text_file', data);
				} else {
					var temp_file_name = 'untitled';
					var i = 1;

					while (1) {
						if (files.hasObject(temp_file_name + i + '.txt')) {} else {
							break;
						}
						i++;
					}
console.log('file.do_new_text:', query.current_path + '/' + temp_file_name + i + '.txt');

					fs.writeFile(global.__workspace + '/' + query.current_path + '/' + temp_file_name + i + '.txt', '', function(err) {
						if (err !== null) {
							data.err_code = 40;
							data.message = 'Can not make project file';

							evt.emit('file_do_new_untitled_text_file', data);
						} else {
							data.filename = temp_file_name + i + '.txt';
							
							evt.emit('file_do_new_untitled_text_file', data);
						}
					});
				}
			});
		} else {
			data.err_code = 10;
			data.message = 'Invalid query';
			evt.emit('file_do_new_untitled_text_file', data);
		}
	},

	do_new_other: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';

		if (query.current_path !== null && query.file_name !== null) {
			fs.exists(global.__workspace + '/' + query.path, function(exists) {
				if (exists) {
					data.err_code = 20;
					data.message = 'Exist file';

					evt.emit('file_do_new_other', data);
				} else {
console.log('file.do_new_other:', query.current_path + '/' + query.file_name);

					fs.writeFile(global.__workspace + '/' + query.current_path + '/' + query.file_name, '', function(err) {
						if (err !== null) {
							data.err_code = 40;
							data.message = 'Can not make file';

							evt.emit('file_do_new_other', data);
						} else {
							
							evt.emit('file_do_new_other', data);
						}
					});
				}
			});
		} else {
			data.err_code = 10;
			data.message = 'Invalid query';
			evt.emit('file_do_new_other', data);
		}
	},

	put_contents: function(query, evt) {

		var data = {};
		var abs_path = global.__workspace + '/' + query.path;
		if (!check_valid_path(abs_path)) {
			data.err_code = 10;
			data.message = 'Can not save';

			evt.emit('file_put_contents', data);
		} else {
			if (query.mode && query.mode.indexOf('secure') > -1) {
				g_secure.save({
					'path': abs_path,
					'user_id': query.user_id,
					'data': query.data,
					'append': (query.options && query.options.append === true) ? true : false
				}, function(save) {
					if (save.result) {
						data.err_code = 0;
						data.message = 'saved';

						evt.emit('file_put_contents', data);
					} else {
						data.err_code = 10;
						data.message = 'Can not save';

						evt.emit('file_put_contents', data);
					}
				});
			} else {
				if (query.options !== undefined && query.options.append === true) {
					fs.appendFile(abs_path, query.data, function(err) {
						if (err !== null) {
							data.err_code = 10;
							data.message = 'Can not save';

							evt.emit('file_put_contents', data);
						} else {
							data.err_code = 0;
							data.message = 'saved';

							evt.emit('file_put_contents', data);
						}
					});
				} else {
					fs.writeFile(abs_path, query.data, function(err) {
						if (err !== null) {
							data.err_code = 10;
							data.message = 'Can not save';

							evt.emit('file_put_contents', data);
						} else {
							data.err_code = 0;
							data.message = 'saved';

							evt.emit('file_put_contents', data);
						}
					});
				}
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
				if (files[j].root === '') {
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

	do_delete: function(files, evt) {
		var file_del_func = [];

		for (var i = files.length - 1; 0 <= i; i--) {
console.log('file.do_delete:', files[i]);

			file_del_func.push(function(callback) {
				rimraf(path.join(global.__workspace, files[++i]), function(err) {
					if (!err) {
						callback();
					} else {
						console.log('file.js', 'do_delete', 'file delete fail', err);

						callback(null, files[i]);
					}
				});
			});
		}

		async.parallel(file_del_func, function(err, result) {
			result = result.filter(Boolean);

			if (result.length) {
				evt.emit('file_do_delete', {
					'err_file': result,
					'total_file': files.filter(function(item) { // remove error files
						return result.indexOf(item) === -1;
					})
				});
			} else {
				evt.emit('file_do_delete', {
					'total_file': files
				});
			}
		});
	},

	//useonly(mode=goorm-standalone,goorm-oss)
	do_rename: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';

		if (query.ori_path !== null && query.ori_name !== null && query.dst_name !== null) {
			var path = global.__workspace + '/' + query.ori_path;

console.log('file.do_rename:', query.ori_path + query.ori_name);
console.log('file.do_rename:', query.ori_path + query.dst_name);
g_project_watch.ignore_watch(query.ori_path + query.ori_name);
g_project_watch.ignore_watch(query.ori_path + query.dst_name);
			fs.rename(path + query.ori_name, path + query.dst_name, function(err) {
				if (err) {
					data.err_code = 11;
					data.message = 'Fail to rename';

					console.log(err);
				} else {
					data.path = query.ori_path;
					data.file = query.dst_name;
				}

				evt.emit('file_do_rename', data);
			});
		} else {
			data.err_code = 10;
			data.message = 'Invalide query';

			evt.emit('file_do_rename', data);
		}
	},
	

	

	//useonly(mode=goorm-standalone,goorm-oss)
	do_move: function(query, evt) {
		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';
		data.err_files = [];

		function move(file_data, last) { // last: all files are moved or not
			var ori_full = global.__workspace + '/' + file_data.ori_path + '/' + file_data.ori_file;
			var dst_full = global.__workspace + '/' + file_data.dst_path + '/' + file_data.dst_file;

console.log('file.do_move:', file_data.ori_path + '/' + file_data.ori_file);
console.log('file.do_move:', file_data.dst_path + '/' + file_data.dst_file);
g_project_watch.ignore_watch(file_data.ori_path + '/' + file_data.ori_file);
g_project_watch.ignore_watch(file_data.dst_path + '/' + file_data.dst_file);
			fs.rename(ori_full, dst_full, function(err) {
				if (err !== null) {
					console.log('ERROR [fs.rename fails - do_move() in file.js]:', err);

					data.err_code = err.errno;
					data.message = 'Can not move file';
					data.err_files.push(file_data.ori_path + '/' + file_data.ori_file);
				}

				if (last) {
					data.path = file_data.dst_path;
					data.file = file_data.dst_file;

					data.total_file = query.ori_path.filter(function(item) { // remove error files
						return data.err_files.indexOf(item) === -1;
					});

					evt.emit('file_do_move', data);
				}
			});
		}

		if (query.ori_path && query.ori_file && query.dst_path && query.dst_file) { // jeongmin: from dialog. Only one file.
			move(query, true);
		} else if (query.ori_path && query.dst_path) { // jeongmin: from drag and drop. Can be multiple files.
			for (var i = query.ori_path.length - 1; 0 <= i; i--) {
				var ori_path = query.ori_path[i];
				var last_slash = ori_path.lastIndexOf('/');
				var file = ori_path.slice(last_slash + 1);

				move({
					ori_path: ~last_slash ? ori_path.slice(0, last_slash) : ori_path, // has slash(remove it) : has no slash(just use it)
					ori_file: file, // jeongmin: file name is same on drag and drop
					dst_path: query.dst_path,
					dst_file: file
				}, i === 0);
			}
		} else {
			data.err_code = 18; // EINVAL
			data.message = 'Invalid query';

			evt.emit('file_do_move', data);
		}
	},
	

	

	//useonly(mode=goorm-standalone,goorm-oss)
	do_import: function(query, file, evt) {
		var data = {};
		data.err_code = 0;
		// data.message = 'Process Done';
		data.file = [];

		if (file && query.file_import_location_path !== null && query.file_import_location_path !== undefined) {
			if (!(file instanceof Array)) {
				file = new Array(file);
			}

			var load_count = 0;
			var unload_count = 0;

			// 덮어쓰기일 경우, 무조건 write
			if (query.is_overwrite == 'true') {
				async.map(file, function(item, callback) {
					var __file = item;
					var file_path = query.file_import_location_path + '/' + __file.originalname;

					var is = fs.createReadStream(__file.path);
					var os = fs.createWriteStream(global.__workspace + '/' + file_path);

					is.pipe(os);

					is.on('end', function() {
						callback(null, file_path);
					});
				}, function(err, results) {
					if (err) {
						console.log(err);
					}
					if (results) {
						data.file = results.filter(Boolean); // for letting other co-developers know imported file

						evt.emit('file_do_import', data);
					}
				});
			} else { // 덮어쓰기 아닐 경우
				// 중복되지 않은 파일만 write
				for (var i = 0; i < file.length; i++) {
					var __file = file[i];
					var file_path = query.file_import_location_path + '/' + __file.originalname;

					if (fs.existsSync(global.__workspace + '/' + file_path)) {
						unload_count++;

						if (load_count + unload_count === file.length) {
							if (load_count === 0) {
								data.err_code = 10;
							}
							evt.emit('file_do_import', data);
						}
					} else {
						var is = fs.createReadStream(__file.path);
						var os = fs.createWriteStream(global.__workspace + '/' + file_path);

						is.pipe(os);

						is.on('end', function() {
							data.file.push(file_path);
							// fs.unlink(__file.path, function(err){
							// 	if (err) console.log(err);
							// });
							load_count++;
							if (load_count + unload_count === file.length) {
								evt.emit('file_do_import', data);
							}

						});
					}
				}

			}

			/*
			// file path
			var file_path = query.file_import_location_path + '/' + file.name;

			if (fs.existsSync(global.__workspace + '/' + file_path) && query.is_overwrite != 'true') {
				data.err_code = 21;
				data.message = 'The file '' + file.name  + ''' + ' already exists. Do you want to overwrite the file?';

				evt.emit('file_do_import', data);

			} else {
				var loaded = 0; // jeongmin: number of loaded files
				var	stream = function(_file, length) {
						var is = fs.createReadStream(_file.path);
						var os = fs.createWriteStream(global.__workspace + '/' + query.file_import_location_path + '/' + _file.name);

						is.pipe(os);

						is.on('end', function() {
							fs.unlink(_file.path, function(err) {
								if (err) console.log(err);
							});

							loaded++; // jeongmin: file is loaded

							// true: all file's imported
							if (loaded == length)
								evt.emit('file_do_import', data);
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
			// data.message = 'Invalide query';

			evt.emit('file_do_import', data);
		}
	},
	

	

	// export file. Jeong-Min Im.
	// query (Object)
	// evt (EventEmitter)

	//useonly(mode=goorm-standalone,goorm-oss)
	do_export: function(query, evt) {
		fs.mkdir(path.join(global.__temp_dir, query.user), '0777', function(err) {
			var target = query.path;

			if (!err || err.errno === 47) { //errno 47 is exist folder error
				var copy_func = [];

				query.user = g_secure.command_filter(query.user);

				for (var i = target.length - 1; 0 <= i; i--) {
					copy_func.push(function(callback) {
						i++;

						target[i] = g_secure.command_filter(target[i]);

						fs.copy(path.join(global.__workspace, target[i]), path.join(global.__temp_dir, query.user, target[i]), function(_err) {
							if (!_err) {
								callback();
							} else {
								console.log('file.js', 'do_export', 'copy file to temp dir fail', _err);
								callback(null, target[i]);
							}
						});
					});
				}

				async.parallel(copy_func, function(_err, result) {
					result = result.filter(Boolean);
					target = target.filter(function(item) {
						return result.indexOf(item) === -1;
					});
					target = (query.user + '/' + target.join(' ' + query.user + '/')).split(' '); // add user id as prefix

					if (result.length) {
						evt.emit('file_do_export', {
							'err_code': 4,
							'err_file': result,
							'path': target
						});
					} else {
						evt.emit('file_do_export', {
							'path': target
						});
					}
				});
			} else {
				console.log('file.js', 'do_export', 'make temp dir fail', err);
				evt.emit('file_do_export', {
					'err_code': 3
				});
			}
		});
	},
	

	

	
	get_property: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';
		if (query.path !== null) {
			var path = global.__workspace + '/' + query.path;

			fs.stat(path, function(err, stats) {
				if (err === null) {
					var _stdout = '';

					command = spawn('file', [path]);
					command.stdout.on('data', function(data) {
						_stdout += data;
					});
					command.on('close', function() {
						var temp_path = query.path.split('/');
						var path = '';
						for (var i = 0; i < temp_path.length - 1; i++) {
							path += temp_path[i] + '/';
						}

						data.filename = temp_path[temp_path.length - 1];
						data.filetype = _stdout.split(': ')[1]; // temp_path[temp_path.length - 1].split('.')[1];
						data.path = path;
						data.size = stats.size;
						data.atime = stats.atime;
						data.mtime = stats.mtime;
						data.isFile = stats.isFile(); //jeongmin: whether this is file or directory

						evt.emit('file_get_property', data);
					});

				} else {
					data.err_code = 20;
					data.path = query.path;
					data.message = 'Can not find target file';
					//console.log('get property stat error:', err, data.message);
					evt.emit('file_get_property', data);
				}
			});
		} else {
			data.err_code = 10;
			data.message = 'Invalide query';

			evt.emit('file_get_property', data);
		}
	},

	do_save_as: function(query, evt) {

		var data = {};
		data.err_code = 0;
		data.message = 'Process Done';

		if (query.path !== null) {
			var path = query.path;
			if (query.type !== '') {
				path += '.' + query.type;
			}

			fs.exists(global.__workspace + '/' + path, function(exists) {
				if (exists && (query.save_anyway === 'false' || query.save_anyway === false)) {
					data.err_code = 99;
					data.message = 'exist file';
					evt.emit('file_do_save_as', data);
				} else if (exists && (query.save_anyway === 'true' || query.save_anyway === true)) {
					rimraf(global.__workspace + '/' + path, function(err) {
						if (err) {
							data.err_code = 88;
							data.message = 'Can not overwrite file';

							evt.emit('file_do_save_as', data);
						} else {
							fs.writeFile(global.__workspace + '/' + path, query.data, function(err) {
								if (err !== null) {
									data.err_code = 40;
									data.message = 'Can not save file';

									evt.emit('file_do_save_as', data);
								} else {
									

									

									//useonly(mode=goorm-oss)
									fs.chmod(global.__workspace + '/' + path, 0770, function() {
										evt.emit('file_do_save_as', data);
									});
									
								}
							});
						}
					});
				} else {
					fs.writeFile(global.__workspace + '/' + path, query.data, function(err) {
						if (err !== null) {
							data.err_code = 40;
							data.message = 'Can not save file';

							evt.emit('file_do_save_as', data);
						} else {
							

							

							//useonly(mode=goorm-oss)
							fs.chmod(global.__workspace + '/' + path, 0770, function() {
								evt.emit('file_do_save_as', data);
							});
							
						}
					});
				}
			});
		} else {
			data.err_code = 10;
			data.message = 'Invalid query';
			evt.emit('file_do_save_as', data);
		}
	},

	//useonly(mode=goorm-standalone,goorm-oss)
	get_file: function(options, evt) {
		var filepath = options.filepath;
		var filename = options.filename;

		if (!fs.existsSync(__temp_dir)) {
			fs.mkdirSync(__temp_dir);
		}

		if (!fs.existsSync(__temp_dir + '/files')) {
			fs.mkdirSync(__temp_dir + '/files');
		}

		if (filepath) {
			var continue_path = '';
			var paths = filepath.split('/');

			for (var i = 0; i < paths.length; i++) {
				if (paths[i] !== '') {
					continue_path = continue_path + paths[i] + '/';
					if (!fs.existsSync(__temp_dir + '/files/' + continue_path)) {
						fs.mkdirSync(__temp_dir + '/files/' + continue_path);
					}
				}
			}
		}

		this.copy_file_sync(global.__workspace + filepath + filename, __temp_dir + '/files/' + filepath + filename);

		evt.emit('got_file', {
			result: true
		});
	},
	

	

	

	

	//useonly(mode=goorm-oss)
	check_valid_edit: function(options, evt) {
		var project_path = options.project_path;
		var filepath = options.filepath;
		var filename = options.filename;

		var project_real_path = global.__workspace + '/' + project_path;

		var valid_path = function(base_path, filepath, filename, evt) {
			if (!check_valid_path(base_path + '/' + filepath + filename)) {
				evt.emit('check_valid_edit', {
					result: false,
					code: 3
				});
				return false;
			}

			fs.exists(base_path + '/' + filepath + filename, function(exists) {
				//valid file
				if (exists) {
					evt.emit('check_valid_edit', {
						result: true
					});
				} else {
					base_path = g_secure.command_filter(base_path);
					filepath = g_secure.command_filter(filepath);

					fs.mkdirs(base_path + '/' + filepath, function() {
						evt.emit('check_valid_edit', {
							result: true,
							code: 10,
							exists: exists
						});
					});

				}
			});
		};

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
										evt.emit('check_valid_edit', {
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
						evt.emit('check_valid_edit', {
							result: false,
							code: 1
						});
					}
				});

			} else {
				evt.emit('check_valid_edit', {
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
	// check if paste target directory exists (judge whether overwrite or not). Jeong-Min Im.
	// req (Object) : {
	// 	query (Object) : {
	// 		source (Object) : {
	// 			directorys (Array) : copied directory.
	// 		}
	// 		target (String) : paste target directory.
	// 	}
	// }
	// _callback (Function)
	do_directory_exist: function(req, _callback) {
		var directorys = req.query.source.directorys;
		var target = g_secure.command_filter(req.query.target); // paste target directory
		var exist_func = []; // for async

		for (var i = directorys.length - 1; 0 <= i; i--) {
			directorys[i] = g_secure.command_filter(directorys[i]);

			exist_func.push(function(callback) {

				fs.exists(path.join(global.__workspace, target, path.basename(directorys[++i])), function(exist) {
					if (exist) {
						callback(true, directorys[i]);
					} else {
						callback(false, directorys[i]);
					}
				});
			});
		}

		async.parallel(exist_func, function(err, result) {
			result = result.filter(Boolean); // remove undefined

			if (path.join(global.__workspace, target, path.basename(result)).indexOf(result) > -1) {
				_callback({
					'err_code': 3,
					'err_file': result
				});
			} else if (err) { // ask overwrite
				_callback({
					'err_code': 2,
					'err_file': result
				});
			} else {
				_callback(false);
			}
		});
	},
	// paste file/directory to target. Jeong-Min Im.
	// req (Object) : {
	// 	query (Object) : {
	// 		source (Object) : {
	// 			files (Array) : copied files.
	// 			directorys (Array) : copied directories.
	// 		}
	// 	}
	// }
	// _callback (Function)
	
	
	//useonly(mode=goorm-oss)
	do_copy_file_paste: function(req, _callback) {
		var files = req.query.source.files;
		var directorys = req.query.source.directorys;
		var file_copy_func = [];
		var directory_copy_func = [];

		if (files) {
			for (var i = files.length - 1; 0 <= i; i--) {
				files[i] = g_secure.command_filter(files[i]);

				file_copy_func.push(function(callback) {
					++i;

					var target = g_secure.command_filter(req.query.target || path.dirname(files[i]));
					var ext = path.extname(files[i]);
					var file_name = path.basename(files[i], ext);

					//check if _copy file is exist and add the count.
					fs.exists(path.join(global.__workspace, target, file_name + ext), function(exist) {
						var copy = function(target_path) {
							fs.copy(path.join(global.__workspace, files[i]), path.join(global.__workspace, target_path), function(err) {
								if (err) {
									console.log('file.js', 'do_copy_file_paste', 'file copy fail', err);

									callback(null, files[i]);
								} else {
									callback();
								}
							});
						};

						if (exist) {
							var exist_func = function(j) {
								fs.exists(path.join(global.__workspace, target, file_name + '_copy' + j + ext), function(_exist) {
									if (!_exist) {
										copy(path.join(target, file_name + '_copy' + j + ext));
									} else {
										exist_func(j + 1);
									}
								});
							};

							exist_func(0);
						} else {
							copy(path.join(target, file_name + ext));
						}
					});
				});
			}
		}

		var target = g_secure.command_filter(req.query.target);
		if (target && directorys) { // except duplicate
			for (var j = directorys.length - 1; 0 <= j; j--) {
				directorys[j] = g_secure.command_filter(directorys[j]);

				directory_copy_func.push(function(callback) {
					var target_path = path.join(target, path.basename(directorys[++j]));

					fs.copy(path.join(global.__workspace, directorys[j]), path.join(global.__workspace, target_path), function(err) {
						if (err) {
							console.log('file.js', 'do_copy_file_paste', 'directory copy fail', err);

							callback(null, directorys[j]);
						} else {
							callback();
						}
					});
				});
			}
		}

		async.parallel(file_copy_func, function(err, result) {
			async.parallel(directory_copy_func, function(_err, _result) {
				result = result.filter(Boolean);
				_result = _result.filter(Boolean);

				var total_file = files.concat(directorys).filter(Boolean);
				var err_file = result.concat(_result);

				if (result.length || _result.length) {
					_callback({
						'err_file': err_file,
						'total_file': total_file.filter(function(item) {
							return err_file.indexOf(item) === -1;
						})
					});
				} else {
					_callback({
						'total_file': total_file
					});
				}
			});
		});
	},
	

	/*
	upload_file_dd: function(req, evt) {
		var data = {
			'result': true,
			'err_code': 0
		}

		var file = (req.files && req.files.file) ? req.files.file : req.body.file;
		var project_path = req.body.project_path;
		var force = (req.body.force == 'false' || req.body.force == false) ? false : ((req.body.force == 'true' || req.body.force == true) ? true : false);

		var abs_path = __workspace + '/' + project_path;
		var abs_file_path = abs_path + '/' + file.originalname;

		if (!check_valid_path(abs_path)) {
			data.result = false;
			data.err_code = 1;

			evt.emit('upload_finish', data);
			return false;
		}

		fs.exists(abs_file_path, function(exists) {
			

			if (!exists) {
				var is = fs.createReadStream(file.path);
				var os = fs.createWriteStream(abs_file_path);

				is.pipe(os);

				is.on('end', function() {
					fs.unlink(file.path, function(err) {
						if (err) {
							console.log(err);
						}
					});

					

					data.path = file.originalname;
					evt.emit('upload_finish', data);
				});
			} else if (force) {
				fs.unlink(abs_file_path, function(err) {
					var is = fs.createReadStream(file.path);
					var os = fs.createWriteStream(abs_file_path);

					is.pipe(os);

					is.on('end', function() {
						fs.unlink(file.path, function(err) {
							if (err) {
								console.log(err);
							}
						});

						

						data.path = file.originalname;
						evt.emit('upload_finish', data);
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
	*/
	// moving uploaded files to target directories. Jeong-Min Im.
	// req (Object) : information set for uploading
	// evt (EventEmitter) : for sending result
	

	

	//useonly(mode=goorm-oss)
	upload_dir_file: function(req, evt) {
		if (req.body) {
			var files = (req.files && req.files.file) ? req.files.file : req.body.file;
			var target_path = req.body.target_path;

			if (files && target_path && target_path[0] !== '/') {
				var file_arr = [];
				if (!Array.isArray(files)) { //one file
					file_arr.push(files);
				} else {
					file_arr = files;
				}
				if (file_arr.length) {
					full_target_path = g_secure.command_filter(global.__workspace + target_path);
					if (check_valid_path(full_target_path)) {
						fs.exists(full_target_path, function(exists) {
							if (exists) { // move tmp -> workspace
								full_target_path = g_secure.command_filter(global.__workspace + target_path);

								var mv_exec = [];
								var file_path = req.body.file_path;

								if (!Array.isArray(file_path)) {
									file_path = [file_path];
								}

								for (var i = file_arr.length - 1; 0 <= i; i--) {
									mv_exec.push(function(callback) {
										i++;
										if (check_valid_path(full_target_path + '/' + file_arr[i].originalname)) {
											file_arr[i].path = g_secure.command_filter(file_arr[i].path);
											file_arr[i].originalname = g_secure.command_filter(file_arr[i].originalname);
											file_path[i] = g_secure.command_filter(file_path[i].slice(file_path[i].indexOf('/')));
											fs.move(file_arr[i].path, full_target_path + file_path[i], function(err) {
												if (err) {
													console.log('ERROR (upload_dir_file mv):', err);
												}
												callback();
											});
										} else {
											callback();
										}
									});
								}

								async.series(mv_exec, function() {
									evt.emit('upload_dir_file', true);
								});
							} else {
								evt.emit('upload_dir_file', false);
							}
						});
					} else {
						evt.emit('upload_dir_file', false);
					}
				} else {
					evt.emit('upload_dir_file', false);
				}
			} else {
				evt.emit('upload_dir_file', false);
			}
		} else {
			evt.emit('upload_dir_file', false);
		}
	},
	

	// making skeleton directories of uploaded folder. Jeong-Min Im.
	// options (Object) : information set for uploading
	// evt (EventEmitter) : for sending result
	upload_dir_skeleton: function(options, evt) {
		if (options) {
			var target_path = options.target_path;

			if (options.folders && target_path && target_path[0] !== '/') {
				var full_target_path = g_secure.command_filter(global.__workspace + target_path); // workspace/project_root

				if (check_valid_path(full_target_path)) {
					fs.exists(full_target_path, function(exists) {
						if (exists) {
							var folders = options.folders;
							var mkdir_path = g_secure.command_filter(full_target_path + '/' + folders[0]);

							fs.stat(mkdir_path, function(err, stats) { // jeongmin: check there is file that has same name
								function mkdir() {
									var mkdir_p_exec = [];

									for (var i = folders.length - 1; 0 <= i; i--) {
										mkdir_p_exec.push(function(callback) {
											i++;

											var path = g_secure.command_filter(full_target_path + '/' + folders[i]);

											if (check_valid_path(path)) {
												fs.mkdirs(path, function(err) {
													if (err) {
														console.log('ERROR (upload_dir_skeleton mkdir):', err);
													}
													callback();
												});
											} else {
												callback();
											}
										});
									}

									async.series(mkdir_p_exec, function() {
										
										evt.emit('upload_dir_skeleton', {
											'result': true,
											'err_code': 0
										});
									});
								}

								if (!err && stats.isFile()) { // exists and it's file -> it's folder upload so there must not be file that has same name
									fs.unlink(mkdir_path, function(err) {
										if (err) {
											console.log('ERROR (upload_dir_skeleton rm):', err);

											evt.emit('upload_dir_skeleton', {
												'result': false,
												'err_code': 3
											});
										} else {
											mkdir();
										}
									});
								} else { // not exists -> just go on
									mkdir();
								}
							});
						} else {
							evt.emit('upload_dir_skeleton', {
								'result': false,
								'err_code': 3
							});
						}
					});
				} else {
					evt.emit('upload_dir_skeleton', {
						'result': false,
						'err_code': 2
					});
				}
			} else {
				evt.emit('upload_dir_skeleton', {
					'result': false,
					'err_code': 1
				});
			}
		} else {
			evt.emit('upload_dir_skeleton', {
				'result': false,
				'err_code': 1
			});
		}
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

		var project_path = query.project_path;
		var abs_path = path.join(global.__workspace, query.path);

		//console.log('get_result_ls');
		//console.log(abs_path);

		var opened_folders = (query.state) ? query.state : [];
		var author = query.author;
		var owner_roots = [];

		

		//console.log(opened_folders);

		var _read_dir = function() {
			if (opened_folders.length > 0) {
				var root_folder = query.path;
				opened_folders = opened_folders.map(function(_path) {
					return (_path.indexOf(root_folder) === 0) ? _path.slice(root_folder.length) : _path;
				});
				////// push omitted parent folder. Jeong-Min Im. //////
				for (var i = 0; i < opened_folders.length; i++) {
					var folder_path = opened_folders[i];

					if (folder_path.lastIndexOf('/') > -1) {
						var parent = folder_path.slice(0, folder_path.lastIndexOf('/'));

						if (opened_folders.indexOf(parent) < 0) {
							opened_folders.push(parent);
						}
					}
				}
				opened_folders = opened_folders.map(function(_path) {
					return root_folder + _path;
				});
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
					opened_folders.map(function(path) {
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
					//console.log(1);
					//console.log(file_list);
					evt.emit('got_result_ls', file_list);
				});
			} else {
				try {
					_this._read_dir(query.path, abs_path)
						.then(function(files) {
							

							evt.emit('got_result_ls', files);
						});
				} catch (e) {
					console.log('_read_dir error:', e);
					evt.emit('got_result_ls', false);
				}
			}
		};

		
		//useonly(mode=goorm-oss)
		_read_dir();
		
	},

	_read_dir: function(relative_path, abs_path, folder_only) {
		var _this = this;
		if (folder_only === null) {
			folder_only = false;
		}
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

						if (name[0] === '.' || name === 'goorm.manifest' || name === 'lost+found' || /_run.js$/.test(name)) {} else {
							file.filename = name;
							file.text = name;
							file.id = relative_path + '/' + name;
							file.type = 'html';
							file.li_attr = {
								'path': file.id
							};
							file.parent = relative_path;

							if (stat.isFile()) {
								if (folder_only) {
									continue;
								}
								var type = path.extname(name).toLowerCase();
								if (type[0] === '.') {
									type = type.replace('.', '');
								}
								file.li_attr.file_type = (type !== '') ? _this._set_filetype(type) : 'etc';
								file.type = 'file';
								file_list.push(file);
							} else {
								
								//useonly(mode=goorm-oss)
								if (abs_path === '') {
									file.type = 'folder';
									file_list.push(file);
								} else {
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
			case 'bmp':
			case 'c':
			case 'c#':
			case 'c++':
			case 'class':
			case 'config':
			case 'cpp':
			case 'css':
			case 'doc':
			case 'docx':
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
			case 'sh':
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
			case 'avi':
			case 'mpg':
			case 'mp4':
			case 'wmv':
			case 'rar':
			case 'egg':
				break;
			default:
				type = 'etc';
		}

		return type;
	},

	// check file or folder exists. Jeong-Min Im.
	//useonly(mode=goorm-standalone,goorm-oss)
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
			data.message = 'alert_invalide_query';

			evt.emit('file_check_exist', data);
		}
	},
	
	
};
