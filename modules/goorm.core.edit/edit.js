/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var exec = require('child_process').exec;
// var EventEmitter = require("events").EventEmitter;
var fs = require('fs');
var spawn = require('child_process').spawn;

var g_secure = require('../goorm.core.secure/secure.js');

var java_libs = {};
var java_basic_class_arr = [];


module.exports = {

	
	
	
	
	// tag:
	// 	aaa     src/main.c      /^var inte aaa = ;$/;"  v       line:7
	//
	// options: data, type, (html needs filepath) 
	//
	tag_parser: function(options, callback) {

		var data = options.data;
		var type = options.type;

		if (type == 'c') {
			var response = {};
			var line = 0;
			if (data[4]) {
				line = parseInt(data[4].substring(5, data[4].length), 10);
			}

			switch (data[3]) {
				case 'v':
					response = {
						name: data[0],
						'use_detailed': false,
						filetype: 'c/cpp',
						type: "variable",
						line: line,
						query: data[2]
					};
					break;
				case 's':
					response = {
						name: data[0],
						'use_detailed': false,
						filetype: 'c/cpp',
						children: [],
						type: "struct",
						line: line,
						query: data[2]
					};
					break;
				case 'f':
					response = {
						name: data[0],
						'use_detailed': false,
						filetype: 'c/cpp',
						type: "function",
						line: line,
						query: data[2]
					};
					break;
				case 'm':
					if (data[5] && data[5].indexOf("struct") === 0) {
						//strcut property
						var struct_property_obj = {};
						struct_property_obj.parent = data[5].split(":")[1];
						struct_property_obj.name = data[0];
						struct_property_obj.use_detailed = false;
						struct_property_obj.filetype = 'c/cpp';
						struct_property_obj.type = "property";
						struct_property_obj.line = line;
						struct_property_obj.query = data[2];

						response = struct_property_obj;
					}
					break;
				default:
					break;
			}

			callback(response);
		} else if (type == 'cpp') {
			var response = {};
			var line = 0;
			if (data[4]) {
				line = parseInt(data[4].substring(5, data[4].length), 10);
			}

			switch (data[3]) {
				case 'v':
					response = {
						name: data[0],
						'use_detailed': false,
						type: "variable",
						filetype: 'c/cpp',
						line: line,
						query: data[2]
					};
					break;
				case 'c':
					response = {
						name: data[0],
						'use_detailed': false,
						children: [],
						type: "class",
						filetype: 'c/cpp',
						line: line,
						query: data[2]
					};
					break;
				case 's':
					response = {
						name: data[0],
						'use_detailed': false,
						children: [],
						type: "struct",
						query: data[2]
					};
					break;
				case 'f':
					if (data[5] === undefined) {
						//global function
						response = {
							name: data[0],
							'use_detailed': false,
							type: "function",
							filetype: 'c/cpp',
							line: line,
							query: data[2]
						};
					} else {
						//class method
						var class_method_obj = {};
						class_method_obj.parent = data[5].split(":")[1];
						class_method_obj.name = data[0];
						class_method_obj.use_detailed = false;
						class_method_obj.type = "method";
						class_method_obj.filetype = 'c/cpp';
						class_method_obj.line = line
						class_method_obj.query = data[2];

						response = class_method_obj;
					}
					break;
				case 'm':
					if (data[5].indexOf("class") === 0) {
						//class property
						var class_property_obj = {};
						class_property_obj.parent = data[5].split(":")[1];
						class_property_obj.name = data[0];
						class_property_obj.use_detailed = false;
						class_property_obj.parent_type = 'class'
						class_property_obj.type = "property";
						class_property_obj.filetype = 'c/cpp';
						class_property_obj.line = line
						class_property_obj.query = data[2];

						response = class_property_obj;

					} else if (data[5].indexOf("struct") === 0) {
						//strcut property
						var struct_property_obj = {};
						struct_property_obj.parent = data[5].split(":")[1];
						struct_property_obj.name = data[0];
						struct_property_obj.use_detailed = false;
						struct_property_obj.parent_type = "struct";
						struct_property_obj.type = "property";
						struct_property_obj.filetype = 'c/cpp';
						struct_property_obj.line = line;
						struct_property_obj.query = data[2];

						response = struct_property_obj;
					}
					break;
				default:
					break;
			}

			callback(response);
		} else if (type == 'java') {
			var response = {};
			var items = options.data;

			for (type_index = items.length - 1; type_index > 0; type_index--) {
				if (items[type_index].length == 1) {
					type = items[type_index];

					// function / local / method / class / package
					if (type == 'f' || type == 'l' || type == 'm' || type == 'c' || type == 'p') {
						break;
					}
				}
			}

			response.type = items[type_index];
			items[type_index + 2] && (response.class = items[type_index + 2]);
			response.name = items[0];
			response.filepath = items[1];
			items[type_index + 1] && (response.line = parseInt(items[type_index + 1].split('line:')[1]), 10);
			response.query = "";
			for (var i = 2; i < type_index; i++) {
				response.query += items[i];
				if (i != type_index - 1) response.query += '\t';
			}

			callback(response);
		} else if (type == 'py') {
			var response = {};
			var items = options.data;

			for (type_index = items.length - 1; type_index > 0; type_index--) {
				if (items[type_index].length == 1) {
					type = items[type_index];

					// function, def / variable / method / class
					if (type == 'f' || type == 'v' || type == 'm' || type == 'c') {
						break;
					}
				}
			}

			response.type = items[type_index];
			items[type_index + 2] && (response.class = items[type_index + 2]);
			response.name = items[0];
			response.filepath = items[1];
			items[type_index + 1] && (response.line = parseInt(items[type_index + 1].split('line:')[1]), 10);
			response.query = "";
			for (var i = 2; i < type_index; i++) {
				response.query += items[i];
				if (i != type_index - 1) response.query += '\t';
			}

			callback(response);
		} else {
			callback(false);
		}
	},

	/*
		{
			'java' : {
				[workspace_name1] : {
					[filepath1] : [
						{item}, {item}, ...
					]
				}	
			},

			'cpp' : {
		
			}

			...
		}
	*/
	save_tags_data: function(option, cb) {
		var self = this;
		var workspace = option.workspace;

		
		var base_dir = __workspace;
		

		

		if (!cb) cb = function() {};

		var __called_data = {};
		var absolute_workspace_path = base_dir + workspace;

		var create_tags = function(workspace, callback) {
			var ctags_command = "-R --exclude=*.html --exclude=*.js --fields=+n -f ./.tags";

			var ctags = spawn('ctags', ctags_command.split(' '), {
				'cwd': absolute_workspace_path,
				'env': process.env
			});

			ctags.stderr.on("data", function(data) {
				var buf = new Buffer(data);
				console.log("error:" + buf.toString());
			});

			ctags.on('close', function(code) {
				callback(true);
			});
		};

		var make_called_data = function(workspace, callback) {
			var ctags_command = './.tags';

			var init = function(workspace) {
				if (!__called_data[workspace]) {
					__called_data[workspace] = {};
				}
			};

			var process = function(stdout) {
				init(workspace);

				var tags = stdout.split('\n').filter(function(o) {
					if (o.indexOf('!_TAG') >= 0) return false;
					else return true;
				});

				for (var i = 0; i < tags.length; i++) {
					var items = tags[i].split('\t');

					if (items.length > 1) {
						var path = items[1];
						var filetype = path.split('.').pop();

						self.tag_parser({
							'data': items,
							'type': filetype
						}, function(data) {
							if (__called_data[workspace][path]) {
								__called_data[workspace][path].push(data);
							} else {
								__called_data[workspace][path] = [];
								__called_data[workspace][path].push(data);
							}
						});
					}
				}
			}

			var ctags = spawn('cat', ctags_command.split(' '), {
				'cwd': absolute_workspace_path,
				'env': process.env
			});

			ctags.stderr.on("data", function(data) {
				var buf = new Buffer(data);
				console.log("error:" + buf.toString());
			});

			ctags.stdout.on('data', function(data) {
				var buf = new Buffer(data);
				var ctags_data = buf.toString();

				process(ctags_data);
			});

			ctags.on('close', function(code) {
				var data_file_path = absolute_workspace_path + '/.tags_result';
				fs.writeFile(data_file_path, JSON.stringify(__called_data), function(err) {
					if (err) {
						console.log('Error : make_called_data [', data_file_path, ']');
						console.log(err);
					}
					cb(__called_data);
				});
			});

		};

		var start = function() {
			create_tags(workspace, function(status) {
				if (status) {
					setTimeout(function() {
						make_called_data(workspace);
					}, 100);
				} else {}
			});
		}

		fs.exists(absolute_workspace_path + '/.tags', function(exists) {
			if (exists) {
				fs.stat(absolute_workspace_path + '/.tags', function(err, data) {
					if (data.size < 20480) {
						start();
					} else {
						fs.exists(absolute_workspace_path + '/.tags_result', function(exists) {
							if (!exists) {
								make_called_data(workspace);
							}
						});
					}
				});
			} else {
				start();
			}
		});


	},

	// c, cpp, java, python ...
	//
	load_tags_data: function(option, callback) {
		var self = this;
		var response = {};
		var workspace = option.workspace;
		var path = option.path || "";

		
		var base_dir = __workspace;
		

				

		var absolute_workspace_path = base_dir + workspace;
		var ctags_command = './.tags_result';
		var ctags_result = "";

		var make_response = function() {
			if (ctags_result) {
				try { // jeongmin: try catching
					if (typeof ctags_result === "string") ctags_result = JSON.parse(ctags_result);
					if (ctags_result && ctags_result[workspace]) {
						var parsed_data = "";
						if (path) {
							parsed_data = ctags_result[workspace][path];
						} else {
							parsed_data = ctags_result[workspace];
						}

						if (parsed_data) {
							response.data = parsed_data;
							response.result = true;
							callback(response);
						} else {
							response.code = 1;
							response.result = false;
							callback(response);
						}
					} else {
						response.code = 0;
						response.result = false;
						callback(response);
					}
				} catch (e) {
					console.log('loading tags data error:', e);
				}
			} else {
				response.code = 0;
				response.result = false;
				callback(response);
			}
		};

		// if .tags_result exist, read file 
		// if not, create tag data and read it.
		fs.exists(absolute_workspace_path + '/.tags_result', function(exists) {
			if (!exists) {
				self.save_tags_data(option, function(tags_result) {
					ctags_result = tags_result;
					make_response();
				});
			} else {
				var ctags = spawn('cat', ctags_command.split(' '), {
					'cwd': absolute_workspace_path,
					'env': process.env
				});

				ctags.stderr.on("data", function(data) {
					var buf = new Buffer(data);
					console.log("error:" + buf.toString());
				});

				ctags.stdout.on('data', function(data) {
					var buf = new Buffer(data);
					var ctags_data = buf.toString();

					ctags_result += ctags_data;
				});

				ctags.on('close', function(code) {
					make_response();
				});
			}
		});
	},

	proposal_import: function(query) {
		//query form : "java.i" "java." "java"
		if (query === "" || query === null || query === undefined) return [];
		last_point_index = query.split(".").pop().length;
		last_query = query.split(".").pop();
		prefix_query = query.substring(0, query.length - last_point_index - 1);
		prefix_query_origin = prefix_query + "";

		prefix_query = prefix_query.replace(/\./g, "']['");
		prefix_query = "['" + prefix_query + "']";

		var list = {};
		list = eval('java_libs');
		for (var i = 0; i < prefix_query_origin.split('.').length; i++) {
			list = list[prefix_query_origin.split('.')[i]];
			if (!list) return [];
		}

		var res = [];
		for (var l in list) {
			var o = eval('java_libs' + prefix_query + "['" + l + "']");
			var res_entry = {};
			if (o.import_code !== undefined && o.import_code.indexOf(query) === 0) {
				var target = o.import_code;
				if (target.indexOf('$') != -1) continue;

				if (o.type.toString() == 'class') {
					//ex)java.awt.Queue
					res_entry.keyword = target;
					res_entry.type = 'class';
					res_entry.description = target + "   description";
				} else {
					//ex)java.io.*
					res_entry.keyword = target + ".*";
					res_entry.type = 'package';
					res_entry.description = target + "   description";
				}
				res.push(res_entry);
			}

		} //for end

		return res;
	},

	get_proposal_java: function(query, evt) {
		evt.emit("got_proposal_java", {});
	},

	get_auto_import_java: function(query, evt) {
		var self = this;

		var res_packet = {};
		res_packet.last_package_def_sentence = -1;
		var res = [];
		var err_java_file = query.err_java_file;
		var missing_symbol = query.missing_symbol;

		if (!missing_symbol || !java_basic_class_arr) {
			evt.emit("got_auto_import_java", res_packet);
			return false;
		}
		if (java_basic_class_arr.length === 0) self.parsing_pacakge_txt();

		if (java_basic_class_arr.length !== 0 && query.selected_file_path !== undefined && query.selected_file_path !== null) {

			query.selected_file_path = g_secure.command_filter(query.selected_file_path);

			exec("ctags -x " + global.__workspace + query.selected_file_path, function(err, stdout, stderr) {

				var last_package_def_sentence = 0 * 1;
				var first_class_def_sentence = 100000 * 1;

				exec_res = stdout.split('\n');
				for (var i = 0; i < exec_res.length; i++) {
					var target = exec_res[i].toString().split(' ');

					var tmp_len = target.length;
					for (var k = tmp_len - 1; k >= 0; k--) {
						if (target[k] === "") target.splice(k, 1);
					}

					if (target[1] == "package" && last_package_def_sentence < target[2] * 1) {
						last_package_def_sentence = target[2] * 1;
					}
					if (target[1] == "class" && first_class_def_sentence > target[2] * 1) {
						first_class_def_sentence = target[2] * 1;
					}

				}
				//get range where import statement will be 

				res_packet.last_package_def_sentence = last_package_def_sentence;
				res_packet.first_class_def_sentence = first_class_def_sentence;

				// ctags parsing end
				for (var i = 0; i < missing_symbol.length; i++) {

					for (var k = 0; k < java_basic_class_arr.length; k++) {

						if (java_basic_class_arr[k].indexOf("/" + missing_symbol[i] + ".class") >= 0) {

							var candidate = (java_basic_class_arr[k] + "");
							candidate = candidate.substring(0, candidate.length - 6);
							if (err_java_file[i].indexOf(query.selected_file_path) >= 0) {

								var res_o = {};
								res_o.content = "import " + candidate.replace(/\//g, '.') + ';';
								res_o.location = err_java_file[i];
								res.push(res_o);
							}
							//console.log('-\t',java_basic_class_arr[k]);
						}
					}

				}
				res_packet.import_statement = res;

				evt.emit("got_auto_import_java", res_packet);
				return false;

			});

		} else {
			evt.emit("got_auto_import_java", res_packet);
			return false;
		}

	},

};

//java lib ready
//only once executed when server is on
var get_ready_for_java = function(package_root_name, callback) {
	var each_lib_root = package_root_name;
	//java lib object read
	if (JSON.stringify(java_libs) == "{}") {
		fs.readFile('./plugins/goorm.plugin.java/java_basic_libs.json', 'utf-8', function(err, data) {
			if (err) return;
			try { // jeongmin: try catching
				java_libs = JSON.parse(data);
				if (JSON.stringify(java_libs) == "{}") console.log('no java_basic');
			} catch (e) {
				console.log('getting library ready for java error:', e);
			}
		});
	}

	//class path save
	if (JSON.stringify(java_basic_class_arr) == "[]") {

		fs.readFile('./plugins/goorm.plugin.java/java_basic_class_arr.json', 'utf-8', function(err, data) {
			if (err) return;
			try { // jeongmin: try catching
				java_basic_class_arr = JSON.parse(data);
			} catch (e) {
				console.log('getting class ready for java error:', e);
			}
		});
	}

};

//if java plugin included then right action happen else just return;
get_ready_for_java();