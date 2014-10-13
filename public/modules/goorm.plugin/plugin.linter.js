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
	init: function(plugin_name) {
		var self = this;

		// make output tab for lint
		$(core).on('on_project_open', function() {
			core.module.layout.tab_manager.make_output_tab(plugin_name);
		});
	},

	lint: function (__window, callback) {
		var window_manager = core.module.layout.workspace.window_manager;
		var result = null;
		if (window_manager.window.indexOf(__window) > -1 && __window.editor && __window.editor.editor.getValue() !== "") {
			switch (__window.editor.mode) {
				case 'text/javascript':
					result = CodeMirror.lint.javascript(__window.editor.editor.getValue());
					break;
				case 'text/css':
					result = CodeMirror.lint.css(__window.editor.editor.getValue());
					break;
				default:
					return;
			}

			if (callback && typeof(callback) === "function") {
				callback(result);
			} else {
				this.lint_parse(__window, result);
			}
		}
	},

	lint_parse: function (__window, lint_result) {
		var self = this;
		var error_data, output_data;
		var error_manager = __window.editor.error_manager;
		// var output_manager = core.module.layout.tab_manager.output_manager;
		
		// init error message in editor & output tab
		error_manager.clear();
		// output_manager.clear();

		// add error message in editor & output tab
		if (!lint_result) return;
		for (var i = 0; i < lint_result.length; i++) {

			//
			//	if you want to reduce warning lint message
			//	go to 'Codemirror addon jshint.js'
			//	and add option in 'itself' function.
			//

			error_data = {
				'line_number': lint_result[i].from.line,
				'error_message': lint_result[i].message,
				'error_syntax': lint_result[i].severity
			};

			// output_data = {
			// 	'line': lint_result[i].from.line + 1,
			// 	'content': lint_result[i].severity + ':' + lint_result[i].message,
			// 	'file': __window.title
			// };

			error_manager.add_line(error_data);
			// output_manager.push(output_data);
		}
		// show error message in editor & output tab
		error_manager.error_message_box.add('#' + __window.panel.attr('id'));
		error_manager.init_event();

	},

	// to provide linter function in C, C++, Java
	// after build in background terminal, parsing result.
	__lint: function (__window) {
		var self = this;
		if (__window.project === core.status.current_project_path) {
			var project_type = core.status.current_project_type;
			if (project_type === "cpp" || project_type === "c_examples" || project_type === "java" || project_type === "java_examples") {
				var property = core.property.plugins["goorm.plugin." + project_type];
				var compiler_type = property["plugin." + project_type + ".compiler_type"];
				var build_options = " " + property["plugin." + project_type + ".build_option"];
				var project_path = core.preference.workspace_path + core.status.current_project_path + "/";
				var path = {
					'source_path': " " + project_path + property["plugin." + project_type + ".source_path"],
					'build_path': " " + project_path + property["plugin." + project_type + ".build_path"],
					'main': property["plugin." + project_type + ".main"]
				};
				var cmd = "";
				if (project_type === "cpp" || project_type === "c_examples") {
					if(compiler_type === 'clang' || compiler_type === 'clang++') {
						build_options += ' -fno-color-diagnostics';
					}
					cmd = project_path + "/make " + compiler_type + path.source_path + path.build_path + path.main + build_options;
				} else if (project_type === "java" || "java_examples") {
					path.main += ".class";
					cmd = project_path + "/make " + path.source_path + path.build_path + build_options;
				}
				core.module.project.background_build(cmd, function (result) {
					if (result) {
						var build_success = (result.indexOf("Build Complete") > -1) ? true : false;
						var window_manager = core.module.layout.workspace.window_manager;
						var output_manager = core.module.layout.tab_manager.output_manager;

						window_manager.all_clear();
						output_manager.clear();
						
						if (!build_success) {

							self.__lint_parse(result, project_type);
							core.module.layout.select('gLayoutOutput_' + project_type);
						}
					}
				});
			}
		}
	
	},

	__lint_parse: function (result, type) {

		core.module.layout.project_explorer.refresh();

		// OUTPUT MANAGER & ERROR MANAGER
		//
		var om = core.module.layout.tab_manager.output_manager;
		var wm = core.module.layout.workspace.window_manager;

		var parsed_data = om.parse(result, type);
		var build_result = (result && result.indexOf('Build Complete') > -1) ? true : false;

		om.clear();
		wm.all_clear();

		var parsing = function (data) {
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
					'error_message': error_message.split('\r\n')[0]
				}

				e_m.add_line(error_data);
				if (i == 0) e_m.error_message_box.add(e.target);
				e_m.init_event();
			}  
			
			data.content = error_message;
			om.push(data);
		}

		if (parsed_data && parsed_data.length > 0) {
			for (var i = 0; i < parsed_data.length; i++) {
				parsing(parsed_data[i]);
			}
		}
	}
};