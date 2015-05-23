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
// var exec = require('child_process').exec,
var spawn = require('child_process').spawn;

var g_auth_project = require('../goorm.core.auth/auth.project');
var g_project = require('../goorm.core.project/project');

var g_secure = require('../goorm.core.secure/secure.js');

module.exports = {

	do_search: function(query, evt) {
		var self = this;

		var author = query.author;
		var uid = query.uid;
		var find_query = query.find_query;
		var project_path = query.project_path;
		var folder_path = query.folder_path;
		var grep_option = query.grep_option || {};

		var nodes = {};
		var make_grep_option = function(options) {
			var grep = ['-r', '-n', '--context=2', '--null'];
			var is_true = function(str) {
				var r = false;
				if (str && (str === true || str === 'true')) {
					r = true;
				}

				return r;
			};

			if (is_true(options.use_regexp)) {
				grep.push('-E');
			} else {
				grep.push('-F');
			}

			if (is_true(options.whole_word)) {
				grep.push('-w');
			}

			if (!is_true(options.match_case)) {
				grep.push('-i');
			}

			if (options.include && options.include.length > 0) {
				grep = grep.concat(options.include);
			}

			grep = grep.concat(['--exclude=.*', '--exclude={bin,file.list}', '--exclude=goorm.manifest', '--exclude-dir=.*']); // jeongmin: in spawn, exclude item should be separated

			return grep;
		};

		var parser = function(data) {
			var nodes = {};
			var node = {};
			var i = 0;
			var total_match = 0;
			
			var temp = [];
			var saved_filename = '';
			var current_filename = '';
			var whole_line = '';
			var short_filename = '';

			var make_node = function(arr) {
				var code = [];
				var context = '';
				var line_num = 0;
				var start_line = 0;
				var match_line = [];
				if (arr[0] === '') {
					total_match++;
					return {
						start_line: start_line,
						match_line: [],
						code: ['Binary file matches']
					};
				}
				start_line = parseInt(arr[0].match(/^\d+/)[0], 10);
				for (var i = 0; i < arr.length; i++) {
					context = arr[i].replace(/^\d+/, '');
					if (context.substr(0,1) === ':') {
						match_line.push(parseInt(arr[i].match(/^\d+/)[0], 10));
						total_match++;
					}
					code.push(context.substr(1, context.length-1));
				}
				return {
					start_line: start_line,
					match_line: match_line,
					code: code
				};
			};

			if (data.length !== 0) {
				for (i = 0; i < data.length; i++) {
					// end of group
					if (data[i] === '--') {
						if (temp.length > 0) {
							node = make_node(temp);
							short_filename = saved_filename.replace(global.__workspace, '');
							if (!nodes[short_filename]) {
								nodes[short_filename] = [];
							}
							nodes[short_filename].push(node);
							temp = [];	
						}
						saved_filename = '';
					} else {
						whole_line = data[i].split(/\0/);
						// same group same file
						if (whole_line[0] === saved_filename) {
							whole_line.shift();
							temp.push(whole_line.join(/\0/));
						} else {
							if (temp.length > 0) {	// same group different file
								node = make_node(temp);
								short_filename = saved_filename.replace(global.__workspace, '');
								if (!nodes[short_filename]) {
									nodes[short_filename] = [];
								}
								nodes[short_filename].push(node);
								temp = [];

								saved_filename = whole_line.shift();
								temp.push(whole_line.join(/\0/));
							} else if (temp.length === 0) {	// start of group
								saved_filename = whole_line.shift();
								temp.push(whole_line.join(/\0/));
							}
						}
					}
				}
				// last group
				if (temp.length > 0) {
					node = make_node(temp);
					short_filename = saved_filename.replace(global.__workspace, '');
					if (!nodes[short_filename]) {
						nodes[short_filename] = [];
					}
					nodes[short_filename].push(node);
					temp = [];	
				}
				
			}
			return {
				nodes: nodes,
				total_match: total_match
			};
		}

		// make grep option
		//
		grep_option = make_grep_option(grep_option);

		var owner_roots = [];
		

		//useonly(mode=goorm-oss)
		g_project.get_list(null, null, function(owner_project_data) {
			for (var i = 0; i < owner_project_data.length; i++) {
				owner_roots.push('/' + owner_project_data[i].name);
			}

			if (project_path === '/' && owner_roots.length !== 0) {
				var count = 0;
				var total_match = 0;

				for (var i = 0; i < owner_roots.length; i++) {
					(function(index) {
						var __project_path = owner_roots[index];
						self.get_data_from_project({
							'find_query': find_query,
							'project_path': __project_path,
							'folder_path': folder_path,
							'grep_option': grep_option
						}, evt, function(res) {
							count++;
							
							if (res.total_match) {
								total_match += res.total_match;	
							}
							if (count === owner_roots.length) {
								res.total_match = total_match;
								evt.emit('file_do_search_on_project', res);
							} else {
								evt.emit('file_searching', res);
							}
						});
						F.auth_add_user();
					})(i);
				}
			} else if (owner_roots.indexOf(project_path) > -1) {
				self.get_data_from_project({
					'find_query': find_query,
					'project_path': project_path,
					'folder_path': folder_path,
					'grep_option': grep_option
				}, evt);
			} else {
				evt.emit('file_do_search_on_project', {
					error: true;
				});
			}
		});
		
	},

	do_replace: function(query, evt) {
		var self = this;

		var author = query.author;
		var uid = query.uid;
		var find_query = query.find_query;
		var replace_query = query.replace_query;
		var project_path = query.project_path;
		var folder_path = query.folder_path;
		var grep_option = query.grep_option || {};

		var make_grep_option = function(options) {
			var grep = ['-r', '-l', '--null'];
			var is_true = function(str) {
				var r = false;
				if (str && (str === true || str === 'true')) {
					r = true;
				}

				return r;
			};

			if (is_true(options.use_regexp)) {
				grep.push('-E');
			} else {
				grep.push('-F');
			}

			if (is_true(options.whole_word)) {
				grep.push('-w');
			}

			if (!is_true(options.match_case)) {
				grep.push('-i');
			}

			if (options.include && options.include.length > 0) {
				grep = grep.concat(options.include);
			}

			grep = grep.concat(['--exclude=.*', '--exclude={bin,file.list}', '--exclude=goorm.manifest', '--exclude-dir=.*']); // jeongmin: in spawn, exclude item should be separated

			return grep;
		};

		var make_xargs_option = function(old_word, new_word) {
			var xargs = ['-0', 'sed', '-i', '', '-e'];
			var replace_string = 's/' + old_word + '/' + new_word + '/g';
			xargs = xargs.concat([replace_string]);
			return xargs;
		}

		// var grep = spawn('grep', make_grep_option(grep_option));
		// var xargs_sed = spawn('xargs', make_xargs_option(find_query, replace_query));
		var xargs_option = make_xargs_option(find_query, replace_query);
		grep_option = make_grep_option(grep_option);

		var owner_roots = [];
		

		//useonly(mode=goorm-oss)
		g_project.get_list(null, null, function(owner_project_data) {
			for (var i = 0; i < owner_project_data.length; i++) {
				owner_roots.push('/' + owner_project_data[i].name);
			}

			if (project_path === '/' && owner_roots.length !== 0) {
				var count = 0;
				var total_match = 0;
				var total_list = [];

				for (var i = 0; i < owner_roots.length; i++) {
					(function(index) {
						var __project_path = owner_roots[index];
						self.get_data_from_project({
							'find_query': find_query,
							'project_path': __project_path,
							'folder_path': folder_path,
							'grep_option': grep_option
						}, evt, function(res) {
							count++;
							
							if (res.total_match) {
								total_match += res.total_match;
							}
							if (res.data) {
								total_list.concat(res.data);
							}
							if (count === owner_roots.length) {
								res.total_match = total_match;
								if (total_match > 0) {
									res.error = false;
								} else {
									res.error = true;
								}
								if (total_list.length > 0) {
									res.data = total_list;
								}
								evt.emit('file_search_and_replace', res);
							}
						});
						F.auth_add_user();
					})(i);
				}
			} else if (owner_roots.indexOf(project_path) > -1) {
				self.get_data_from_project({
					'find_query': find_query,
					'project_path': project_path,
					'folder_path': folder_path,
					'grep_option': grep_option
				}, function(res) {
					evt.emit('file_search_and_replace', res);
				});
			} else {
				evt.emit('file_do_search_on_project', {
					error: true
				});
			}
		});
		
	},

	prevent_duplicate_slash: function(path) {
		var tmp = path;

		if (tmp && typeof(tmp) == 'string' && tmp.indexOf('//') > -1) {
			tmp = tmp.replace(/\/\//, '\/');
		}

		return tmp;
	},

	get_data_from_project: function(option, evt, callback) {
		var self = this;
		var find_query = option.find_query;
		var project_path = g_secure.command_filter(option.project_path);
		var folder_path = option.folder_path;
		var grep_option = option.grep_option;
		var uid = option.uid;
		var absolute_path = global.__workspace.slice(0, -1) + project_path + '/';
		var total_match = 0;

		if (folder_path) { // is optional
			folder_path = absolute_path + folder_path.split(', ').join(' ' + absolute_path); // paths are separated by ', '. And add absolute path in front of folder paths
			folder_path = g_secure.command_filter(folder_path).split(' '); // spawn get array commands
		} else {
			folder_path = absolute_path;
		}

		var get_matched_files_list = function(stdout) {
			var matched_files_list = [];

			if (stdout) {
				matched_files_list = stdout.split(/\n/);
				matched_files_list.pop();

				matched_files_list = matched_files_list.map(function(o) {
					return self.prevent_duplicate_slash(o);
				});
			}

			return matched_files_list;
		};

		var parser = function(data) {
			var nodes = {};
			var node = {};
			var i = 0;
			var match_count = 0;
			
			var temp = [];
			var saved_filename = '';
			var current_filename = '';
			var whole_line = '';
			var short_filename = '';

			var make_node = function(arr) {
				var code = [];
				var context = '';
				var line_num = 0;
				var start_line = 0;
				var match_line = [];
				if (arr[0] === '') {
					match_count++;
					total_match++;
					return {
						start_line: start_line,
						match_line: [],
						code: ['Binary file matches']
					};
				}
				start_line = parseInt(arr[0].match(/^\d+/)[0], 10);
				for (var i = 0; i < arr.length; i++) {
					context = arr[i].replace(/^\d+/, '');
					if (context.substr(0,1) === ':') {
						match_line.push(parseInt(arr[i].match(/^\d+/)[0], 10));
						match_count++;
						total_match++;
					}
					code.push(context.substr(1, context.length-1));
				}
				return {
					start_line: start_line,
					match_line: match_line,
					code: code
				};
			};

			if (data.length !== 0) {
				for (i = 0; i < data.length; i++) {
					// end of group
					if (data[i] === '--') {
						if (temp.length > 0) {
							node = make_node(temp);
							short_filename = saved_filename.replace(global.__workspace, '');
							if (!nodes[short_filename]) {
								nodes[short_filename] = [];
							}
							nodes[short_filename].push(node);
							temp = [];	
						}
						saved_filename = '';
					} else {
						whole_line = data[i].split(/\0/);
						// same group same file
						if (whole_line[0] === saved_filename) {
							whole_line.shift();
							temp.push(whole_line.join(/\0/));
						} else {
							if (temp.length > 0) {	// same group different file
								node = make_node(temp);
								short_filename = saved_filename.replace(global.__workspace, '');
								if (!nodes[short_filename]) {
									nodes[short_filename] = [];
								}
								nodes[short_filename].push(node);
								temp = [];

								saved_filename = whole_line.shift();
								temp.push(whole_line.join(/\0/));
							} else if (temp.length === 0) {	// start of group
								saved_filename = whole_line.shift();
								temp.push(whole_line.join(/\0/));
							}
						}
					}
				}
				// last group
				if (temp.length > 0) {
					node = make_node(temp);
					short_filename = saved_filename.replace(global.__workspace, '');
					if (!nodes[short_filename]) {
						nodes[short_filename] = [];
					}
					nodes[short_filename].push(node);
					temp = [];	
				}
				
			}
			return {
				nodes: nodes,
				match_count: match_count
			};
		};
		fs.exists(absolute_path, function(exists) {
			if (exists) {
				var option = {};
				var found = false;
				// jeongmin: exec is changed to spawn, because exec has small buffer.
				
				var command = spawn('grep', [find_query].concat(folder_path).concat(grep_option));
				var _stdout = '';

				command.stdout.on('data', function(data) {
					var res = {};
					var str = data.toString();
					var last_index = str.lastIndexOf('\n--\n');

					if (last_index > 0) {
						found = true;
						res.data = parser(get_matched_files_list(_stdout + str.substring(0, last_index)));
						_stdout = str.substring(last_index + 4, str.length);
					} else {
						found = true;
						res.data = parser(get_matched_files_list(_stdout + str));
					}
					evt.emit('file_searching', res);
				});
				command.stderr.on('data', function(data) {
					console.log('search.js', 'get_data_from_project', 'grep fail', Buffer(data).toString());
				});
				command.on('close', function(code) {
					var res = {};
					var matched_files_list = [];
					//seongho.cha : code === null mean process stoped by user.
					if (code === 0 || code === null) {
						res.error = 0;
						if (_stdout.length > 0) {
							res.data = parser(get_matched_files_list(_stdout));
						}
						res.total_match = total_match;
					} else if (code === 1) {	// not found
						res.error = 1;
						res.total_match = 0;
					} else {	// grep error
						res.error = 2;
						res.total_match = 0;
					}

					if (callback) {
						callback(res);
					} else {
						evt.emit('file_do_search_on_project', res);
					}
				});
			} else {
				callback({
					error: 'Incorrect path provided.',
					total_match : 0,
					data: []
				});
			}
		});
	},

	replace_on_project: function(options, callback) {
		var self = this;
		var find_query = options.find_query;
		var replace_query = options.replace_query
		var project_path = g_secure.command_filter(options.project_path);
		var folder_path = options.folder_path;
		var grep_option = options.grep_option;
		var xargs_option = options.xargs_option;
		var uid = options.uid;
		var absolute_path = global.__workspace.slice(0, -1) + project_path + '/';
		var total_match = 0;

		if (folder_path) { // is optional
			folder_path = absolute_path + folder_path.split(', ').join(' ' + absolute_path); // paths are separated by ', '. And add absolute path in front of folder paths
			folder_path = g_secure.command_filter(folder_path).split(' '); // spawn get array commands
		} else {
			folder_path = absolute_path;
		}

		var get_replaced_file_list = function(stdout) {
			var replaced_file_list = [];

			if (stdout) {
				replaced_file_list = stdout.split(/\0/);
				replaced_file_list.pop();

				replaced_file_list = replaced_file_list.map(function(o) {
					total_match++;
					return self.prevent_duplicate_slash(o.replace(global.__workspace, ''));
				});
			}

			return replaced_file_list;
		};

		fs.exists(absolute_path, function(exists) {
			if (exists) {
				var option = {};
				var found = false;
				// jeongmin: exec is changed to spawn, because exec has small buffer.
				

				var grep = spawn('grep', [find_query].concat(folder_path).concat(grep_option));
				var xargs_sed = spawn('xargs', xargs_option);
				var _stdout = '';

				grep.stdout.on('data', function(data) {
					_stdout += data.toString();
					xargs_sed.stdin.write(data);
				});

				grep.stderr.on('data', function(data) {
					console.log('[search.js] grep error: ' + data.toString());
				});

				grep.on('close', function(code) {
					if (code !== 0) {
						console.log('grep process exited with code ', code);
						if (callback) {
							callback({
								error: true,
								total_match: total_match
							});
						}
					}
					xargs_sed.stdin.end();
				});

				// xargs_sed.stdout.on('data', function(data) {
				// 	console.log('sed:', data.toString());
				// });

				xargs_sed.stderr.on('data', function(data) {
					console.log('[search.js] sed error:', data.toString());
				});

				xargs_sed.on('close', function(code) {
					if (code === 0) {
						var list = get_replaced_file_list(_stdout);
						callback({
							error: false,
							total_match: total_match,
							data: list
						});
					} else {
						callback({
							error: true,
							total_match: total_match
						});
					}
				});
			} else {
				callback({
					error: 'Incorrect path provided.',
					total_match: 0,
					data: []
				});
			}
		});
	}
};
