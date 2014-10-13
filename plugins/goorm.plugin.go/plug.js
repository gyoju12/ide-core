/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

 
goorm.plugin.go = {
	/*
		Properties
	 */
	name: "go",
	// mainmenu: null,
	debug_con: null,
	current_debug_project: null,
	terminal: null,
	preference: null,

	/*
		Methods
	 */
	init: function () {

		core.module.project.add({
			'type': 'go',
			'img': '/goorm.plugin.go/images/go.png',
			'items': [{
				'key': 'go_default_project',
				'detail_type' : 'default',
				'img': '/goorm.plugin.go/images/go_console.png'
			},
			{
				'key': 'go_fibonacci_sample',
				'detail_type' : 'fibonacci',
				'img': '/goorm.plugin.go/images/go_console.png'
			},
			{
				'key': 'go_prime_sleve_sample',
				'detail_type' : 'prime',
				'img': '/goorm.plugin.go/images/go_console.png'
			}]
		});
		// this.add_project_item();
		
		// this.mainmenu = core.module.layout.mainmenu;
		
		// //this.debugger = new goorm.core.debug();
		// //this.debug_message = new goorm.core.debug.message();
		
		// this.cErrorFilter = /[A-Za-z]* error: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.cWarningFilter = /[A-Za-z]* warning: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.lineFilter = /:[0-9]*:/;
		
		// this.add_mainmenu();
		
		// this.add_menu_action();
		
		//core.dictionary.loadDictionary("plugins/org.uizard.plugin.c/dictionary.json");
		
		this.preference = core.preference.plugins['goorm.plugin.go'];
	},
	/*
	add_project_item: function () {
		$("div[id='project_new']").find(".project_types").append("<a href='#' class='list-group-item project_wizard_first_button' project_type='go'><img src='/goorm.plugin.go/images/go.png' class='project_icon' /><h4 class='list-group-item-heading' class='project_type_title'>GO Project</h4><p class='list-group-item-text' class='project_type_description'>GO Project using GNU Compiler Collection</p></a>");

		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all go thumbnail' description='  Create new project for GO' project_type='go' plugin_name='goorm.plugin.go'><img src='/goorm.plugin.go/images/go_console.png' class='project_item_icon'><div class='caption'><p>GO default Project</p></div></a></div>");
		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all go thumbnail' description='  Create fobonacci project for GO' project_type='go' plugin_name='goorm.plugin.go'><img src='/goorm.plugin.go/images/go_console.png' class='project_item_icon'><div class='caption'><p>GO fibonacci sample</p></div></div>");
		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all go thumbnail' description='  Create concurrent prime sleve project' project_type='go' plugin_name='goorm.plugin.go'><img src='/goorm.plugin.go/images/go_console.png' class='project_item_icon'><div class='caption'><p>GO concurrent prime sleve sample</p></div></div>");

		$(".project_dialog_type").append("<option value='go'>GO Projects</option>").attr("selected", "");
	},
	
	add_mainmenu: function () {
		var self = this;
	
		$("li[id='plugin_new_project']").after("<li class='plugin_project'><a href=\"#\" action=\"new_file_go\">GO Project</a></li>");
		//this.mainmenu.render();
	},
	
	add_menu_action: function () {
		$("a[action=new_file_go]").unbind("click");
		$("a[action=new_file_go]").click(function () {
			core.dialog.new_project.show(function (){	//jeongmin: define callback
				$("#project_new").find(".dialog_left_inner").scrollTop($("#project_new").find(".dialog_left_inner").scrollTop() + $(".project_wizard_first_button[project_type=go]").position().top);	//jeongmin: the one who has to be scrolled is "the room" that have project_types and scroll position standard is always scrollTop()
			});

			$(".project_wizard_first_button[project_type=go]").trigger("click");
		});
	},
*/
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
				"plugin" : "goorm.plugin."+data.project_type,
				"data" : data
		};
		
		core.module.project.create( send_data, function(result){
			// 가끔씩 제대로 refresh가 안됨.
			// setTimeout(function(){
				var property = core.property.plugins['goorm.plugin.go'];

				var filepath = core.status.current_project_path + '/' + property['plugin.go.source_path'];
				var filename = property['plugin.go.main']+'.go';
				var filetype = 'go';

				core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});
				core.module.layout.project_explorer.refresh();
				// $(core).trigger("on_project_open");
				
			// }, 500);
		});
	},
	
	run: function(options) {
		var self=this;
		var property = options.property;
		var base_dir = core.preference.workspace_path + core.status.current_project_path + '/';

		var absolute_path = base_dir+property['plugin.go.source_path']+property['plugin.go.main']+'.go';

		var cmd1 = '\n\rclear;go run ' + absolute_path;
		core.module.project.run({'cmd': cmd1});

		core.module.layout.select('terminal'); // jeongmin: show terminal tab
	},
	
	debug: function (path) {
		/*
		var self = this;
		var property = core.property.plugins['goorm.plugin.go'];
		var table_variable = core.module.debug.table_variable;
		var debug_module = core.module.debug;
		this.terminal = core.module.layout.workspace.window_manager.open("/", "debug", "terminal", "Terminal").terminal;
		this.current_debug_project = path;
		this.prompt = /(\(gdb\)[\s\n]*)$/;
		this.terminal.debug_endstr = /exited normally/;
		
		// debug탭 초기화
		table_variable.initializeTable();
		table_variable.refreshView();
		
		this.breakpoints = [];
		
		// debug start!
		var send_data = {
				"plugin" : "goorm.plugin.go",
				"path" : path,
				"mode" : "init"
		};
		
		if(this.terminal.index != -1) {
			self.debug_cmd(send_data);
		}
		else {
			$(this.terminal).one("terminal_ready."+debug_module.debug_terminal.terminal_name, function(){
				self.debug_cmd(send_data);
			});
		}
		
		$(debug_module).off("value_changed");
		$(debug_module).on("value_changed",function(e, data){
			self.terminal.send_command("p "+data.variable+"="+data.value+"\r", self.prompt);
		});
		
		$(debug_module).off("debug_end");
		$(debug_module).on("debug_end",function(){
			table_variable.initializeTable();
			table_variable.refreshView();
			
			// clear highlight lines
			var windows = core.module.layout.workspace.window_manager.window;
			for (var i in windows) {
				var window = windows[i];
				if (window.project == self.current_debug_project) {
					window.editor && window.editor.clear_highlight();
				}
			}
			
			setTimeout(function(){
				self.debug_cmd({mode:'terminate'});
			}, 500);
		});
		*/
	},
	
	/*
	 * 디버깅 명령어 전송
	 */
	debug_cmd: function (cmd) {
		/*
		 * cmd = { mode, project_path }
		 */
		/*
		var self=this;
		var property = core.property.plugins['goorm.plugin.go'];
		var table_variable = core.module.debug.table_variable;
		
		var mainPath = property['plugin.go.main'];
		var buildPath = property['plugin.go.build_path'];
		
		if(this.terminal === null) {
			console.log("no connection!");
			return ;
		}
		
		switch (cmd.mode) {
		case 'init':
			self.terminal.flush_command_queue();
			self.terminal.send_command("gdb "+buildPath+mainPath+" --quiet\r", null);
			self.set_breakpoints();
			self.terminal.send_command("run\r", self.prompt, function(){
				self.debug_get_status();
			});
			break;
		case 'continue':
			self.set_breakpoints();
			self.terminal.send_command("continue\r", self.prompt, function(){
				self.debug_get_status();
			}); break;
		case 'terminate':
			self.terminal.flush_command_queue();
			self.terminal.send_command("quit\r", self.prompt);
			setTimeout(function(){
				self.terminal.send_command("y\r", /(Exit|Quit) anyway\?/);
				self.terminal.flush_command_queue();
			}, 500);
			table_variable.initializeTable();
			table_variable.refreshView();
			
			// clear highlight lines
			var windows = core.module.layout.workspace.window_manager.window;
			for (var i in windows) {
				var window = windows[i];
				if (window.project == self.current_debug_project) {
					window.editor && window.editor.clear_highlight();
				}
			}
			
			break;
		case 'step_over':
			self.set_breakpoints();
			self.terminal.send_command("next\r", self.prompt, function(){
				self.debug_get_status();
			}); break;
		case 'step_in':
			self.set_breakpoints();
			self.terminal.send_command("step\r", self.prompt, function(){
				self.debug_get_status();
			}); break;
		case 'step_out':
			self.set_breakpoints();
			self.terminal.send_command("finish\r", self.prompt, function(){
				self.debug_get_status();
			}); break;
		default : break;
		}
		*/
	},
	
	debug_get_status: function(){
		var self = this;
		this.terminal.send_command("where\r", this.prompt, function(terminal_data){
			self.set_currentline(terminal_data);
		});
		this.terminal.send_command("info locals\r", this.prompt, function(terminal_data){
			self.set_debug_variable(terminal_data);
		});
	},
	
	set_currentline: function(terminal_data){
		var self = this;
		var lines = terminal_data.split('\n');
		
		// clear highlight lines
		var windows = core.module.layout.workspace.window_manager.window;
		for (var i in windows) {
			var window = windows[i];
			if (window.project == self.current_debug_project) {
				window.editor && window.editor.clear_highlight();
			}
		}
		
		$.each(lines, function(i, line){
			if(line == '') return;
			// 현재 라인 처리
			var regex = /#0.*at ((.*)\/)?(.*):(\d+)/;
			if(regex.test(line)) {
				var match = line.match(regex);
				var filepath = match[2];
				var filename = match[3];
				var line_number = match[4];

				var windows = core.module.layout.workspace.window_manager.window;
				for (var j=0; j<windows.length; j++) {
					var window = windows[j];
					if (window.project == self.current_debug_project 
							&& window.filename == filename){
						if(filepath && window.filepath.search(self.current_debug_project+"/"+filepath+"/") > -1) {
							window.editor.highlight_line(line_number);
						}
						else if (!filepath) {
							window.editor.highlight_line(line_number);
						}
					}
				}
			}
		});
	},
	
	set_debug_variable: function(terminal_data){
		var lines = terminal_data.split('\n');
		var table_variable = core.module.debug.table_variable;
		
		table_variable.fnClearTable();
		$.each(lines, function(i, line){
			if(line == '') return;
			
			// local variable 추가
			var variable = line.split(' = ');
			if (variable.length == 2) {
				table_variable.addRow({
					"variable": variable[0].trim(),
					"value": variable[1].trim()
				});
			}
		});
	},
	
	set_breakpoints: function(){
		var self = this;
		var windows = core.module.layout.workspace.window_manager.window;
		for (var i in windows) {
			var window = windows[i];
			if (window.project == this.current_debug_project) {
				var filename = window.filename;
				
				if(!window.editor) continue;				
				var breakpoints = window.editor.breakpoints;
				if(breakpoints.length > 0){
					self.terminal.send_command('clear\r', self.prompt);
					
					for(var i=0; i < breakpoints.length; i++) {
						var breakpoint = breakpoints[i];
						breakpoint += 1;
						breakpoint = filename+":"+breakpoint;
						self.terminal.send_command("break "+breakpoint+"\r", self.prompt);
					}
				}
				else {
					// no breakpoints
				}
			}
		}
	},

	build: function (options, callback) {
		var property = options.property;
		var base_dir = core.preference.workspace_path + options.project_path + '/';

		var build_options = " "+property['plugin.go.build_option'];
		var build_path = " -o "+base_dir+property['plugin.go.build_path']+property['plugin.go.main'];
		
		var cmd = 'cd ' + base_dir + property['plugin.go.source_path'] + '; \n\rclear; go build' + build_path + build_options;
		
		core.module.project.build(cmd, null, function(){
			setTimeout(function(){
				core.module.toast.show(core.module.localization.msg['alert_plugin_check_terminal']);
				core.module.layout.project_explorer.refresh();
			}, 500);
		});
		
		core.module.layout.select('terminal'); // jeongmin: show terminal tab

		if(callback) callback();
	},
	
	clean: function(options){ 
		var property = options.property; // Kim Donguk : refactoring 
		var plugin = property.plugins['goorm.plugin.go'];
		var buildPath = plugin['plugin.go.build_path'];
		
		goorm.core.project.clean({
			path: options.workspace+options.project_path+"/"+buildPath,
			target: "*"
		}, function(){
			core.module.layout.project_explorer.refresh();
		});
	}
};
