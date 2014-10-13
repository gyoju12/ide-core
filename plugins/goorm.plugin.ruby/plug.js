/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


goorm.plugin.ruby = {
	/*
		Properties
	 */
	name: "ruby",
	// mainmenu: null,
	debug_con: null,
	// current_debug_project: null,
	// terminal: null,
	preference: null,

	/*
		Methods
	 */
	init: function () {

		core.module.project.add({
			'type': 'ruby',
			'img': '/goorm.plugin.ruby/images/ruby.png',
			'items': [{
				'key': 'ruby_project',
				'detail_type' : 'ruby',
				'img': '/goorm.plugin.ruby/images/ruby_console.png'
			}]
		});

		// this.add_project_item();
		
		// this.mainmenu = core.module.layout.mainmenu;
		
		// this.cErrorFilter = /[A-Za-z]* error: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.cWarningFilter = /[A-Za-z]* warning: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.lineFilter = /:[0-9]*:/;
		
		// this.add_mainmenu();
		
		// this.add_menu_action();
		
		this.preference = core.preference.plugins['goorm.plugin.ruby'];
	},
	
	/*
	add_project_item: function () {
		// Project New 왼쪽에 Project Type 버튼 추가
		$("div[id='project_new']").find(".project_types").append("<a href='#' class='list-group-item project_wizard_first_button' project_type='ruby'><img src='/goorm.plugin.ruby/images/ruby.png' class='project_icon' /><h4 class='list-group-item-heading' class='project_type_title'>Ruby Project</h4><p class='list-group-item-text' class='project_type_description'>Ruby Project</p></a>");

		// Project New 오른쪽에 새 Project Button 추가
		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all ruby thumbnail' description='  Create New Project for Ruby' project_type='ruby' plugin_name='goorm.plugin.ruby'><img src='/goorm.plugin.ruby/images/ruby_console.png' class='project_item_icon'><div class='caption'><p>Ruby Project</p></div></div>");

		// Project Open/Import/Export/Delete에 Project Type Option 추가
		$(".project_dialog_type").append("<option value='ruby'>Ruby Projects</option>").attr("selected", "");
		
	},

	add_mainmenu: function () {
		var self = this;
		
		// File - New.. Project Type 추가
		$("li[id='plugin_new_project']").after("<li class='plugin_project'><a href=\"#\" action=\"new_file_ruby\">Ruby Project</a></li>");
		//this.mainmenu.render();
	},
	
	add_menu_action: function () {
		
		// 위에서 추가한 mainmenu에 대한 action 추가
		$("a[action=new_file_ruby]").unbind("click");
		$("a[action=new_file_ruby]").click(function () {
			core.dialog.new_project.show(function (){	//jeongmin: define callback
				$("#project_new").find(".dialog_left_inner").scrollTop($("#project_new").find(".dialog_left_inner").scrollTop() + $(".project_wizard_first_button[project_type=ruby]").position().top);	//jeongmin: the one who has to be scrolled is "the room" that have project_types and scroll position standard is always scrollTop()
			});

			$(".project_wizard_first_button[project_type=ruby]").trigger("click");
		});
	},
	*/
	
	new_project: function(data) {

		var send_data = {
				"plugin" : "goorm.plugin.ruby",
				"data" : data
		};
		
		core.module.project.create( send_data, function(result){
			// 가끔씩 제대로 refresh가 안됨.
			// setTimeout(function(){
				var property = core.property.plugins['goorm.plugin.ruby'];

				var filepath = core.status.current_project_path + '/' + property['plugin.ruby.source_path'];
				var filename = property['plugin.ruby.main']+'.rb';
				var filetype = 'rb';

				core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});

				core.module.layout.project_explorer.refresh();
				// $(core).trigger("on_project_open");
			// }, 500);
		}); 
	},
	
	run: function(options, callback) {
		var self=this;
		var property = options.property;
		
		var classpath = property['plugin.ruby.source_path'];
		var classname = property['plugin.ruby.main']+'.rb';

		var workspace = core.preference.workspace_path;
		var absolute_path=workspace+core.status.current_project_path+"/"+classpath+classname;


		core.module.project.run({'cmd': "clear;ruby "+absolute_path }, function(){
			core.module.layout.select('terminal'); // jeongmin: show terminal tab
			callback();
		});

	},

	debug: function (options) {
		var self = this;
		var path = options.path;
		var property = options.property;
		// var table_variable = core.module.debug.table_variable;
		var debug_module = core.module.debug;
		// this.terminal = core.module.layout.workspace.window_manager.open("/", "debug", "terminal", "Terminal").terminal;
		debug_module.debug_terminal_open();

		// this.current_debug_project = path;
		// this.prompt = /\(Pdb\) $/;
		// debug_module.debug_terminal.debug_endstr = /The program finished/;
		debug_module.debug_setting({
			'prompt': /\(Pdb\) $/,
			'endstr': /The program finished/
		});
		
		// debug탭 초기화
		// table_variable.fnClearTable();
		debug_module.clear_table();

		this.breakpoints = [];
		
		// debug start!
		var send_data = {
				"plugin" : "goorm.plugin.ruby",
				"path" : path,
				"mode" : "init"
		};
		
		if(debug_module.debug_terminal.index != -1) {
			self.debug_cmd({
				property: property,
				cmd: send_data
			});
		}
		else {
			$(debug_module.debug_terminal).one("terminal_ready."+debug_module.debug_terminal.terminal_name, function(){
				self.debug_cmd({
					property: property,
					cmd: send_data
				});
			});
		}
		
		$(debug_module).off("value_changed");
		$(debug_module).on("value_changed",function(e, data){
			debug_module.debug_terminal.send_command("p "+data.variable+"="+data.value+"\r", debug_module.debug_prompt);
		});
		
		$(debug_module).off("debug_end");
		$(debug_module).on("debug_end",function(){
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
			
			setTimeout(function(){
				// self.debug_cmd({mode:'terminate'});
				core.module.debug.debug_terminate();
			}, 500);
		});
	},

	/*
	 * 디버깅 명령어 전송
	 */
	debug_cmd: function (options, callback) {
		/*
		 * cmd = { mode, project_path }
		 */
		var self=this;
		var cmd = options.cmd;
		var property = options.property;
		// var table_variable = core.module.debug.table_variable;
		
		var workspace = core.preference.workspace_path;
		var projectName = core.status.current_project_path+"/";
		var mainPath = property['plugin.ruby.main'];
		var source_path = property['plugin.ruby.source_path'];
		var debug_module = core.module.debug;
		var debug_terminal = debug_module.debug_terminal;
		
		if (debug_terminal) {
			switch (cmd.mode) {
			case 'init':
				debug_terminal.flush_command_queue();
				debug_terminal.send_command("ruby -m pdb "+workspace+projectName+source_path+mainPath+"\r");
				self.set_breakpoints();
				debug_terminal.send_command("run\r", debug_module.debug_prompt, function(){
					cmd.mode = 'continue';
					self.debug_cmd({
						property: property,
						cmd: cmd
					});
				});
				break;
			case 'continue':
				self.set_breakpoints();
				debug_terminal.send_command("continue\r", debug_module.debug_prompt, function(){
					self.debug_get_status();
				}); break;
			case 'terminate':
				debug_terminal.flush_command_queue();
				debug_terminal.send_command("quit\r", debug_module.debug_prompt);
				setTimeout(function(){
					debug_terminal.send_command("y\r", /(Exit|Quit) anyway\?/);
					debug_terminal.flush_command_queue();

					if (callback) 
						callback();
				}, 500);
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
				self.set_breakpoints();
				debug_terminal.send_command("next\r", debug_module.debug_prompt, function(){
					self.debug_get_status();
				}); break;
			case 'step_in':
				self.set_breakpoints();
				debug_terminal.send_command("step\r", debug_module.debug_prompt, function(){
					self.debug_get_status();
				}); break;
			case 'step_out':
				self.set_breakpoints();
				debug_terminal.send_command("jump\r", debug_module.debug_prompt, function(){
					self.debug_get_status();
				}); break;
			default : break;
			}
		}
		else {
			if (callback) callback();
		}
	},

	set_breakpoints: function(){
		var self = this;
		var windows = core.module.layout.workspace.window_manager.window;
		for (var i in windows) {
			var window = windows[i];
			if (window.project == debug_module.debug_current_project) {
				var filename = window.filename;
				
				if(!window.editor) continue;				
				var breakpoints = window.editor.breakpoints;
				// self.terminal.send_command('clear\r', self.prompt, function() {
				// 	self.terminal.send_command('y\r', self.prompt, function() {
						for(var i=0; i < breakpoints.length; i++) {
							var breakpoint = breakpoints[i];
							breakpoint += 1;
							breakpoint = filename+":"+breakpoint;
							core.module.debug.debug_terminal.send_command("b "+breakpoint+"\r", debug_module.debug_prompt);
						}
				// 	});
				// });
			}
		}
	},

	debug_get_status: function(){
		var self = this;
		var debug_module = core.module.debug;
		debug_module.debug_terminal.send_command("where\r", debug_module.debug_prompt, function(terminal_data){
			self.set_currentline(terminal_data);
		});

		// Timing Problem by nys
		//
		setTimeout(function(){
			debug_module.debug_terminal.send_command("p locals().keys()\r", debug_module.debug_prompt, function(local_terminal_data){
				self.set_debug_variable(local_terminal_data);
			});
		}, 500)
	},
	
	set_currentline: function(terminal_data){
		var self = this;
		var lines = terminal_data.split('\n');
		
		// clear highlight lines
		var windows = core.module.layout.workspace.window_manager.window;
		for (var i in windows) {
			var window = windows[i];
			if (window.project == debug_module.debug_current_project) {
				window.editor && window.editor.clear_highlight();
			}
		}

		$.each(lines, function(i, line){
			if(lines == '') return;
			// 현재 라인 처리
//			var regex = /.py\(\d+\)/;
			var regex = /> ((.*)\/)?(.*)(\(\d+)/

			if(regex.test(line)) {
				var filepath = line.replace(core.preference.workspace_path, "")
				var match = line.match(regex);
				var filepath = match[2];
				var filename = match[3];
				var line_number = match[4].substring(1);				
				if(line_number == '1') return;

				var windows = core.module.layout.workspace.window_manager.window;
								
				for (var j=0; j<windows.length; j++) {
					var window = windows[j];

					if (window.project == debug_module.debug_current_project 
							&& window.filename == filename){

						if(typeof(line_number) == "string") line_number = parseInt(line_number);

						if(filepath && filepath.search(window.filepath.substring(0, window.filepath.length-1)) > -1) {
							window.editor.highlight_line(line_number-1);
						}
						else if (!filepath) {
							window.editor.highlight_line(line_number-1);
						}
					}
				}
			}
		});
	},

	set_debug_variable: function(terminal_data){
		var self = this;
		var lines = terminal_data.split('\n');
		var debug_module = core.module.debug;

		lines.shift(); // remove 'p locals().keys()'
		lines.pop(); // remove '(Pdb) '

		var keys = JSON.parse(lines.join('\n').replace(/\'/g, '"'));

		var get_value = function(key, callback) {
			self.terminal.send_command('p '+key+'\r', debug_module.debug_prompt, function(data){
				if(data) {
					var line = data.split('\n');
					line.shift();
					line.pop();

					data = line.join('\n');
				}

				callback(data)
			});
		}

		var get_type = function(value) {
			if(/^'/.test(value)) {
				return 'String';
			}
			else if(/^</.test(value)) {
				return 'Module';
			}
			else {
				return 'Number';
			}
		}

		// core.module.debug.table_variable.fnClearTable();
		core.module.debug.clear_table();

		$.each(keys, function(i,o){
			if( !/^__/.test(o)) {
				get_value(o, function(value){
					var type = get_type(value);

					value = ((value.replace(/&/g, '&amp;')).replace(/\"/g, '&quot;')).replace(/\'/g, '&#39;'); 
					value = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');

					self.add_row(o, value, type);
				})
			}
		});
	},

	add_row: function (variable, value, summary) {
		core.module.debug.add_data_table(variable, value, summary);
		// if(variable && value && summary){
		// 	core.module.debug.table_variable.fnAddData([
		// 		variable,
		// 		value,
		// 		summary
		// 	]);
		// }
	}	
};
