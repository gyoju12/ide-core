/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE 
 * version: 2.0.0
 **/
 
 
goorm.plugin.cpp = {
	/*
		Properties
	 */
	name: "cpp",
	compiler: ["g++", "gcc", "i586-mingw32-gcc", "clang"],
	debug_con: null,
	// current_debug_project: null,
	terminal: null,
	preference: null,

	/*
		Methods
	 */
	init: function () {
		var self = this;

		core.module.project.add({
			'key': 'cpp_project',
			'type': 'cpp',
			'img': '/goorm.plugin.cpp/images/cpp.png',
			'items': [{
				'key': 'c_console_project',
				'detail_type' : 'c',
				'img': '/goorm.plugin.cpp/images/cpp_console.png'
			},
			{
				'key': 'cpp_console_project',
				'detail_type' : 'cpp',
				'img': '/goorm.plugin.cpp/images/cpp_console.png'
			}]
		});
		
		// this.add_project_item();
		// This is not used. 
		//
		// this.cErrorFilter = /[A-Za-z]* error: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.cWarningFilter = /[A-Za-z]* warning: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.lineFilter = /:[0-9]*:/;
		
		// this.add_mainmenu();
		// this.add_menu_action();
		
		this.linter = core.module.plugin_linter;
		this.linter.init(self.name);
		
		this.preference = core.preference.plugins['goorm.plugin.cpp'];
		// $(core).on("set_default_compile_type", function(){
		// 	self.compiler_list_up($("#preference_cpp_tab").find("select[name='plugin.cpp.compiler_type']"));
		// 	self.compiler_list_up($("#project_cpp_tab").find("select[name='plugin.cpp.compiler_type']"));
		// });
	},
	
	new_project: function(data) {
		
		
		var send_data = {
			"plugin" : "goorm.plugin.cpp",
			"data" : data
		};

		if (core.env.os == 'darwin') data.plugins["goorm.plugin.cpp"]["plugin.cpp.compiler_type"] = "clang++";
		else data.plugins["goorm.plugin.cpp"]["plugin.cpp.compiler_type"] = "g++";

		core.module.project.create(send_data, function(result){
			
			// update goorm.manifest file
			core.dialog.project_property.load_property(core.status.current_project_path, function(res){
				// setTimeout(function(){
					var property = core.property.plugins['goorm.plugin.cpp'];

					var filepath = core.status.current_project_path + '/' + property['plugin.cpp.source_path'];
					var filename = property['plugin.cpp.main']+'.'+data.project_detailed_type;
					var filetype = data.project_detailed_type;

					core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});
					core.module.layout.project_explorer.refresh();
					// $(core).trigger("on_project_open");
				// }, 500);
				
				
			});
		});
	},

	run: function(options, callback) {
		var self = this;
		var property = options.property;
		
		var classpath = property['plugin.cpp.build_path'];
		var classname = property['plugin.cpp.main'];

		var workspace = core.preference.workspace_path;

		var absolute_path=workspace+core.status.current_project_path+"/"+classpath+classname;

		

		var is_run_success = true;
		if(property['plugin.cpp.compiler_type'] === "i586-mingw32-gcc") {
			$("#download_frame").css('display','none');
			$("#download_frame").attr('src', "download/exe_file/?file=" + absolute_path + ".exe");
			return;
		}
		
		core.module.project.run({'cmd': '\n\rclear;'+absolute_path}, function(result){
			core.module.layout.select('terminal'); // jeongmin: show terminal tab
			core.module.toast.show(core.module.localization.msg['alert_plugin_check_terminal']);
			callback();
		});		
	},
	
	debug: function (options) {
		var path = options.path;
		var self = this;
		var property = options.property;
		// var table_variable = core.module.debug.table_variable;
		var debug_module = core.module.debug;

		// terminal UI open
		//
		// this.terminal = core.module.layout.workspace.window_manager.open("/", "debug", "terminal", "Terminal").terminal;
		debug_module.debug_terminal_open();

		// this.current_debug_project = path;
		// this.prompt = /\(gdb\) $/;
		// debug_module.debug_terminal.debug_endstr = /exited normally/;
		debug_module.debug_setting({
			'prompt': /\(gdb\) $/,
			'endstr': /exited normally/
		});
		
		// debug tab init
		// table_variable.fnClearTable();
		debug_module.clear_table();
		
		this.breakpoints = [];
		
		// debug start!
		var send_data = {
				"plugin" : "goorm.plugin.cpp",
				"path" : path,
				"mode" : "init"
		};
		
		// debug command
		//

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
			var debug_module = core.module.debug;
			var debug_terminal = debug_module.debug_terminal;
			core.module.terminal.terminal.focus();
			debug_terminal.send_command("p "+data.variable+"="+data.value+'\r', debug_module.debug_prompt);
		});

		// debug terminate
		// off is not working - deleted -- heeje
		$(debug_module).off("debug_end");
		$(debug_module).one("debug_end",function(){
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
	debug_cmd: function (options ,callback) {
		/*
		 * cmd = { mode, project_path }
		 */
		var self=this;
		var cmd = options.cmd;
		var property = options.property;
		// var table_variable = core.module.debug.table_variable;
		
		var workspace = core.preference.workspace_path;
		var projectName = core.status.current_project_path+"/";
		var mainPath = property['plugin.cpp.main'];
		var buildPath = property['plugin.cpp.build_path'];
		var debug_module = core.module.debug;
		var debug_terminal = debug_module.debug_terminal;
		
		//flush command before run actually (does not typing flush without typing) --heeje
		if (debug_terminal) {
			switch (cmd.mode) {
			case 'init':
				debug_terminal.flush_command_queue();
				debug_terminal.send_command("gdb "+workspace+projectName+buildPath+mainPath+" --quiet\r");
				self.set_breakpoints();
				debug_terminal.send_command("run\r", debug_module.debug_prompt, function(){
					debug_terminal.flush_command_queue();
					self.debug_get_status();
				});
				break;
			case 'continue':
				debug_terminal.flush_command_queue();
				self.set_breakpoints();
				debug_terminal.send_command("continue\r", debug_module.debug_prompt, function(){
					self.debug_get_status();
				}); 
				break;
			case 'terminate':
				debug_terminal.flush_command_queue();
				debug_terminal.send_command("quit\r", debug_module.debug_prompt, function(data){
				});
				setTimeout(function(){
					debug_terminal.send_command("y\r", /(Exit|Quit) anyway\?/);
					debug_terminal.flush_command_queue();
					if(callback)
						callback();
				}, 500);
				// table_variable.fnClearTable();
				core.module.debug.clear_table();
				
				// clear highlight lines
				var windows = core.module.layout.workspace.window_manager.window;
				for (var i in windows) {
					var window = windows[i];
					if (window.project === debug_module.debug_current_project) {
						window.editor && window.editor.clear_highlight();
					}
				}
				break;
			case 'step_over':
				debug_terminal.flush_command_queue();
				self.set_breakpoints();
				debug_terminal.send_command("next\r", debug_module.debug_prompt, function(){
					self.debug_get_status();
				}); break;
			case 'step_in':
				debug_terminal.flush_command_queue();
				self.set_breakpoints();
				debug_terminal.send_command("step\r", debug_module.debug_prompt, function(){
					self.debug_get_status();
				}); break;
			case 'step_out':
				debug_terminal.flush_command_queue();
				self.set_breakpoints();
				debug_terminal.send_command("finish\r", debug_module.debug_prompt, function(){
					self.debug_get_status();
				}); break;
			default : break;
			}
		}
		else {
			if (callback) callback();
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
			core.module.debug.debug_terminal.send_command("info locals\r", debug_module.debug_prompt, function(local_terminal_data){
				self.set_debug_variable(local_terminal_data);
			});
		}, 500)
	},
	
	set_currentline: function(terminal_data){
		var self = this;
		var lines = terminal_data;
		
		// clear highlight lines
		var windows = core.module.layout.workspace.window_manager.window;
		var debug_module = core.module.debug;

		for (var i in windows) {
			var window = windows[i];
			if (window.project === debug_module.debug_current_project) {
				window.editor && window.editor.clear_highlight();
			}
		}

			if(lines == '') return;
			// 현재 라인 처리
			var regex = /at ((.*)\/)?(.*):(\d+)/;
			
			if(regex.test(lines)) {
				//console.log(lines);
				var match = lines.match(regex);

				var filepath = match[2];
				var filename = match[3];
				var line_number = match[4];
				
				var windows = core.module.layout.workspace.window_manager.window;
								
				for (var j=0; j<windows.length; j++) {
					var window = windows[j];
					
					if (window.project === debug_module.debug_current_project 
							&& window.filename === filename){
						
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
	},

	set_debug_variable: function(terminal_data){
		var self = this;
		var lines = terminal_data.split('\n');

		$.each(lines, function(i,o){
			var word = o.slice(o.indexOf(" = ")+1, o.length);
			
			if(/^=/.test(word) || /gdb/.test(word)){}
			else{
				lines[parseInt(i)-1] += o;
				delete lines[parseInt(i)];
			}
		});
		self.locals = {};

		var debug_module = core.module.debug;
		// var table_variable = debug_module.table_variable;


		self.start(lines);
	},
	
	set_breakpoints: function(){
		var self = this;
		var windows = core.module.layout.workspace.window_manager.window;
		var debug_module = core.module.debug;

		for (var i in windows) {
			var window = windows[i];
			if (window.project === debug_module.debug_current_project) {
				var filename = window.filename;
				
				if(!window.editor) continue;				
				var breakpoints = window.editor.breakpoints;
				core.module.debug.debug_terminal.send_command('clear\r', debug_module.debug_prompt);
				
				for(var i=0; i < breakpoints.length; i++) {
					var breakpoint = breakpoints[i];
					breakpoint += 1;
					breakpoint = filename+":"+breakpoint;
					core.module.debug.debug_terminal.send_command("break "+breakpoint+"\r", debug_module.debug_prompt, function(data){
					});
				} 
			}
		}
	},
	
	build: function (options, callback) {
		var property = options.property;
		var base_dir = core.preference.workspace_path + options.project_path + '/';

		var path = {
			'source': ' ' + base_dir + property['plugin.cpp.source_path'],
			'build': ' ' + base_dir + property['plugin.cpp.build_path'],
			'main': property['plugin.cpp.main']
		};

		if(property['plugin.cpp.compiler_type'] === "i586-mingw32-gcc")
			path.main += ".exe";

		var clear = function (callback) {
			var clear_cmd ='';
			clear_cmd += 'if [ ! -d '+path.build+' ];';
			clear_cmd += 'then mkdir -p '+path.build+';';
			clear_cmd += 'fi;clear;\n';

			core.module.layout.terminal.send_command('\n', function(){
				core.module.layout.terminal.flush_command_queue();
				core.module.layout.terminal.send_command(clear_cmd, function(){
					core.module.layout.terminal.flush_command_queue();
					callback();
				});
			});
		}

		if(!this.socket){
			this.socket = io.connect();
		}

		//this.socket.emit("check_makefile", "cpp");

		clear(function(){
			var cmd = "";
			var compiler_type = property['plugin.cpp.compiler_type'];
			var build_options = " "+property['plugin.cpp.build_option'];

			if (property['plugin.cpp.makefile_option'] === true || property['plugin.cpp.makefile_option'] === 'true') {
				cmd = 'cd ' + base_dir + '; make';
			}
			else {
				
				if (core.env.os == 'darwin') property['plugin.cpp.compiler_type'] = "clang++";
				else property['plugin.cpp.compiler_type'] = "g++";
				
				//attach removing color option to Mac OSX --heeje
				//also the make file is edited to use clang, not gcc(g++) anymore.
				if(compiler_type === 'clang' || compiler_type === 'clang++')
					build_options += ' -fno-color-diagnostics';

				cmd = base_dir + '/make ' + compiler_type + path.source + path.build + path.main + build_options;
			}

			core.module.project.build(cmd, {
				'prompt': /Build /
			}, function (result) { // Donguk Kim
				core.module.layout.project_explorer.refresh();

				// OUTPUT MANAGER & ERROR MANAGER
				//
				var om = core.module.layout.tab_manager.output_manager;
				var wm = core.module.layout.workspace.window_manager;

				var parsed_data = om.parse(result, "cpp");
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
					core.module.layout.select('gLayoutOutput_cpp');

					if (callback) callback(build_result);
				}
			});
		});
	},
	
	clean: function(options, callback){
		var property = options.property; // Kim Donguk : refactoring 
		var plugin = property.plugins['goorm.plugin.cpp'];
		var buildPath = plugin['plugin.cpp.build_path'];
		
		goorm.core.project.clean({
			path: options.workspace+options.project_path+"/"+buildPath,
			target: "*"
		}, function(){
			core.module.layout.project_explorer.refresh();

			if(callback && typeof(callback) == "function")
				callback();
		});
	},
	get_type : function(line){
		
		if(/=/.test(line)){
			var variable = line.slice(0, line.indexOf(" = "));
			var word = line.slice(line.indexOf(" = ")+3, line.length);
			if(word){
				if(/^{/.test(word)){
					var test = word.split(' = ');
					if(test.length > 1){
						return {							
							'type' : 'struct',
							'variable' : variable,
							'data' : word
						}
					}else{
						return {
							'type' : 'array',
							'variable' : variable,
							'data' : word
						}
					}
				}
				else if(/^0x/.test(word)){
					return {
						'type' : 'pointer',
						'variable' : variable,
						'data' : line
					}
				}
				else if(/^"/.test(word)){
					return {
						'type' : 'string',
						'variable' : variable,
						'data' : line
					}
				}
				else{
					return {
						'type' : 'number',
						'variable' : variable,
						'data' : word
					}
				}
			}
		}
		else{
			if(/^0x/.test(line)){
				return {
					'type' : 'pointer',
					'value' : line
				}
			}
			else{
				return {
					'type' : 'number',
					'value' : line
				}
			}
		}
	},
	get_value : function(word){
		var variable = word.split(' = ');
		return {
			'variable' : variable[0].trim(),
			'value' : variable[1].trim()
		}
	},
	struct_process : function(word, callback){
		var self = this;
		word = word.replace("{", "");
		word = word.replace("}", "");
		var array = {};
		var temp = [];
		var words = word.split(',').map(function(o){
			return o.trim(); 
		});
		
		$.each(words, function(i, __word){
			var __word_type = self.get_type(__word);
			if(/^{/.test(__word_type.data)){
				array[i] = __word_type;
				temp.push(i);
			}else if(/$}/.test(__word_type.data)){
				array[temp[0]].data += "," + __word;
				temp.pop();
			}else{
			
				if(temp.length>0){
					array[temp[0]].data += "," + __word;
				}else{
					array[i] = __word_type;
					
				}
			}
		});
		callback(array);
	},
	array_process : function(word, callback){
		var self = this;

		word = word.replace("{", "");
		word = word.replace("}", "");
		var array = {};
		var words = word.split(',').map(function(o){ return o.trim(); });
		$.each(words, function(i, __word){
			var __word_type = self.get_type(__word);
			array[i] = __word_type;
		});
		callback(array);
	},

	pointer_process : function(word, callback){
		var self = this;
		var data = self.get_value(word);
		
		callback({
			'type' : 'pointer',
			'value' : data.value
		});
	},

	number_process : function(word, callback){
		var self = this;

		callback({
			'type' : 'number',
			'value' : word
		});
	},
	string_process : function(word, callback){
		var self = this;
		var data = self.get_value(word);
		callback({
			'type' : 'string',
			'value' : data.value
		});
	},

	start : function(lines){
		var self = this;
		// var table_variable = core.module.debug.table_variable;

		// table_variable.fnClearTable();
		core.module.debug.clear_table();
		$.each(lines, function(i, line){
			if(!line || line == '' || /info locals/.test(line) || /gdb/.test(line) || /No locals/.test(line)) return;
			var word = self.get_type(line);
			switch(word.type){
				case 'struct':
				self.struct_process(word.data, function(array){
						self.locals[word.variable] =  array;
						var variable = line.slice(line.indexOf(" = ")+3,line.length);
						var data = {};
						data.value = variable.trim();
						data.type = "struct";

						self.add_row(data, word.variable);
					});
				break;
				case 'array':
					self.array_process(word.data, function(array){
						self.locals[word.variable] =  array;

						var variable = line.slice(line.indexOf(" = ")+3,line.length);
						var data = {};
						data.value = variable.trim();
						data.type = "array";

						self.add_row(data, word.variable);
					});
					break;
				case 'pointer':
					self.pointer_process(word.data, function(data){
						self.locals[word.variable] = data;
						self.add_row(data, word.variable);
					});
					break;
				case 'number':
					self.number_process(word.data, function(data){
						self.locals[word.variable] = data;
						self.add_row(data, word.variable);
					});
					break;
				case 'string':
					self.string_process(word.data, function(data){
						self.locals[word.variable] = data;
						self.add_row(data, word.variable);
					});
					break;

				default:
					break;
			}
		});
	},

	push : function(table_variable){
		var self = this;
		core.module.debug.debug_terminal.send_command("p "+"x"+"="+self.locals['x'].value+"\r", debug_module.debug_prompt);
	},
	add_row : function(variable, key){
		core.module.debug.add_data_table("<div class='expand_row' type='"+variable.type+"' num = '1' key='"+key+"' show='"+false+"'>"+key+"</div>", variable.value, variable.type);
		// if(variable && variable.value && variable.type){
		// 	core.module.debug.table_variable.fnAddData(
		// 		[
		// 		"<div class='expand_row' type='"+variable.type+"' num = '1' key='"+key+"' show='"+false+"'>"+key+"</div>"
		// 		,variable.value
		// 		,variable.type
		// 		]
		// 	);

		// }
	},

	delete_row : function(start, len){
		for (var i=0; i<len; i++) {
			core.module.debug.delete_data_table(start);
		}
		// for(var i=0;i<len;i++){
		// 	core.module.debug.table_variable.fnDeleteRow(start);
		// }
	},

	compiler_list_up : function(tab_select){
		if(!this.socket){
			this.socket = io.connect();
		}
		
		var data = {
			"plugin" : "goorm.plugin.cpp",
			"channel" : "list_up",
			"test_data" : this.compiler
		};
		this.socket.on("cpp_compiler_list_up", function(compiler_list){
			tab_select.find("option").remove();
			for(var i = 0; i<compiler_list.length; i++){
				tab_select.append("<option value='" + compiler_list[i] + "'>" + compiler_list[i] + "</option>");
			}
		});
		this.socket.emit("plugin", JSON.stringify(data));

	},


	// move 'output_manager' ---> /public/modules/goorm.core.layout/layout.tab.js 
	//

	// output_manager: {
	// 	context: null,
	// 	table: null,
	// 	errorsend_context: null,
	// 	init: function (context) {
	// 		var self = this;
	// 		this.context = context;

	// 		this.errorsend_context = new goorm.core.menu.context();
	// 		this.errorsend_context.init("", "errorsend.context", "", "", "", function() {
	// 			$(document).on('click', '[id="errorsend.context"] li > a', function() {
	// 				self.errorsend_context.hide();
	// 			});
	// 		});
	// 		$(core).on('contextmenu_all_hide', function() {
	// 			self.errorsend_context.hide();
	// 		});

	// 		this.create();
	// 	},

	// 	create: function () {
	// 		$('[id="'+this.context+'"]').html( '<table cellpadding="0" cellspacing="0" border="0" class="display table table-hover table-condensed table-bordered table-striped" id="'+this.context+'_table" ></table>' );
	// 		this.table = $('[id="'+this.context+'_table"]').dataTable( {
	// 			"aaData": [],
	// 			"aoColumns": [
	// 				{ "mData":'file', "sTitle": '<span localization_key="dictionary_file">' + core.module.localization.msg.dictionary_file + '</span>' },
	// 				{ "mData":'line', "sTitle": '<span localization_key="dictionary_line">' + core.module.localization.msg.dictionary_line + '</span>' },
	// 				{ "mData":'content', "sTitle": '<span localization_key="dictionary_content">' + core.module.localization.msg.dictionary_content + '</span>' },
	// 			],
	// 			"sDom": '<"H">Rrt'
	// 		});

	// 		this.set_event();
	// 	},

	// 	set_event: function () {
	// 		var self = this;

	// 		if (this.context && this.table) {
	// 			$(document).on('click', '[id="'+this.context+'_table"] tbody td', function () {
	// 				var aPos = self.table.fnGetPosition(this);
	// 				var row = self.table.fnGetData(aPos[0]);

	// 				var file = row.file.split('/');
	// 				var line = row.line;
	// 					line = parseInt(line, 10) - 1; // CodeMirror Start Line Number --> 0

	// 				var filename = file.pop();
	// 				filename = filename.split(":")[0];
	// 				var filepath = file.join('/') + '/';

	// 				var w = core.module.layout.workspace.window_manager.get_window(filepath, filename);

	// 				if (w) {
	// 					w.editor.editor.setCursor(line);
	// 				}
	// 				else {
	// 					$(core).one(filepath + '/' + filename + 'window_loaded', function () {
	// 						var __w = core.module.layout.workspace.window_manager.get_window(filepath, filename);
	// 						__w.editor.editor.setCursor(line);
	// 					});

	// 					core.module.layout.workspace.window_manager.open(filepath, filename, filename.split('.').pop());	
	// 				}
	// 			});
	// 			$(document).on('mousedown', '[id="'+this.context+'_table"] tbody td', function (e) {
	// 				if( e.button == 2){
	// 					var parent = $(this).parent();
	// 					var filepath = $(parent).children("td:nth-child(1)").text();
	// 					var line = $(parent).children("td:nth-child(2)").text();
	// 					var content = $(parent).children("td:nth-child(3)").text();
	// 					$('[id="errorsend.context"] li > a').unbind("click");
	// 					$('[id="errorsend.context"] li > a').click(function(){
	// 						goorm.core.collaboration.chat.message.send_builderror(filepath, line, content);
	// 					});
	// 					self.errorsend_context.show(e);
	// 				}
	// 			});
	// 		}
	// 	},

	// 	parse: function (raw) {
	// 		var regex = /((.*)\/)?(.*):(\d+)/;
	// 		var data = [];

	// 		// Cut Build Fail
	// 		//
	// 		raw = raw.substring(0, raw.indexOf('Build Fail'));
	// 		raw = raw.split(' ');			

	// 		var find_error = function (i, m) {
	// 			if (/:(\d+):/.test(m)) return true;
	// 			else return false;
	// 		}

	// 		var get_content = function (i) {
	// 			var m = "";

	// 			for (var j=i+1; j<raw.length; j++) {
	// 				m += ' ' + raw[j];

	// 				if (/:(\d+):/.test(raw[j])) {
	// 					m = m.substring(0, m.indexOf('/'));
	// 					m = m.replace(/ error: /, '');
	// 					return m;
	// 				}
	// 			}

	// 			return m;
	// 		}

	// 		for (var i=0; i<raw.length; i++) {
	// 			if (find_error(i, raw[i])) {
	// 				var match = raw[i].match(regex);

	// 				var content = match.pop()+": ";
	// 				var filename = match.pop();
	// 				var line = filename.split(":")[1];
	// 				filename = filename.split(":")[0];
	// 				var filepath = "";
	// 				var temp_path = match[match.length-1].split('/');

	// 				var is_path = false;

	// 				for(var k=0; k<temp_path.length; k++) {
	// 					if (temp_path[k] && temp_path[k] == core.status.current_project_path) is_path = true;
	// 					if (!temp_path[k] || !is_path) continue;
	// 					if (temp_path[k] == filename) return;

	// 					filepath += temp_path[k] + '/';
	// 				}

	// 				content += get_content(i);

	// 				data.push({
	// 					'file': filepath + filename,
	// 					'line': line,
	// 					'content': content
	// 				});
	// 			}
	// 		}

	// 		return data;
	// 	},

	// 	push: function (data) {
	// 		if (this.table) {
	// 			this.table.fnAddData({
	// 				'file': data.file,
	// 				'line': data.line,
	// 				'content': data.content
	// 			});
	// 		}
	// 	},

	// 	clear: function () {
	// 		if (this.table) {
	// 			this.table.fnClearTable();
	// 		}
	// 	}
	// }
};
