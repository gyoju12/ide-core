/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


goorm.plugin.nodejs = {
	/*
		Properties
	 */
	name: "nodejs",
	full_name: "goorm.plugin.nodejs",
	// mainmenu: null,
	debug_con: null,
	// current_debug_project: null,
	breakpoints: null,
	server_tab: null,
	server_tab_content: null,
	bg_terminal: null,
	// terminal: null,

	/*
		Methods
	 */
	init: function() {
		var self = this;

		core.module.project.add({
			'type': 'nodejs',
			'img': '/goorm.plugin.nodejs/images/nodejs.png',
			'items': [{
				'key': 'nodejs_project',
				'detail_type' : 'default',
				'img': '/goorm.plugin.nodejs/images/nodejs_console.png'
			}, {
				'key': 'express_project',
				'detail_type' : 'express',
				'img': '/goorm.plugin.nodejs/images/nodejs_console.png'
			}]
		});

		this.add_key_bind();
		// this.add_project_item();

		// this.mainmenu = core.module.layout.mainmenu;

		//this.debugger = new org.uizard.core.debug();
		//this.debug_message = new org.uizard.core.debug.message();

		// this.cErrorFilter = /[A-Za-z]* error: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.cWarningFilter = /[A-Za-z]* warning: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.lineFilter = /:[0-9]*:/;

		// this.add_mainmenu();
		// this.add_toobar();

		// this.add_menu_action();

		$(core).bind('goorm_login_complete', function() {
			self.socket = io.connect();
			self.init_socket_connect();
		});

		//add checking server running before delete current nodejs project --heeje
		$(core).on('on_project_before_delete', function() {
			
			if (self.server_running) {
				$('.server_btn').click();
				// console.log($('#goorm_inner_layout_bottom>.tab-content .active').attr('id'));

				if ($('#goorm_inner_layout_bottom>.tab-content .active').attr('id') == 'server_tab_nodejs') {
					$('#gLayoutTab_Debug').tab();
				}

				$('#' + self.server_tab).remove();
				$('#' + self.server_tab_content).remove();

				self.bg_terminal = undefined;
				self.server_tab = undefined;
				self.server_tab_content = undefined;
			}
		});

		//checking server running before creating or opening/changing project --heeje
		$(core).on('on_project_binding', function() {
			
			core.dialog.open_project.bind('before', function() {
				var switch_func = function() {
					if ($('#goorm_inner_layout_bottom>.tab-content .active').attr('id') == 'server_tab_nodejs') {
						$('#gLayoutTab_Debug').tab();
					}
					$('#' + goorm.plugin.nodejs.server_tab).remove();
					$('#' + goorm.plugin.nodejs.server_tab_content).remove();
					goorm.plugin.nodejs.bg_terminal = undefined;
					goorm.plugin.nodejs.server_tab = undefined;
					goorm.plugin.nodejs.server_tab_content = undefined;

					$(core).trigger('do_open');
				}

				if (self.server_running) {
					confirmation.init({
						title: core.module.localization.msg.confirmation_server_running,
						message: core.module.localization.msg.confirmation_server_running_msg,
						yes_text: core.module.localization.msg.confirmation_stop_server,
						no_text: core.module.localization.msg.confirmation_cancel,

						yes: function() {
							$('.server_btn').click();
							switch_func();
						},
						no: function() {
							//set project explorer correctly
							$('#selected_project_name').html(core.status.current_project_name);
							return false;
						}
					});
					confirmation.show();
				} else switch_func();

				return true;
			});
		});

		if (core.status.login_complete) {
			self.socket = io.connect();
			self.init_socket_connect();
		}
	},
	/*
	add_project_item: function () {
		$("div[id='project_new']").find(".project_types").append("<a href='#' class='list-group-item project_wizard_first_button' project_type='nodejsp'><img src='/goorm.plugin.nodejs/images/nodejs.png' class='project_icon' /><h4 class='list-group-item-heading' class='project_type_title'>node.js Project</h4><p class='list-group-item-text' class='project_type_description'>Server-side Javascript Project with node.js</p></a>");

		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all nodejsp thumbnail' description='  Create default Node.js project' project_type='nodejs' plugin_name='goorm.plugin.nodejs'><img src='/goorm.plugin.nodejs/images/nodejs_console.png' class='project_item_icon'><div class='caption'><p>Nodejs Project</p></div></div>");

		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all nodejsp thumbnail' description='  Create default Node.js project' project_type='nodejs' plugin_name='goorm.plugin.nodejs'><img src='/goorm.plugin.nodejs/images/nodejs_console.png' class='project_item_icon'><div class='caption'><p>Express Project</p></div></div>");

		$(".project_dialog_type").append("<option value='c'>nodejs Projects</option>").attr("selected", "");
		
	},
	
	add_mainmenu: function () {
		var self = this;
		
		$("li[id='plugin_new_project']").after("<li class='plugin_project'><a href=\"#\" action=\"new_file_nodejs\">node.js Project</a></li>");
	},
	
	add_toobar: function() {
		$('[id="project.toolbar"]').prepend("<a action='stop' tooltip=\"project_stop\" style=\"display:none;\"><div class=\"toolbar_button stop\" style=\"background:url('configs/toolbars/goorm.core.project/image/control_stop.png') no-repeat; width:16px; height: 16px; background-position: center;\"></div></a>");
	},*/

	add_key_bind: function() {
		var self = this;
		/*
		$("a[action=new_file_nodejs]").unbind("click");
		$("a[action=new_file_nodejs]").click(function () {
			core.dialog.new_project.show(function (){	//jeongmin: define callback
				$("#project_new").find(".dialog_left_inner").scrollTop($("#project_new").find(".dialog_left_inner").scrollTop() + $(".project_wizard_first_button[project_type=nodejsp]").position().top);	//jeongmin: the one who has to be scrolled is "the room" that have project_types and scroll position standard is always scrollTop()
			});

			$(".project_wizard_first_button[project_type=nodejsp]").trigger("click");
		});
		*/
		$(core).unbind('terminal_key_hook-ctrl+c');
		$(core).bind('terminal_key_hook-ctrl+c', function() {
			if (core.status.current_project_type == 'nodejs') {
				self.stop({
					'terminal': true
				});
			}
		});
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

		switch (data.project_detailed_type) {
			case "express":
				data.plugins["goorm.plugin.nodejs"]["plugin.nodejs.main"] = "app";
				break;
			case "default":
			default:
				data.plugins["goorm.plugin.nodejs"]["plugin.nodejs.main"] = "main";
		}

		var send_data = {
			"plugin": "goorm.plugin.nodejs",
			"data": data
		};

		core.module.project.create(send_data, function(result) {
			// setTimeout(function(){
			// var property = core.property.plugins['goorm.plugin.nodejs'];
			core.property.plugins["goorm.plugin.nodejs"]["plugin.nodejs.main"] = data.plugins["goorm.plugin.nodejs"]["plugin.nodejs.main"];

			core.dialog.project_property.fill_dialog(core.property);
			core.dialog.project_property.save();

			var filepath = core.status.current_project_path + '/';
			//var filename = property['plugin.nodejs.main']+'.js';
			var filename = data.plugins["goorm.plugin.nodejs"]["plugin.nodejs.main"] + ".js";
			var filetype = 'js';

			core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});
			core.module.layout.project_explorer.refresh();
			// $(core).trigger("on_project_open");
			// }, 500);

		});
	},

	run: function(options, callback) {
		var self = this;
		var property = options.property;

		var source_path = property['plugin.nodejs.source_path'];
		var main = property['plugin.nodejs.main'];

		if (!property['plugin.nodejs.run_option']) property['plugin.nodejs.run_option'] = "";
		var project_path = core.status.current_project_path;
		var run_option = property['plugin.nodejs.run_option'];

		

			
		var workspace = core.preference.workspace_path;
		var run_path = workspace + project_path + '/' + source_path + main + '.js';

		var cmd1 = "node " + run_path + " " + run_option;

		// core.module.layout.terminal.send_command(cmd1+'\r');

		this.make_server_tab("nodejs", function() {
			self.bg_terminal.command(cmd1);
			callback();
		});
		
	},

	stop: function(__option) {
		var self = this;

		var option = (__option) ? __option : {};
		var terminal = option.terminal;

		var property = core.property.plugins['goorm.plugin.nodejs'];

		var source_path = property['plugin.nodejs.source_path'];
		var main = property['plugin.nodejs.main'];

		var project_path = core.status.current_project_path;

		

			
		if (terminal) {
			var cmd = "\x03"
			if (terminal.send_command) {
				terminal.command_ready = true;
				terminal.send_command(cmd + '\r');
				terminal.command_ready = true;
			} else {
				core.module.layout.terminal.send_command(cmd);
			}
		}
		
	},

	debug: function(options) {
		var self = this;
		var path = options.path;
		var property = options.property;
		var table_variable = core.module.debug.table_variable;
		var debug_module = core.module.debug;
		// this.terminal = core.module.layout.workspace.window_manager.open("/", "debug", "terminal", "Terminal").terminal;
		debug_module.debug_terminal_open();

		// this.current_debug_project = path;
		// this.prompt = /debug>/;
		// debug_module.debug_terminal.debug_endstr = /program terminated/;
		debug_module.debug_setting({
			'prompt': /debug>/,
			'endstr': /program terminated/
		})

		// debug탭 초기화
		// table_variable.initializeTable();
		// table_variable.refreshView();

		this.breakpoints = [];

		//		// debug start!
		var send_data = {
			"plugin": "goorm.plugin.nodejs",
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


		$(debug_module).off("debug_end");
		$(debug_module).on("debug_end", function() {
			// table_variable.initializeTable();
			// table_variable.refreshView();

			$.get("/remove_port", {
				"port": self.debug_port
			});

			// clear highlight lines
			var windows = core.module.layout.workspace.window_manager.window;
			for (var i in windows) {
				var window = windows[i];
				if (window.project == debug_module.debug_current_project) {
					window.editor && window.editor.clear_highlight();
				}
			}

			setTimeout(function() {
				// self.debug_cmd({mode:'terminate'});
				core.module.debug.debug_terminate();
			}, 500);
		});
	},

	/*
	 * 디버깅 명령어 전송
	 */
	debug_cmd: function(options) {
		/*
		 * cmd = { mode, project_path }
		 */
		var self = this;
		var cmd = options.cmd;
		var property = options.property;
		var table_variable = core.module.debug.table_variable;

		var main = property['plugin.nodejs.main'];
		var buildPath = " " + property['plugin.nodejs.source_path'];
		var debug_terminal = core.module.debug.debug_terminal;

		if (debug_terminal === null) {
			// console.log("no connection!");
			var result = {
				result: false,
				code: 6
			};
			core.module.project.display_error_message(result, 'alert');
			return;
		}

		switch (cmd.mode) {
			case 'init':
				

				
				$.getJSON("/alloc_port", {
					"process_name": "node debug"
				}, function(result) {
					self.debug_port = result.port;

					debug_terminal.flush_command_queue();
					debug_terminal.send_command("node debug --port=" + result.port + buildPath + main + "\r");
					setTimeout(function() {
						debug_terminal.send_command("\r", /connecting.*ok/);
						self.set_breakpoints();
						self.debug_get_status();
					}, 1000);
				});
				

				break;
			case 'continue':
				self.set_breakpoints();
				debug_terminal.send_command("cont\r", debug_module.debug_prompt, function() {
					setTimeout(function() {
						self.debug_get_status();
					}, 500);
				});
				break;
				break;
			case 'terminate':
				debug_terminal.flush_command_queue();
				debug_terminal.send_command("quit\r", debug_module.debug_prompt);

				// table_variable.initializeTable();
				// table_variable.refreshView();

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
				debug_terminal.send_command("next\r", debug_module.debug_prompt, function() {
					setTimeout(function() {
						self.debug_get_status();
					}, 500);
				});
				break;
			case 'step_in':
				self.set_breakpoints();
				debug_terminal.send_command("step\r", debug_module.debug_prompt, function() {
					setTimeout(function() {
						self.debug_get_status();
					}, 500);
				});
				break;
			case 'step_out':
				self.set_breakpoints();
				debug_terminal.send_command("out\r", debug_module.debug_prompt, function() {
					setTimeout(function() {
						self.debug_get_status();
					}, 500);
				});
				break;
			default:
				break;
		}
	},

	debug_get_status: function() {
		var self = this;
		var debug_module = core.module.debug;
		debug_module.debug_terminal.send_command("backtrace\r", debug_module.debug_prompt, function(terminal_data) {
			self.set_currentline(terminal_data);
		});
	},

	set_currentline: function(terminal_data) {
		var self = this;
		var lines = terminal_data.split('\n');

		// clear highlight lines
		var windows = core.module.layout.workspace.window_manager.window;
		var debug_module = core.module.debug;
		for (var i in windows) {
			var window = windows[i];
			if (window.project === debug_module.debug_current_project) {
				window.editor && window.editor.clear_highlight();
			}
		}

		$.each(lines, function(i, line) {
			if (line === '') return;

			// 현재 라인 처리
			var regex = /#0 (.*):([\d]+):([\d]+)/;
			if (regex.test(line)) {
				var match = line.match(regex);
				var filename = match[1];
				var line_number = match[2];

				var windows = core.module.layout.workspace.window_manager.window;
				for (var j = 0; j < windows.length; j++) {
					var window = windows[j];
					if (window.project === debug_module.debug_current_project && window.filename == filename) {
						window.editor.highlight_line(line_number);
					}
				}
			}
		});
	},

	set_debug_variable: function(terminal_data) {
		var lines = terminal_data.split('\n');
		var table_variable = core.module.debug.table_variable;

		// table_variable.initializeTable();

		$.each(lines, function(i, line) {
			if (line == '') return;

			// local variable 추가
			var variable = line.split(' = ');
			if (variable.length == 2) {
				table_variable.addRow({
					"variable": variable[0].trim(),
					"value": variable[1].trim()
				});
			}
		});
		// table_variable.refreshView();
	},

	set_breakpoints: function() {
		var self = this;
		var property = core.property.plugins['goorm.plugin.nodejs'];
		var windows = core.module.layout.workspace.window_manager.window;
		var debug_module = core.module.debug;
		var remains = [];
		var breakpoints = [];
		for (var i = 0; i < windows.length; i++) {
			var window = windows[i];

			if (window.project === debug_module.debug_current_project) {
				var filename = window.filename;
				var filepath = window.filepath;
				if (window.editor === null) continue;

				for (var j = 0; j < window.editor.breakpoints.length; j++) {
					var breakpoint = window.editor.breakpoints[j];
					breakpoint += 1;
					filename = filename.split('.js')[0];
					breakpoint = "'" + filename + "', " + breakpoint;

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
					core.module.debug.debug_terminal.send_command("setBreakpoint(" + breakpoint + ")\r", />|(main\[[\d]\][\s\n]*)$/);
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
				core.module.debug.debug_terminal.send_command("clearBreakpoint(" + remains[j] + ")\r", />|(main\[[\d]\][\s\n]*)$/);
			}
		}

	},

	init_socket_connect: function() {
		var self = this;
		if (!this.socket)
			this.socket = io.connect();

		$(document).off('click', '.running_app_button')
		$(document).on('click', '.running_app_button', function() {
			var target = $(this).html();
			window.open(target, '_blank')
		})
	},

	get_html: function(message) {
		if (message.type == 'nodejs_info') {
			var html = "";
			var __class = message.checked ? 'checked' : 'unchecked';
			var content = core.module.localization.msg['notice_nodejs_app_running'] + message.data.service_path;

			html += '<div class="' + __class + '"><div class="message_head" _id="' + message._id + '">[node.js App running information] </div><div class="message_content">' + content + '</div></div>';
			return html;
		} else if (message.type == 'nodejs_prj_info') {
			var html = "";
			var __class = message.checked ? 'checked' : 'unchecked';
			var content = core.module.localization.msg['notice_nodejs_db_access'] + message.data.db_pw;

			html += '<div class="' + __class + '"><div class="message_head" _id="' + message._id + '">[node.js App db information] </div><div class="message_content">' + content + '</div></div>';
			return html;
		}
	},

	action: function(message) {
		if (message.type == 'nodejs_info') {
			this.init_dialog(message.data);
		} else if (message.type == 'nodejs_prj_info') {
			this.init_prj_dialog(message.data);
		}
	},

	make_server_tab: function(plugin_name, callback) {
		var self = this;
		if (!this.server_tab) {
			this.server_tab = 'gLayoutServer_' + plugin_name;
			this.server_tab_content = 'server_tab_' + plugin_name;
			core.module.layout.tab_manager.add('south', {
				'tab': {
					'id': this.server_tab,
					'content': 'Server'
				},
				'tab_content': {
					'id': this.server_tab_content,
					
					
					'content': '<div class="clr_view"><button class="btn btn-primary btn-danger btn-sm server_btn">Stop Server</button><div class="server_status">Server is running on <a href="http://' + location.hostname + ':' + core.user.user_ports[0] + '" target="_blank">http://' + location.hostname + ':' + core.user.user_ports[0] + '</a></div></div><div class="inner_content rst_view"></div>',
					
					'class': 'server_tab'
				},
				'localization': { // jeongmin; add localization
					'tab': 'server',
					'menu': 'window_bottom_layout_output'
				}
			});

			//firstly initialize it's correct size once a time. --heeje
			$(".rst_view").outerHeight($("#search_treeview").height() - $(".clr_view").outerHeight());
		}

		if (!this.bg_terminal) {
			var buffer = "";
			this.bg_terminal = new goorm.core.terminal.background("nodejs");

			var $content = $("#" + self.server_tab_content);
			var $inner = $content.find(".inner_content");

			this.bg_terminal.on_ready = function() {
				$content.on("click", ".server_btn", function() {
					if (self.server_running) {
						self.stop({
							terminal: self.bg_terminal.terminal
						});
						$(this).removeClass("btn-danger").text("Start Server");
						$(this).siblings(".server_status").hide();
						self.server_running = false;
					} else {
						$inner.html('');
						self.run({
							property: core.property.plugins["goorm.plugin." + core.status.current_project_type]
						});
						$(this).addClass("btn-danger").text("Stop Server");
						$(this).siblings(".server_status").show();
						self.server_running = true;
					}
				});

				this.on_message(function(msg) {
					if (/\n/.test(msg.stdout)) {
						$inner.append(msg.stdout.replace(/\n/g, "<br>").replace(/\[\d+m/g, ""));
						$content.scrollTop($content[0].scrollHeight);
					} else {
						$inner.append(msg.stdout.replace(/\[\d+m/g, ""));
					}
				});

				callback();
				self.server_running = true;
				setTimeout(function() {
					core.module.layout.select(self.server_tab);
				}, 150);
			};
		} else {
			var $content = $("#" + self.server_tab_content);
			var $inner = $content.find(".inner_content");

			if (this.server_running) {
				self.stop({
					terminal: self.bg_terminal.terminal
				});
			}

			$inner.html('');
			self.server_running = true;
			$(".server_btn", $content).addClass("btn-danger").text("Stop Server");
			$(".server_btn", $content).siblings(".server_status").show();
			callback();
			setTimeout(function() {
				core.module.layout.select(self.server_tab);
			}, 150);
		}
	}
};
