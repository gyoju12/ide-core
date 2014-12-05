/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


goorm.plugin.java = {
	/* 
		Properties
	 */
	name: "java",
	dialogs: {},
	// mainmenu: null,
	// current_debug_project: null,
	// terminal: null,
	breakpoints: null,
	preference: null,
	error_message_save: [],
	error_marker: [],
	output_tab: null,

	/*
		Methods
	 */
	init: function() {
		var self = this;
		
		core.module.project.add({
			'type': 'java',
			'img': '/goorm.plugin.java/images/java.png',
			'items': [{
				'key': 'java_console_project',
				'detail_type' : 'java_console',
				'img': '/goorm.plugin.java/images/java_console.png'
			}]
		});

		this.add_template_menu();

		// this.add_project_item();
		// this.mainmenu = core.module.layout.mainmenu;

		// //this.debugger = new org.uizard.core.debug();
		// //this.debug_message = new org.uizard.core.debug.message();
		// // this.cErrorFilter = /[A-Za-z]* error: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		this.packageFilter = /[ '",:\\\/\+\-\*\#\@]/g;
		// // this.cWarningFilter = /[A-Za-z]* warning: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// // this.lineFilter = /:[0-9]*:/;

		// this.add_mainmenu();
		// this.add_menu_action();

		this.linter = core.module.plugin_linter;
		this.linter.init(self.name);

		this.init_dialog();
		this.preference = core.preference.plugins['goorm.plugin.java'];
	},

	/*
	add_project_item: function() {
		$("div[id='project_new']").find(".project_types").append("<a href='#' class='list-group-item project_wizard_first_button' project_type='javap'><img src='/goorm.plugin.java/images/java.png' class='project_icon' /><h4 class='list-group-item-heading' class='project_type_title'>Java Project</h4><p class='list-group-item-text' class='project_type_description'>Java Project using SUN Java Compiler Collection</p></a>");

		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all javap thumbnail' description='  Create New Project for Java' project_type='java' plugin_name='goorm.plugin.java'><img src='/goorm.plugin.java/images/java_console.png' class='project_item_icon'><div class='caption'><p>Java Console Project</p></div></div>");

		$(".project_dialog_type").append("<option value='java'>Java Projects</option>").attr("selected", "");
	},

	add_mainmenu: function() {
		var self = this;

		$("li[id='plugin_new_project']").after("<li class='plugin_project'><a href=\"#\" action=\"new_file_java\">Java Project</a></li>");
	},*/

	add_template_menu: function() {
		var self = this;

		var show_template_menu = function() {
			$("#new_java_interface_context").show();
			$("#new_java_class_context").show();
			$("#new_java_package_context").show();
			$('.folder_open_context_div li.java_plugin.divider').show();
		}

		var hide_template_menu = function() {
			if ($("#new_java_interface_context")) $("#new_java_interface_context").hide();
			if ($("#new_java_class_context")) $("#new_java_class_context").hide();
			if ($("#new_java_package_context")) $("#new_java_package_context").hide();
			$('.folder_open_context_div li.java_plugin.divider').hide();
		}

		var init_template_menu = function() {
			var package_name = (core.module.localization) ? core.module.localization.plugin.java.dictionary_package : "Package";
			var class_name = (core.module.localization) ? core.module.localization.plugin.java.dictionary_class : "Class";
			var interface_name = (core.module.localization) ? core.module.localization.plugin.java.dictionary_interface : "Interface";

			if ($(".folder_open_context_div .java_plugin.divider").length == 0) {
				$(".folder_open_context_div").append("<li class='java_plugin divider'></li>")
			}
			if ($("#new_java_package_context").length == 0) {
				$(".folder_open_context_div").append("<li ><a  href='#' id='new_java_package_context' action='new_java_package_action' localization_key='dictionary_package'>" + package_name + "</a></li>");
			}
			if ($("#new_java_class_context").length == 0) {
				$(".folder_open_context_div").append("<li ><a  href='#' id='new_java_class_context' action='new_java_class_action' localization_key='dictionary_class'>" + class_name + "</a></li>");
			}
			if ($("#new_java_interface_context").length == 0) {
				$(".folder_open_context_div").append("<li ><a  href='#' id='new_java_interface_context' action='new_java_interface_action' localization_key='dictionary_interface'>" + interface_name + "</a></li>");
			}
		}

		var bind_action_to_template_menu = function() {

			var formatting = function(string) {
				var str = string;

				if(string[0] = "/") {
					str = string.substring(1, string.length);
				}
				if(string[string.length - 1] = "/") {
					str = string.substring(0, string.length - 1);
				}

				return str + "";
			}

			$("a[action=new_java_package_action]").off("mousedown");
			$("a[action=new_java_package_action]").mousedown(function() {
				var filepath = core.status.selected_file;
				var project_name = core.status.current_project_path;

				if ((filepath + '/').indexOf(project_name + '/' + core.property.plugins["goorm.plugin.java"]["plugin.java.source_path"]) >= 0) {
					//var source_path = $('#project_treeview .jstree-clicked').parent().attr('path');
					$("#java_package_name").val("");
					$("#java_package_source_folder").val(project_name + '/' + core.property.plugins["goorm.plugin.java"]["plugin.java.source_path"]);
					$("#java_package_source_folder").attr("disabled", "disabled");
					self.package_panel.modal('show');
				} else {
					alert.show(core.module.localization.plugin.java.alert_cannot_template_folder);
				}
			});

			$("a[action=new_java_class_action]").off("mousedown");
			$("a[action=new_java_class_action]").mousedown(function() { 
				var filepath = core.status.selected_file;
				var project_name = core.status.current_project_path;
				var package_name = formatting(project_name + '/' + core.property.plugins["goorm.plugin.java"]["plugin.java.source_path"]);

				if ((filepath + '/').indexOf(package_name) >= 0) {
					//var source_path = $('#project_treeview .jstree-clicked').parent().attr('path');
					$("#java_class_name").val("");
					$("#java_class_package").val(filepath.substring(package_name.length).replace(/\//g, "."));
					$("#java_class_package").attr("disabled", "disabled");
					$("#java_class_source_folder").val(project_name  + '/' + core.property.plugins["goorm.plugin.java"]["plugin.java.source_path"]);
					$("#java_class_source_folder").attr("disabled", "disabled");

					self.class_panel.modal('show');
				} else {
					alert.show(core.module.localization.plugin.java.alert_cannot_template_folder);
				}
			});

			$("a[action=new_java_interface_action]").off("mousedown");
			$("a[action=new_java_interface_action]").mousedown(function() {
				var filepath = core.status.selected_file;
				var project_name = core.status.current_project_path;
				var package_name = formatting(project_name + '/' + core.property.plugins["goorm.plugin.java"]["plugin.java.source_path"]);

				if ((filepath + '/').indexOf(package_name) >= 0) {
					//var source_path = $('#project_treeview .jstree-clicked').parent().attr('path');
					$("#java_interface_name").val("");
					$("#java_interface_package").val(filepath.substring(package_name.length).replace(/\//g, "."));
					$("#java_interface_package").attr("disabled", "disabled");
					$("#java_interface_source_folder").val(filepath);
					$("#java_interface_source_folder").attr("disabled", "disabled");

					self.interface_panel.modal('show');
				} else {
					alert.show(core.module.localization.plugin.java.alert_cannot_template_folder);
				}
			});
			// $('a[action=new_java_package_action], a[action=new_java_class_action], a[action=new_java_interface_action]').off('hover');
			// $('a[action=new_java_package_action], a[action=new_java_class_action], a[action=new_java_interface_action]').hover(function(){
			// 	$('#folder_open_context_ul').find('.yuimenuitemlabel-selected').removeClass('yuimenuitemlabel-selected').parent().removeClass('yuimenuitem-selected');

			// 	$(this).addClass('yuimenuitemlabel-selected');
			// 	$(this).parent().addClass('yuimenuitem-selected');
			// }, function(){
			// 	$('#folder_open_context_ul').find('.yuimenuitemlabel-selected').removeClass('yuimenuitemlabel-selected').parent().removeClass('yuimenuitem-selected');
			// });

			// $('a[action=new_java_package_action], a[action=new_java_class_action], a[action=new_java_interface_action]').off('blur');

		}

		//$("a[action=new_context]").off("hover");
		$("a[action=new_context]").hover(function() {

			var filename = (core.status.selected_file.split("/")).pop();
			var filetype = null;
			if (filename.indexOf(".") != -1)
				filetype = (filename.split(".")).pop();

			if (!filetype) {
				if (/^java$/.test(core.property.type)) {

					show_template_menu();
					init_template_menu();
					bind_action_to_template_menu();

				} else {
					hide_template_menu();
				}
			}
		});

		// $("a[action=new_file_java]").off("click");
		// $("a[action=new_file_java]").click(function() {
		// 	core.dialog.new_project.show(function() { //jeongmin: define callback
		// 		$("#project_new").find(".dialog_left_inner").scrollTop($("#project_new").find(".dialog_left_inner").scrollTop() + $(".project_wizard_first_button[project_type=javap]").position().top); //jeongmin: the one who has to be scrolled is "the room" that have project_types and scroll position standard is always scrollTop()
		// 	});

		// 	$(".project_wizard_first_button[project_type=javap]").trigger("click");
		// });
	},

	new_project: function(data) {
		/* data = 
		   { 
			project_type,
			project_detailed_type,
			project_author,
			project_name,
			project_desc,
			use_collaboration
		   }
		*/
		var send_data = {
			"plugin": "goorm.plugin.java",
			"data": data
		};

		core.module.project.create( send_data, function(result) {
			// 가끔씩 제대로 refresh가 안됨.
			// setTimeout(function() {

				var property = core.property.plugins['goorm.plugin.java'];

				var main_file_path = "";
				main_file_path += core.status.current_project_path + '/' + property['plugin.java.source_path'];
				main_file_path += property['plugin.java.main'] + '.java';


				var filename = (main_file_path.split("/")).pop();
				var filepath = main_file_path.replace(filename, "");
				var filetype = 'java';

				core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});

				core.module.layout.project_explorer.refresh();
				// $(core).trigger("on_project_open");

				//core.dialog.build_configuration.set_building_after_save_option(true);
			// }, 500);
		});
	},

	run: function(options, callback) {

		var self = this;
		var property = options.property; 

		var workspace = core.preference.workspace_path;
		var projectName = core.status.current_project_path + "/";
		var classpath = property['plugin.java.build_path'];
		var classname = property['plugin.java.main'];
		var cmd1 = "java -cp " + workspace + projectName + classpath + " " + classname;

		

		core.module.project.run({'cmd': 'clear;'+cmd1}, function(result) {
			// var reg = /(.*)\w/g;
			// var message = result.replace(cmd1, "").match(reg);
			// message.pop();
			// //console.log(result,message);
			// if(/NoClassDefFoundError/g.test(message)) {
			// 	// 실행 실패
			// 	alert.show("클래스 파일이 존재하지않거나 경로가 옳바르지 않습니다.<br>프로젝트를 빌드 하시거나 경로설정을 확인하시기 바랍니다.");
			// }
			// else {
			// 	// 아무 메시지도 안떴으면 성공.
			// 	//notice.show("성공적으로 실행되었습니다.");
			// 	goorm.core.utility.toast.show(
			// 		core.module.localization.plugin.java['alert_plugin_run_success']
			// 		,1000
			// 		,function(){
			// 			goorm.core.layout.terminal.focus();
			// 		}
			// 	);

			// }

			core.module.layout.select('terminal'); // jeongmin: show terminal tab
			core.module.toast.show(core.module.localization.plugin.java['alert_plugin_check_terminal']);
			callback();
		});
	},

	debug: function(options) {
		var self = this;
		var path = options.path;
		var property = options.property;
		// var table_variable = core.module.debug.table_variable;
		var debug_module = core.module.debug;
		// this.terminal = core.module.layout.workspace.window_manager.open("/", "debug", "terminal", "Terminal").terminal;
		debug_module.debug_terminal_open();

		// this.current_debug_project = path;
		// this.prompt = /(main\[[\d]\][\s\n]*)$/;
		// debug_module.debug_terminal.debug_endstr = /application exited/;
		debug_module.debug_setting({
			'prompt':  /(main\[[\d]\][\s\n]*)$/,
			'endstr': /application exited/
		});

		// debug탭 초기화
		// table_variable.fnClearTable();
		debug_module.clear_table();

		this.breakpoints = [];

		// debug start!
		$("#debug_tab table tbody").css("outline", "none")
		var send_data = {
			"plugin": "goorm.plugin.java",
			"path": path,
			"mode": "init"
		};

		if (debug_module.debug_terminal.index != -1) {
			self.debug_cmd({
				property: property,
				cmd: send_data
			});
		} else {
			$(debug_module.debug_terminal).one("terminal_ready."+debug_module.debug_terminal.terminal_name, function() {
				self.debug_cmd({
					property: property,
					cmd: send_data
				});
			});
		}

		$(debug_module).off("value_changed");
		// $(debug_module).on("value_changed",function(e, data){
		// 	self.terminal.send_command("set "+data.variable+"="+data.value+"\r", self.prompt);
		// });

		// off is not working - deleted -- heeje
		//$(debug_module).off("debug_end");
		$(debug_module).one("debug_end", function() {
			// table_variable.fnClearTable();
			debug_module.clear_table();

			// clear highlight lines
			var windows = core.module.layout.workspace.window_manager.window;
			for (var i in windows) {
				var window = windows[i];
				if (window.project == debug_module.debug_current_project) {
					window.editor && window.editor.clear_highlight();
				}
			}

			core.module.debug.debug_terminate();
		});
	},

	/*
	 * 디버깅 명령어 전송
	 */
	debug_cmd: function(options, callback) {
		/*
		 * cmd = { mode, project_path }
		 */

		var self = this;
		var cmd = options.cmd;
		var property = options.property;
		// var table_variable = core.module.debug.table_variable;

		var workspace = core.preference.workspace_path;
		var projectName = core.status.current_project_path + "/";
		var mainPath = property['plugin.java.main'];
		var buildPath = property['plugin.java.build_path'];
		var debug_module = core.module.debug;
		var debug_terminal = debug_module.debug_terminal;

		//flush command before run actually (does not typing flush without typing) --heeje
		if (debug_terminal) {
			switch (cmd.mode) {
				case 'init':
					debug_terminal.flush_command_queue();
					debug_terminal.send_command("jdb -classpath " + workspace + projectName + buildPath + " " + mainPath + "\r");
					self.set_breakpoints();
					debug_terminal.send_command("run\r", />/, function() {
						debug_terminal.flush_command_queue();
						self.debug_get_status();
					});
					break;
				case 'continue':
					debug_terminal.flush_command_queue();
					self.set_breakpoints();
					debug_terminal.send_command("cont\r", debug_module.debug_prompt, function() {
						self.debug_get_status();
					});
					break;
				case 'terminate':
					debug_terminal.flush_command_queue();
					debug_terminal.send_command("exit\r", debug_module.debug_prompt);

					if (callback)
						callback();

					// table_variable.fnClearTable();
					core.module.debug.clear_table();

					// clear highlight lines
					var windows = core.module.layout.workspace.window_manager.window;
					for (var i in windows) {
						var window = windows[i];
						if (window.project == debug_module.debug_current_project) {
							window.editor && window.editor.clear_highlight();
						}
					}
					break;
				case 'step_over':
					debug_terminal.flush_command_queue();
					self.set_breakpoints();
					debug_terminal.send_command("next\r", debug_module.debug_prompt, function() {
						self.debug_get_status();
					});
					break;
				case 'step_in':
					debug_terminal.flush_command_queue();
					self.set_breakpoints();
					debug_terminal.send_command("step\r", debug_module.debug_prompt, function() {
						self.debug_get_status();
					});
					break;
				case 'step_out':
					debug_terminal.flush_command_queue();
					self.set_breakpoints();
					debug_terminal.send_command("step up\r", debug_module.debug_prompt, function() {
						self.debug_get_status();
					});
					break;
				default:
					break;
			}
		} else {
			if (callback) callback();
		}
	},

	debug_get_status: function() {
		var self = this;
		var debug_module = core.module.debug;
		debug_module.debug_terminal.flush_command_queue();
		debug_module.debug_terminal.send_command("where\r", debug_module.debug_prompt, function(terminal_data) {
			self.set_currentline(terminal_data);
		});

		// Timing Problem
		//
		setTimeout(function() {
			debug_module.debug_terminal.flush_command_queue();
			debug_module.debug_terminal.send_command("locals\r", debug_module.debug_prompt, function(local_terminal_data) {
				self.set_debug_variable(local_terminal_data);
			});
		}, 500)
	},

	set_currentline: function(terminal_data) {
		var self = this;
		var lines = terminal_data.split('\n');

		// clear highlight lines
		var windows = core.module.layout.workspace.window_manager.window;
		var debug_module = core.module.debug;
		for (var i in windows) {
			var window = windows[i];
			if (window.project == debug_module.debug_current_project) {
				window.editor && window.editor.clear_highlight();
			}
		}

		$.each(lines, function(i, line) {
			if (line == '') return;
			// 현재 라인 처리
			var regex = /\[1\].*\((.*):([\d]+)\)/;
			if (regex.test(line)) {
				var match = line.match(regex);
				var filename = match[1];
				var line_number = match[2];

				var windows = core.module.layout.workspace.window_manager.window;
				for (var j = 0; j < windows.length; j++) {
					var window = windows[j];
					if (window.project == debug_module.debug_current_project && window.filename == filename) {

						if (typeof(line_number) == "string") line_number = parseInt(line_number);

						window.editor.highlight_line(line_number - 1);
					}
				}
			}
		});
	},
	set_debug_variable: function(terminal_data) {
		var self = this;
		var lines = terminal_data.split('\n');
		var debug_module = core.module.debug;
		// var table_variable = debug_module.table_variable;
		var group = 0;

		// table_variable.fnClearTable();
		debug_module.clear_table();

		$.each(lines, function(i, line) {
			if (line == '') return;

			// local variable 추가
			var len;
			var variable = line.split(' = ');
			var summary = line.split('.');

			if (summary.length != 1) {
				summary = summary[summary.length - 1];
				if (summary) {
					summary = summary.slice(0, summary.indexOf('('));
				}

			} else {

				if (/instance of/.test(summary[0])) {
					summary = summary[0].slice(15, summary[0].length);
					summary = summary.slice(0, summary.indexOf('('));
				} else {
					summary = " ";
				}
			}

			if (variable.length == 2) {
				if (summary != " ") {
					self.add_row(
						variable[0].trim(),
						variable[1].trim(),
						" "
					);
					// self.add_row(
					// 	"<img class='debug_plus' src='/images/goorm.core.layout/small_plus.jpg'></img>"+"<div class='expand_row' num = '1' type='"+summary+"' group='"+group+"' show='"+false+"'>"+ variable[0].trim()+"</div>",
					// 	variable[1].trim(),
					// 	summary
					// );

					// group++;
				} else {
					self.add_row(
						variable[0].trim(),
						variable[1].trim(),
						summary
					);
				}

			}
		});


	},

	add_row: function(variable, value, summary) {
		core.module.debug.add_data_table(variable, value, summary);
		// if (variable && value && summary) {
		// 	core.module.debug.table_variable.fnAddData([
		// 		variable,
		// 		value,
		// 		summary
		// 	]);

		// }
	},

	add_subrow: function(index, line, group, self_this, expandable, i) {
		// var table_variable = core.module.debug.table_variable;
		// if(expandable){
		// 	table_variable.addRow({
		// 		//file_button_last.gif
		// 		"variable" : "<img class='debug_plus' style='margin-left:"+(10*$(self_this).attr('num'))+"px !important;' src='/images/goorm.core.layout/small_plus.jpg'></img><div group='"+group+"' class='expand_row' parent_type='"+line.type+"' num = '"+(parseInt($(self_this).attr('num'))+1)+"' style='margin-left:"+(10*$(self_this).attr('num')+20)+"px !important;' show='"+false+"' parent='"+$(self_this).text()+"'>"+line.variable+"</div>",
		// 		"value" : line.data,
		// 		"summary" : line.type
		// 	}, index+parseInt(i)+1);
		// }else{
		// 	table_variable.addRow({
		// 		"variable" : "<img class='debug_plus' style='margin-left:"+(10*$(self_this).attr('num'))+"px !important;' src='/images/goorm.core.layout/file_button_last.gif'></img><div group='"+group+"' type='"+line.type+"' num = '"+(parseInt($(self_this).attr('num'))+1)+"' style='margin-left:"+(10*$(self_this).attr('num')+20)+"px !important;'>"+line.variable+"</div>",
		// 		"value" : line.data,
		// 		"summary" : line.type
		// 	}, index+parseInt(i)+1);
		// }
	},

	set_breakpoints: function() {
		var self = this;
		var property = core.property.plugins['goorm.plugin.java'];
		var windows = core.module.layout.workspace.window_manager.window;
		var debug_module = core.module.debug;
		var remains = [];
		var breakpoints = [];
		for (var i = 0; i < windows.length; i++) {
			var window = windows[i];

			if (window.project == debug_module.debug_current_project) {
				var filename = window.filename;
				var filepath = window.filepath;
				if (window.editor === null) continue;

				for (var j = 0; j < window.editor.breakpoints.length; j++) {
					var breakpoint = window.editor.breakpoints[j];
					breakpoint += 1;
					var classname = filename.split('.java')[0];
					var __package = filepath.split(property['plugin.java.source_path']).pop();
					__package = __package.replace("/", ".");

					breakpoint = __package + classname + ":" + breakpoint;
					breakpoints.push(breakpoint);
				}
			}
		}

		for (var j = 0; j < self.breakpoints.length; j++) {
			remains.push(self.breakpoints[j]);
		}

		if (breakpoints.length > 0) {
			for (var j = 0; j < breakpoints.length; j++) {
				var breakpoint = breakpoints[j];
				var result = remains.inArray(breakpoint);
				if (result == -1) {
					core.module.debug.debug_terminal.send_command("stop at " + breakpoint + "\r", />|(main\[[\d]\][\s\n]*)$/);
					self.breakpoints.push(breakpoint);
				} else {
					remains.remove(result);
				}
			}
		} else {
			// no breakpoints
		}

		for (var j = 0; j < remains.length; j++) {
			var result = self.breakpoints.inArray(remains[j]);
			if (result != -1) {
				self.breakpoints.remove(result);
				core.module.debug.debug_terminal.send_command("clear " + remains[j] + "\r", />|(main\[[\d]\][\s\n]*)$/);
			}
		}

	},

	//build: function(project_path, callback, is_auto_build) {
	build: function(options, callback) {
		var self = this;

		var property = options.property;
		var base_dir = core.preference.workspace_path + options.project_path + '/';

		var build_options = " " + property['plugin.java.build_option'];
		var path = {
			'source': ' ' + base_dir + property['plugin.java.source_path'],
			'build': ' ' + base_dir + property['plugin.java.build_path'],
			'main': property['plugin.java.main']  + '.class'
		};

		var clear = function (callback) {
			var clear_cmd = '';
			clear_cmd += 'if [ ! -d ' + path.build + ' ];';
			clear_cmd += 'then mkdir -p ' + path.build + ';';
			clear_cmd += 'fi;clear;\n';

			core.module.layout.terminal.send_command('\n', function(){ 
				core.module.layout.terminal.flush_command_queue();
				core.module.layout.terminal.send_command(clear_cmd, function(){
					core.module.layout.terminal.flush_command_queue();
					callback();
				});
			});
		}
 
		clear(function () {
			var cmd = base_dir + "make" + path.source + path.build + build_options;

			core.module.project.build('cd ~;'+cmd+';cd -', function(result) {
				core.module.layout.project_explorer.refresh();

				// PARSING & AUTO IMPORT - ONLY FOR JAVA
				self.organize_import(result);

				// OUTPUT MANAGER & ERROR MANAGER
				//
				var om = core.module.layout.tab_manager.output_manager;
				var wm = core.module.layout.workspace.window_manager;

				var parsed_data = om.parse(result, "java");
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

				if (build_result) {
					core.module.toast.show(core.module.localization.msg['alert_plugin_check_terminal']);
					core.module.layout.select('terminal'); // jeongmin: show terminal tab

					if (callback) callback(build_result);				
				} else {
					core.module.toast.show(core.module.localization.msg['alert_plugin_build_failed']);

					core.module.layout.select('gLayoutOutput_java');

					if (callback) callback(build_result);
				}
			});
		});
	},

	clean: function(options) {
		var property = options.property; // Kim Donguk : refactoring 
		var plugin = property.plugins['goorm.plugin.java'];
		var buildPath = plugin['plugin.java.build_path'];

		goorm.core.project.clean({
			path: options.workspace+options.project_path+"/"+buildPath,
			target: "*"
		}, function(){
			core.module.layout.project_explorer.refresh();
		});
	},

	make_class: function() {
		var self = this;
		var workspace = core.preference.workspace_path;
		var property = core.property;
		var filepath = core.status.selected_file;
		var project_name = core.status.current_project_path;
		var select = $("#dlg_plugin_java_class :input:radio[name=java_class_modifier]:checked").attr("value");
		var select_check = ($("#dlg_plugin_java_class :input:checkbox[name=java_class_option]").is(':checked')) ? ['constructor'] : [];;

		if (!$("#java_class_name").val() || $("#java_class_name").val() == "") {
			alert.show(core.module.localization.plugin.java.alert_type_is_empty);
			return;
		}
		if (self.packageFilter.test($("#java_class_package").val())) {
			alert.show(core.module.localization.plugin.java.alert_check_package_name);
			return;
		}

		var senddata = {
			'filepath': filepath,
			'project_name': project_name,
			'source_folder': $("#java_class_source_folder").val(),
			'methods': select_check,
			'workspace': workspace,
			'package': $("#java_class_package").val(),
			'name': $("#java_class_name").val(),
			'modifier': select,
			'type': 'class',
			'plugin': 'goorm.plugin.java'
		};

		_$.get("plugin/make_template", senddata, function(data) {
			if (data.code == 204) {

				self.class_panel.modal('hide');
				alert.show(core.module.localization.plugin.java.alert_same_file_at_created_package);
				return;
			} else if (data.code == 202) {

				self.class_panel.modal('hide');
				alert.show(core.module.localization.plugin.java.alert_same_file_at_created_class);
				return;
			} else if (data.code == 203) {
				self.class_panel.modal('hide');
				alert.show(core.module.localization.plugin.java.alert_check_package);
				return;

			}

			self.class_panel.modal('hide');
			core.module.layout.project_explorer.refresh();
		});
	},

	make_package: function() {
		var self = this;
		var workspace = core.preference.workspace_path;
		var property = core.property;
		var filepath = core.status.selected_file;
		var project_name = core.status.current_project_path;
		if (!$("#java_package_name").val() || $("#java_package_name").val() == "") {
			alert.show(core.module.localization.plugin.java.alert_type_is_empty);
			return;
		}
		if (self.packageFilter.test($("#java_package_name").val())) {
			alert.show(core.module.localization.plugin.java.alert_check_package_name);
			return;
		}
		var senddata = {
			'filepath': filepath,
			'project_name': project_name,
			'source_folder': $("#java_package_source_folder").val(),
			'workspace': workspace,
			'name': $("#java_package_name").val(),
			'type': 'package',
			'plugin': 'goorm.plugin.java'
		};

		_$.get("plugin/make_template", senddata, function(data) {
			if (data.code == 201) {

				self.package_panel.modal('hide');
				alert.show(core.module.localization.plugin.java.alert_same_file_at_created_package);
				return;
			}



			self.package_panel.modal('hide');
			core.module.layout.project_explorer.refresh();
		});
	},

	make_interface: function() {
		var self = this;
		var workspace = core.preference.workspace_path;
		var property = core.property;
		var filepath = core.status.selected_file;
		var project_name = core.status.current_project_path;
		var select = $("#dlg_plugin_java_interface :input:radio[name=java_interface_modifier]:checked").attr("value");
		if (!$("#java_interface_name").val() || $("#java_interface_name").val() == "") {
			alert.show(core.module.localization.plugin.java.alert_type_is_empty);
			return;
		}
		if (self.packageFilter.test($("#java_interface_package").val())) {
			alert.show(core.module.localization.plugin.java.alert_check_package_name);
			return;
		}
		var senddata = {
			'filepath': filepath,
			'project_name': project_name,
			'source_folder': $("#java_interface_source_folder").val(),
			'workspace': workspace,
			'package': $("#java_interface_package").val(),
			'name': $("#java_interface_name").val(),
			'modifier': select,
			'type': 'interface',
			'plugin': 'goorm.plugin.java'
		};
		_$.get("plugin/make_template", senddata, function(data) {
			if (data.code == 204) {

				self.interface_panel.modal('hide');
				alert.show(core.module.localization.plugin.java.alert_same_file_at_created_package);
				return;
			} else if (data.code == 202) {

				self.interface_panel.modal('hide');
				alert.show(core.module.localization.plugin.java.alert_same_file_at_created_interface);
				return;
			} else if (data.code == 203) {
				self.interface_panel.modal('hide');
				alert.show(core.module.localization.plugin.java.alert_check_package)
				return;

			}

			self.interface_panel.modal('hide');
			core.module.layout.project_explorer.refresh();
		});
	},

	init_dialog: function() {
		var self = this;

		this.package_panel = $('#dlg_plugin_java_package');
		this.interface_panel = $('#dlg_plugin_java_interface');
		this.class_panel = $('#dlg_plugin_java_class');

		var handle_ok_package = function(panel) {
			self.make_package();

			self.package_panel.modal('hide');
		};
		var handle_ok_interface = function(panel) {
			self.make_interface();

			self.interface_panel.modal('hide');
		};
		var handle_ok_class = function(panel) {
			self.make_class();

			self.class_panel.modal('hide');
		};

		var dialog_class = new goorm.core.dialog();
		dialog_class.init({
			id: 'dlg_plugin_java_class',
			handle_ok: handle_ok_class,
			success: null
		});
		self.dialogs["class"] = dialog_class;

		var dialog_package = new goorm.core.dialog();
		dialog_package.init({
			id: 'dlg_plugin_java_package',
			handle_ok: handle_ok_package,
			success: null
		});
		self.dialogs["package"] = dialog_package;

		var dialog_interface = new goorm.core.dialog();
		dialog_interface.init({
			id: 'dlg_plugin_java_interface',
			handle_ok: handle_ok_interface,
			success: null
		});
		self.dialogs["interface"] = dialog_interface;
	},

	//auto import
	organize_import: function(raw_data) {
		var self = this;

		var result_split = [];
		var err_java_file = [];
		var missing_symbol = [];

		if (raw_data.indexOf(': error: ') > -1) {
			result_split = raw_data.split(': error: ');
		} else {
			result_split = raw_data.split(': ');
		}

		//build result parsing start
		for (var i = 0; i < result_split.length; i++) {
			if (/cannot find symbol/g.test(result_split[i])) {
				//determine err java file
				if (((result_split[i - 1] + "").split('\n').pop()).indexOf(core.module.layout.workspace.window_manager.active_filename) == -1) {
					//not in current editor
					continue;
				}
				err_java_file.push((result_split[i - 1] + "").split('\n').pop());

				//determine missing symbol
				var missing_err = (result_split[i] + "").split("\n");
				for (var k = 0; k < missing_err.length; k++) {
					if (missing_err[k].indexOf('symbol:') != -1) {
						missing_symbol.push(missing_err[k].split(' ').pop().split('\r')[0]);
						break;
					}
				}

			}

		}
		//parsing end 

		// console.log(err_java_file);
		// console.log(missing_symbol);

		//core.status.err_java_file=err_java_file;
		//core.status.missing_symbol=missing_symbol;

		core.status.missing_symbol = [];
		core.status.err_java_file = [];

		for (var i = 0; i < missing_symbol.length; i++) {
			var pre = false;
			for (var k = 0; k < core.status.missing_symbol.length; k++) {
				if (missing_symbol[i] == core.status.missing_symbol[k]) {
					pre = true;
					break;
				}
			}
			if (!pre) {
				core.status.missing_symbol.push(missing_symbol[i] + "");
				core.status.err_java_file.push(err_java_file[i] + "");
			}
		}


		//query to server
	},
};
