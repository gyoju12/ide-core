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
		var find_query = query.find_query;
		var project_path = query.project_path;
		var folder_path = query.folder_path;
		var grep_option = query.grep_option || {};

		var nodes = {};

		var make_grep_option = function(options) {
			var grep = ["-r", "-n", "-R"];
			var is_true = function(str) {
				var r = false;
				if (str && (str === true || str === 'true')) r = true;

				return r;
			}

			if (is_true(options.use_regexp)) {
				grep.push("-E");
			}

			if (!is_true(options.match_case))
				grep.push("-i");

			grep = grep.concat(['--exclude=.*', '--exclude={bin,file.list}', '--exclude=goorm.manifest', '--exclude-dir=.*']); // jeongmin: in spawn, exclude item should be separated

			return grep;
		}

		var parser = function(matched_files_list) {
			var nodes = {};
			if (matched_files_list.length != 0) {
				var idx = 0;
				var node = {};
				nodes.total_match = 0;
				for (idx = 0; idx < matched_files_list.length; idx++) {
					if (matched_files_list[idx].split(":").length > 1) {
						node = {};
						node.filename = matched_files_list[idx].split(":")[0].match(/[^/]*$/)[0];
						node.filetype = matched_files_list[idx].replace(/(\/[a-zA-Z0-9_-]+)+\/?/, "").split(":")[0].split('.').pop(); // jeongmin: type is the last string after .
						node.filepath = matched_files_list[idx].split(":")[0].replace(global.__workspace, "").substring(0, matched_files_list[idx].split(":")[0].replace(global.__workspace, "").lastIndexOf("/") + 1);
						node.matched_line = 0;
						node.children = [];
						node.badge = 0;

						nodes[node.filepath + node.filename] = node;
					}
				}

				for (idx = 0; idx < matched_files_list.length; idx++) {
					if (matched_files_list[idx].split(":").length > 1) {
						node = {};
						node.filename = matched_files_list[idx].split(":")[0].match(/[^/]*$/)[0];
						node.filetype = matched_files_list[idx].replace(/(\/[a-zA-Z0-9_-]+)+\/?./, "").split(":")[0].split('.').pop(); // jeongmin: type is the last string after .
						node.filepath = matched_files_list[idx].split(":")[0].replace(global.__workspace, "").substring(0, matched_files_list[idx].split(":")[0].replace(global.__workspace, "").lastIndexOf("/") + 1);
						node.matched_line = matched_files_list[idx].split(":")[1];
						node.parent = node.filepath + node.filename;
						if (nodes[node.filepath + node.filename]) {
							nodes[node.filepath + node.filename].badge++;
							nodes.total_match++;
							if (nodes[node.filepath + node.filename].matched_line === 0) {
								nodes[node.filepath + node.filename].matched_line = node.matched_line;
							}
						}
						// node.html = "<span style=\"color: #666; font-weight:bold;\">Line: " + node.matched_line + "</span> - <span style=\"color: #808080\">" + matched_files_list[idx].split(":")[2] + "</span>";

						nodes[node.filepath + node.filename + ":" + node.matched_line] = node;
					}
				}

				//nodes.total_match = matched_files_list.length; // jeongmin
			}

			return nodes;
		};

		// make grep option
		//
		grep_option = make_grep_option(grep_option);


		var owner_roots = [];
				

		
		g_project.get_list(null, null, function(owner_project_data) {
			for (var i = 0; i < owner_project_data.length; i++) {
				owner_roots.push('/' + owner_project_data[i].name);
			}

			if (project_path === "" && owner_roots.length != 0) {
				var all_matched_files_list = [];
				var count = 0;

				for (var i = 0; i < owner_roots.length; i++) {
					(function(index) {
						var __project_path = owner_roots[index];
						self.get_data_from_project({
							'find_query': find_query,
							'project_path': __project_path,
							'folder_path': folder_path,
							'grep_option': grep_option
						}, function(res) {
							count++;
							var matched_files_list = res.data;

							all_matched_files_list = all_matched_files_list.concat(matched_files_list);

							if (count === owner_roots.length) {
								nodes = parser(all_matched_files_list);
								res.data = nodes;
								evt.emit('file_do_search_on_project', res);
							}
						});
						F.auth_add_user()
					})(i);
				}
			} else if (owner_roots.indexOf(project_path) > -1) {
				self.get_data_from_project({
					'find_query': find_query,
					'project_path': project_path,
					'folder_path': folder_path,
					'grep_option': grep_option
				}, function(res) {
					var matched_files_list = res.data;
					nodes = parser(matched_files_list);
					res.data = nodes;
					evt.emit('file_do_search_on_project', res);
				});
			} else {
				evt.emit('file_do_search_on_project', nodes);
			}
		})
		
	},

	prevent_duplicate_slash: function(path) {
		var tmp = path;

		if (tmp && typeof(tmp) == 'string' && tmp.indexOf('//') > -1) {
			tmp = tmp.replace(/\/\//, '\/');
		}

		return tmp;
	},

	get_data_from_project: function(option, callback) {
		var self = this;

		var find_query = option.find_query;
		var project_path = option.project_path;
		var folder_path = option.folder_path;
		var grep_option = option.grep_option;

		// find_query = g_secure.command_filter(find_query);
		project_path = g_secure.command_filter(project_path);

		if (folder_path) { // is optional
			folder_path = g_secure.command_filter(folder_path);
		}

		// grep_option = g_secure.command_filter(grep_option);

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
		}

		fs.exists(global.__workspace.slice(0, -1) + project_path, function(exists) {
			if (exists) {
				// jeongmin: exec is changed to spawn, because exec has small buffer.
				var command = spawn('grep', [find_query, global.__workspace.slice(0, -1) + project_path + '/' + folder_path].concat(grep_option)),
					_stdout = '',
					_stderr = '';

				command.stdout.on('data', function(data) {
					_stdout += data;
				});
				command.stderr.on('data', function(data) {
					_stderr += data;
				});
				command.on('close', function(code) {
					var res = {};
					var matched_files_list = [];

					if (code === 0) {
						matched_files_list = get_matched_files_list(_stdout);

						res.error = false;
						res.data = matched_files_list;

						callback(res);
					} else {
						matched_files_list = get_matched_files_list(_stdout);

						if (matched_files_list && matched_files_list.length > 0) {
							res.error = "Max buffer exceeded.";
						} else {
							res.error = "Cannot find a word";
						}

						res.data = matched_files_list;

						callback(res);
					}
				});
				// var command = exec("grep " + find_query + " " + global.__workspace.slice(0, -1) + project_path + '/' + folder_path + grep_option, {
				// 	maxBuffer: 1024 * 1024,
				// 	killSignal: 'SIGTERM'
				// }, function(error, stdout, stderr) {
				// 	var res = {};
				// 	var matched_files_list = [];

				// 	if (error === null) {
				// 		matched_files_list = get_matched_files_list(stdout);

				// 		res.error = false;
				// 		res.data = matched_files_list;

				// 		callback(res);
				// 	} else {
				// 		matched_files_list = get_matched_files_list(stdout);

				// 		if (matched_files_list && matched_files_list.length > 0) {
				// 			res.error = "Max buffer exceeded.";
				// 		}
				// 		else {
				// 			res.error = "Cannot find a word";
				// 		}

				// 		res.data = matched_files_list;

				// 		callback(res);
				// 	}
				// });
			} else {
				callback({
					error: "Incorrect path provided.",
					data: []
				});
			}
		});
	}
};