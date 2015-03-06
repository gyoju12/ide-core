/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

// language error checker (linter). Jeong-Min Im.
goorm.plugin.linter = {

	output_tab_list: [],

	init: function(plugin_name) {
		var self = this;
		// make output tab for lint
		self.output_tab_list.push(plugin_name);
	},

	lint: function(__window) {
		if (core.realtime_lint === false) return;

		var window_manager = core.module.layout.workspace.window_manager;
		var result = null;
		var project_type = core.status.current_project_type;

		if (window_manager.window.indexOf(__window) > -1 && __window.editor && __window.editor.editor.getValue() !== "") {
			switch (__window.editor.filetype) {
				case 'js':
					this.lint_codemirror(__window, "javascript");
					break;
				case 'css':
					this.lint_codemirror(__window, "css");
					break;
				case 'c':
				case 'cpp':
					this.lint_cpp(__window, project_type);
					break;
				case 'java':
					if (project_type === "java") {
						this.lint_build(__window, project_type);
					}
					break;
				case 'py':
					this.lint_python(__window);
					break;
				case 'rb':
					this.lint_ruby(__window);
					break;
				case 'php':
					this.lint_php(__window);
					break;
				default:
					return;
			}
			/*
						if (callback && typeof(callback) === "function") {
							callback(result);
						} 
						*/
		}
	},

	lint_codemirror: function(__window, type) {
		var self = this;
		var error_data, output_data;
		var error_manager = __window.editor.error_manager;
		var output_manager = core.module.layout.tab_manager.output_manager;

		// init error message in editor & output tab
		error_manager.clear();
		output_manager.clear();

		// add error message in editor & output tab
		var lint_result = CodeMirror.lint[type](__window.editor.editor.getValue());
		if (!lint_result) return;
		for (var i = 0; i < lint_result.length; i++) {

			//
			//	if you want to reduce warning lint message
			//	go to 'Codemirror addon jshint.js'
			//	and add option in 'itself' function.
			//

			error_data = {
				'line_number': (isNaN(lint_result[i].from.line)) ? 0 : lint_result[i].from.line,
				'error_message': lint_result[i].message,
				'error_syntax': '',
				'error_type': lint_result[i].severity
			};

			output_data = {
				'line': lint_result[i].from.line + 1,
				'content': lint_result[i].severity + ': ' + lint_result[i].message,
				'file': __window.title
			};

			error_manager.add_line(error_data);
			output_manager.push(output_data);
		}
		// show error message in editor & output tab
		error_manager.error_message_box.add('#' + __window.panel.attr('id'));
		error_manager.init_event();

	},

	// to provide linter function in C, C++, Java
	// after build in background terminal, parsing result.
	lint_build: function(__window, type) {
		// console.log("----");
		var self = this;


		var active_file_type = __window.filetype;

		var property = core.property.plugins["goorm.plugin." + type];
		var compiler_type = property["plugin." + type + ".compiler_type"];
		var build_options = " " + property["plugin." + type + ".build_option"];
		var project_path = core.preference.workspace_path + core.status.current_project_path + "/";
		var path = {
			'source_path': " " + project_path + property["plugin." + type + ".source_path"],
			'build_path': " " + project_path + property["plugin." + type + ".build_path"],
			'main': property["plugin." + type + ".main"]
		};
		var cmd = "";
		if (type === "cpp") {
			if (compiler_type === 'clang' || compiler_type === 'clang++') {
				build_options += ' -fno-color-diagnostics';
			}
			cmd = project_path + "/make " + compiler_type + path.source_path + path.build_path + path.main + build_options;
		} else if (type === "java") {
			path.main += ".class";
			cmd = project_path + "/make " + path.source_path + path.build_path + build_options;

		}
		core.module.project.background_build(cmd, function(result) {
			// console.log(result);
			if (result) {
				var build_success = (result.indexOf("Build Complete") > -1) ? true : false;
				var window_manager = core.module.layout.workspace.window_manager;
				var output_manager = core.module.layout.tab_manager.output_manager;

				window_manager.all_clear();
				output_manager.clear();

				if (!build_success) {

					self.lint_build_parse(result, type);
					core.module.layout.select('gLayoutOutput_' + type);
				}
			}
		});

	},

	lint_build_parse: function(result, type) {

		core.module.layout.project_explorer.refresh();

		// OUTPUT MANAGER & ERROR MANAGER
		//
		var om = core.module.layout.tab_manager.output_manager;
		var wm = core.module.layout.workspace.window_manager;

		var parsed_data = om.parse(result, type);
		var build_result = (result && result.indexOf('Build Complete') > -1) ? true : false;

		om.clear();
		wm.all_clear();

		var parsing = function(data) {
			var data_path = data.file || "";
			data_path = data_path.split('/');
			var filename = data_path.pop();
			var filepath = data_path.join('/');

			var w = wm.get_window(filepath, filename);
			var e = null;
			var e_m = null;

			var parsed_content = data.content.split('\r\n');
			var error_message = (parsed_content[0]) ? parsed_content[0].replace('error: ', '').replace('<', '\"').replace('>', '\"').trim() : "";
			var error_syntax = (parsed_content[1]) ? parsed_content[1].replace('<', '\"').replace('>', '\"') : ""; // jeongmin: replace <> -> might be recognized as html

			if (w) {
				e = w.editor;
				e_m = e.error_manager;

				var error_data = {
					'line_number': parseInt(data.line, 10) - 1,
					'error_syntax': error_syntax,
					'error_message': error_message.split('\r\n')[0],
					'error_type': data.type
				};

				e_m.add_line(error_data);
				if (i === 0) e_m.error_message_box.add(e.target);
				e_m.init_event();
			}

			data.content = error_message;
			om.push(data);
		};

		if (parsed_data && parsed_data.length > 0) {
			for (var i = 0; i < parsed_data.length; i++) {
				parsing(parsed_data[i]);
			}
		}

	},

	lint_cpp: function(__window, type) {
		var path = core.preference.workspace_path + __window.editor.filepath + __window.editor.filename;
		var self = this;
		
		var property = core.property.plugins["goorm.plugin." + type];
		var complier_type;
		if(property){
			complier_type = property["plugin." + type + ".compiler_type"] || 'gcc';

		}

		core.module.terminal.terminal.send_command("/usr/share/clang/scan-build/scan-build " + complier_type + " -c " + path + "\r", function(output) {
			var wm = core.module.layout.workspace.window_manager;
			var om = core.module.layout.tab_manager.output_manager;

			var editor = __window.editor;
			var error_manager = editor.error_manager;

			output = output.split("\n");
			output.pop();
			output.shift();
			output.shift();
			output = output.join("\n");

			var index = output.indexOf("scan-build");
			if (index > -1) {
				output = output.substring(0, index);
			}

			output = output.split(path);

			om.clear();
			wm.all_clear();

			var table = [];

			error_manager.error_message_box.add(editor.target);
			for (var i = 0; i < output.length; i++) {
				var line = output[i].split(":");
				if (isNaN(line[1])) {
					continue;
				}

				var error_data = {
					'line_number': parseInt(line[1], 10) - 1,
					'error_syntax': "",
					'error_message': line.slice(4).join(":").split("\r\n")[0],
					'error_type': line[3].trim()
				};

				error_manager.add_line(error_data);
				error_manager.init_event();

				table.push({
					line: error_data.line_number + 1,
					content: error_data.error_message.split("<br />").shift(),
					file: editor.filepath + editor.filename
				});
			}
			om.push(table);
			if (output.length >= 1) {
				core.module.layout.select('gLayoutOutput_cpp');
			}
		});
	},

	lint_python: function(__window, type) {
		var path = core.preference.workspace_path + __window.editor.filepath + __window.editor.filename;
		core.module.terminal.terminal.send_command("pyflakes " + path + "\r", function(output) {
			var wm = core.module.layout.workspace.window_manager;
			var om = core.module.layout.tab_manager.output_manager;

			var editor = __window.editor;
			var error_manager = editor.error_manager;

			om.clear();
			wm.all_clear();

			output = output.split("\n");
			output.pop();
			output.shift();

			output = output.join("\n").split(path);
			output.shift();

			for (var i = 0; i < output.length; i++) {
				var line = output[i].split(":");

				var error_data = {
					'line_number': parseInt(line[1], 10) - 1,
					'error_syntax': "",
					'error_message': isNaN(parseInt(line[2], 10)) ? line[2].replace(/\n/g, "<br/>").replace(/ /g, "&nbsp;") : line[3].replace(/\n/g, "<br/>").replace(/ /g, "&nbsp;")
				};

				error_manager.add_line(error_data);
				if (i === 0) error_manager.error_message_box.add(editor.target);
				error_manager.init_event();
				om.push({
					line: error_data.line_number + 1,
					content: error_data.error_message.split("<br />").shift(),
					file: editor.filepath + editor.filename
				});
			}
		});
	},

	lint_ruby: function(__window, type) {

		var om = core.module.layout.tab_manager.output_manager;
		var wm = core.module.layout.workspace.window_manager;

		// var parsed_data = om.parse(result, type);

		var path = core.preference.workspace_path + __window.editor.filepath + __window.editor.filename;
		core.module.terminal.terminal.send_command("ruby-lint " + path + "\r", function(output) {

			om.clear();
			wm.all_clear();

			output = output.split("\n");
			output.pop();
			output.shift();
			for (var i = 0; i < output.length; i++) {
				// parsing(output[i], i);
				var line = output[i].split(":");
				var type = line[1].trim();

				e = __window.editor;
				e_m = e.error_manager;
				line[line.length - 1] = line[line.length - 1].slice(1, line[line.length - 1].length - 1);

				var error_data = {
					'line_number': parseInt(line[2].split(",")[0].replace("line ", ""), 10) - 1,
					'error_syntax': '',
					'error_message': line[line.length - 1],
					'error_type': type
				};

				e_m.add_line(error_data);
				if (i === 0) e.error_manager.error_message_box.add(e.target);
				e_m.init_event();


				// data.content = line[line.length - 1];
				om.push({
					'file': __window.editor.filepath + __window.editor.filename,
					'line': parseInt(line[2].split(",")[0].replace("line ", ""), 10),
					'content': line[line.length - 1]
				});

			}
			if (output.length >= 1) {
				core.module.layout.select('gLayoutOutput_ruby');
			}
		});
	},

	lint_php: function(__window, type) {

		var om = core.module.layout.tab_manager.output_manager;
		var wm = core.module.layout.workspace.window_manager;

		// var parsed_data = om.parse(result, type);

		var path = core.preference.workspace_path + __window.editor.filepath + __window.editor.filename;
		core.module.terminal.terminal.send_command("phpcs --report=json " + path + "\r", function(output) {

			om.clear();
			wm.all_clear();

			var result = JSON.parse(output.split("\n")[1].replace("<bg$>", ""));
			var message = result.files[path].messages;

			for (var i = 0; i < message.length; i++) {
				var line = message[i].line;

				e = __window.editor;
				e_m = e.error_manager;

				var error_data = {
					'line_number': line - 1,
					'error_syntax': '',
					'error_message': message[i].message,
					'error_type': message[i].type
				};

				e_m.add_line(error_data);
				if (i === 0) e.error_manager.error_message_box.add(e.target);
				e_m.init_event();

				om.push({
					'file': __window.editor.filepath + __window.editor.filename,
					'line': line,
					'content': message[i].message
				});

			}
			if (message.length >= 1) {
				core.module.layout.select('gLayoutOutput_php');
			}
		});
	}
};