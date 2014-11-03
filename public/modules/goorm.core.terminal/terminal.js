/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.terminal = function() {
	this.target = null;
	this.in_panel = null;
	this.terminal_name = null;
	this.timestamp = null;
	this.index = -1;
	this.command_queue = [];
	this.resize_queue = [];
	this.status = null;
	this.current_pwd = "";
	this.export_path = "";
	this.preference = null;
	this.font_family = "inherit";
	this.font_size = null;
	this.line_spacing = 3;
	this.font_color = "white";
	this.default_prompt = null;
	this.old_prompt = null;
	this.row = 0;
	this.cols = 0;
	this.ready = false;
	this.on_message = function() {};
	this.dummy = null;
};

goorm.core.terminal.prototype = {
	init: function(target, terminal_name, in_panel) {
		var self = this;

		this.target = target;
		this.in_panel = in_panel;
		this.terminal_name = terminal_name;
		this.dummy = "dummy_"+terminal_name;
		this.timestamp = (new Date()).getTime();
		this.preference = core.preference;

		this.resize = $.throttle(self._resize, 100);
 		
		$("#terminal_dummy").append("<span id='"+self.dummy+"'></span>");

		var create_terminal = function () {
			$(self.target).addClass('terminal');

			var terminal_open_complete = function() {
								

				$(self.target).parent().css('outline', 'none').css('background-color', 'rgb(70,70,70)').css('overflow', 'hidden');

				// self.work_resize(); //whey we need this?

				// core.module.layout.refresh(); //whey we need this?
				$(self).trigger(self.terminal_name + '_open_complete');
			};

			var geometry = self.calculate_geometry();

			self.Terminal = new Terminal({
				cols: geometry.cols,
				rows: geometry.rows,
			});//seongho.cha: if not calculate when new Terminal, first line will be not refreshed correctly fisrt time.

			self.Terminal.open(self, self.target, {
				'timestamp': self.timestamp,
				'terminal_name': self.terminal_name
			}, terminal_open_complete);

			self.Terminal.bindKeys(self.target[0]);

			$(self.target).on("dialogfocus", function(event, ui) {
				setTimeout(function() {
					$("#workspace").scrollTop(0).scrollLeft(0);
				}, 100);
			});
		};

		var init_terminal = function() {
			$(self.target).addClass('terminal');

			// attach Terminal
			$(self).on(self.terminal_name + '_open_complete', $.debounce(function() {
				self.set_option();
				self.focus();
				self.resize_all("layout");
				self.resize();
			}, 100, false));

			var init = false;
			$(self).one('terminal_ready.'+self.terminal_name, function() {
				if (!init) {
					// window.setTimeout(function() {
						

						
						//$(self.target[0]).prepend('<div>Welcome to goorm terminal :)</div>');
						
					// }, 100);
					init = true;
					self.ready = true;
					self.set_environment();
					$("#workspace").scrollTop(0).scrollLeft(0);
				}
			});
		};

		var init_event = function() {
			$(window).on('beforeunload', function() { // jeongmin: unload -> beforeunload. For doing necessary works before socket is disconnected

				// terminal leave
				self.Terminal.destroy();
				$(document).trigger(self.terminal_name + '_closed'); // jeongmin: let server know terminal is closed
				$("#"+self.dummy).remove();
				// socket disconnect
				// self.socket.disconnect();	// hidden by jeongmin: this disconnects socket before other terminal's socket communication is done. Socket disconnection is automatically done by socket.io, so no need to do this manually
			});

			$(core).on("layout_resized", function() {
				self.resize_all("layout");
			});

			$(core).on("on_project_open", function () {
				if (core.status.current_project_path === "") {
					self.change_project_dir();
				}
			});

			$(document).on(self.terminal_name + "_resized", function() {
				if (self.index >= 0) {
					self.resize();
				}
			});

			$(document).on(self.terminal_name + "_closed", function() {
				var msg = {
					index: self.index,
					workspace: core.status.current_project_path,
					terminal_name: self.terminal_name
				};

				self.send('terminal_leave', {
					'data': msg,
					'stringify': true
				});
				// self.socket.emit("terminal_leave", JSON.stringify(msg));
			});

			$(self.target).click(function() {
				self.focus();
			});

			var terminal = $("#terminal");
			terminal.mousedown(function() {
				self.Terminal.flag_drag = 0;
				self.Terminal.mouseon = true;
			});

			terminal.mousemove(function() {
				if (self.Terminal.mouseon) {
					self.Terminal.flag_drag++;
				}
			});

			terminal.mouseup(function() {
				self.Terminal.mouseon = false;
				if (self.Terminal.flag_drag < 5) {
					self.Terminal.flag_darg = 0;
				}
			});

			$(self).on("terminal_resize", function() { //$.debounce(function() {	// hidden by jeongmin: if debounce is applied, resizing will not be enough
				var msg = {
					index: self.index,
					user: core.user.id,
					cols: self.cols,
					rows: self.rows
				};

				self.send('terminal_resize', {
					'data': msg,
					'stringify': true
				});
				// self.socket.emit("terminal_resize", JSON.stringify(msg));
				self.Terminal.resize(self.cols, self.rows);

				if (!self.in_panel) {
					var layout_bottom_height = $("div.ui-layout-south").height() - $('#goorm_inner_layout_bottom .nav').outerHeight();
					$("#goorm_inner_layout_bottom").find("div.tab-content").height(layout_bottom_height);
					if (core.module.layout.workspace.window_manager.maximized) {
						self.focus();
					}
				}
			}); //, 100, false));
		};

		var init_socket = function() {
			
			self.socket = io.connect();
			

			

			self.socket.on("on_change_project_dir."+self.terminal_name, function(data) {
				$(self).trigger("terminal_ready."+self.terminal_name);
			});

			self.socket.on("platform."+self.terminal_name, function(data) {
				data = JSON.parse(data);

				if (!self.default_prompt) self.default_prompt = /.*@.*:.*(\#|\$)/;
				self.platform = data.platform;
				core.env.os = data.platform;
			});

			self.socket.on("terminal_index."+self.terminal_name, function(data) {
				data = JSON.parse(data);

				if (self.index == -1 && self.timestamp == data.timestamp) {
					self.index = data.index;
					self.export_path = data.export_path;

					if (core.status.current_project_path !== "") {
						var msg = {
							index: self.index,
							project_path: core.status.current_project_path
						};

						self.send('change_project_dir', {
							'data': msg,
							'stringify': true
						});						
						// self.socket.emit("change_project_dir", JSON.stringify(msg));
					}
				}
			});

			// result write
			self.socket.on("pty_command_result", function(msg) {

				//build stop fix --heeje
				if(core.module.project.is_running && msg.stdout.indexOf('[01;32m') > 0 && msg.stdout.indexOf('^C') == 0 && msg.stdout.indexOf('[H[2J') < 0) {
					this.is_running = false;
					$('button[action="stop"]').addClass('debug_not_active');
					$('button[action="stop"]').attr('isdisabled','disabled');
					$('a[action="stop"]').parent().addClass('disabled')
				}

				

					
				if (self.terminal_name == msg.terminal_name) {
					self.work_queue(msg.stdout);

					if (!self.no_write) {
						self.Terminal.write(msg.stdout);
					}

					if (self.terminal_name == 'debug') {
						$(self.target).scrollTop($(self.target).parent().prop('scrollHeight'));
					}
				}
				

				if (self.terminal_name == 'debug') {
					if (msg.stdout && self.debug_endstr) {
						var regex = new RegExp(self.debug_endstr);
						if (regex.test(msg.stdout)) {
							$(core.module.debug).trigger('debug_end');
						}
					}
				}

				if (self.in_panel) {
					if (self.Terminal.title && self.Terminal.title !== "") {
						self.set_title(self.Terminal.title);
					} else {
						self.load_pwd(msg.stdout);
					}
				}
			});

			// received terminal refresh complete msg
			self.socket.on("terminal_refresh_complete."+self.terminal_name, function(data) {
				if(data.index == self.index){
					self.resize();
					console.log(self.terminal_name+"_terminal_refresh_complete");
					self.change_project_dir();
				}

				
			});

			self.socket.on("terminal_exited."+self.terminal_name, function(data) {
				if(data.index == self.index && self.in_panel){
					setTimeout(function(){
						self.target.parent().find(".ui-dialog-titlebar-close").click();
					}, 1000);
				}
			});

				
			// self.socket.on('disconnect', function() {
			// 	notice.show(core.module.localization.msg.server_is_end);
			// });
			

			
		};

		$(core).on("on_preference_confirmed", function() { // 
			self.set_option();
			self.resize();
		});

		// append message & prompt to terminal
		init_terminal();

		// initialize socket.io event
		init_socket();

		
		// attach Terminal Library
		create_terminal();

		// initialize js event
		init_event();
		
	},

	send: function (namespace, options) {
		var data = options.data;
		var stringify = options.stringify;

		
		if (this.socket && this.socket.socket && this.socket.socket.connected) {
			data.name = this.terminal_name

			if (stringify) {
				data = JSON.stringify(data);
			}

			this.socket.emit(namespace, data);
		}
		

		
	},

	set_environment: function() {
		if (/^background/.test(this.terminal_name)) {
			this.send_command("export PS1=\"<bg$>\"\r");
			this.command_ready = true;
			this.default_prompt = /\<bg\$\>/;
		}

		// export path
		// if (this.export_path) {
		// 	this.send_command("export PATH=${PATH}:" + this.export_path + "\r");
		// }

		if (!core.user.user_ports) core.user.user_ports = [1234];
		if (core.user.user_ports) {
			var port = core.user.user_ports[0];

			for (var i = 0; i < core.user.user_ports.length; i++) {
				var port = core.user.user_ports[i];
				if (i == 0) {
					this.send_command("export PORT=" + port + "\r"); // PORT
				} else {
					this.send_command("export PORT" + i + "=" + port + "\r"); // PORT1, 2 ..
				}
			}
		}

		this.send_command("complete;clear;\r");
		
  	},

	focus: function() {
		$(this.target).parent().attr('tabindex', 0);
		$(this.target).parent().focus();
		core.status.focus_obj = this;
	},

	// it makes all terminals refresh
	refresh_terminal: function() {

		if( this.index != -1){

			var msg = {
				"index": this.index,
				"terminal_name": this.terminal_name,
				"workspace": core.status.current_project_path
			};
			this.default_prompt = /.*@.*:.*(\#|\$)/;
			this.command_queue = [];
			this.command_ready = false;

			this.send('terminal_refresh', {
				'data': msg,
				'stringify': true
			});
			// this.socket.emit("terminal_refresh", JSON.stringify(msg));
		}
	},
	calculate_geometry: function() { 
		var geometry = {};
		var div_height = parseInt($(this.target).css('line-height'));
		var font_size = parseInt($(this.target).css('font-size'));
        	var height;
		var width;

	        // seongho : I calculate the pixels. floor(font_size * 0.625) is real width of pixels
		var font_width = Math.floor(font_size * 0.625);
		if(font_width == 6)  // but font_size:11px is exception. Calculation value is 6px, but in real, 7px
			font_width = 7;
	
		if (this.terminal_name == "default_terminal") {
			height = parseInt($(this.target).parent().height() - 10);
			width = parseInt($(this.target).parent().width() - 10);

			geometry.rows = Math.floor((height - 10) / div_height);
			geometry.cols = Math.floor((width - 10) / font_width);
		}else{ 
			if(core.module.layout.workspace.window_manager.maximized) {
				height = parseInt($("#workspace").css('height')) - 10;
				width = parseInt($("#workspace").css('width')) - 12;
			}else{
				height = parseInt($(this.target).height());
				width = parseInt($(this.target).width());
			}
			geometry.rows = Math.floor((height - 2) / div_height);
			geometry.cols = Math.floor((width - 3) / font_width);
		}
		////// jeongmin: sometimes, width is much smaller than it is. So, reset its width as its parent's width //////
			
		$(this.target).width(width);
		$(this.target).height(height);

		if (geometry.cols <= 0 || geometry.rows <= 0 || isNaN(geometry.cols)) {  //it can be NaN - divide by 0
			geometry.cols = 1000;
			geometry.rows = 10;
		}else{
			///seongho.cha : some browers not fit upper fomula because of spacing. it will calculate real width...
			var dummy_str = (new Array(geometry.cols + 1)).join("a");
			$("#"+this.dummy).html(dummy_str);
			while ($("#"+this.dummy).width() > width){
				geometry.cols -= 1;
				dummy_str = dummy_str.slice(1);
				$("#"+this.dummy).html(dummy_str);
			}
			geometry.cols -=1;
		}
		return geometry;
	},
	_resize: function (){
		var geometry = this.calculate_geometry();
		this.cols = geometry.cols;
		this.rows = geometry.rows;
		$(this).trigger("terminal_resize");
	},
	
	// work_resize: function() {
	// 	var self = this;

	// 	console.log("work_resize();");

	// 	window.setInterval(function(){
	// 		if( self.resize_queue.length > 0) {
	// 			var msg = self.resize_queue.pop();

	// 			self.socket.emit("terminal_resize", JSON.stringify(msg));
	// 			self.Terminal.resize(msg.cols, msg.rows);

	// 			if(!self.in_panel){
	// 				var layout_bottom_height = $("div.ui-layout-south").height() - $('#goorm_inner_layout_bottom .nav').outerHeight();
	// 				$("#goorm_inner_layout_bottom").find("div.tab-content").height(layout_bottom_height);
	// 			}

	// 			self.resize_queue = [];
	// 		}
	// 	}, 1000);
	// },

	change_project_dir: function() {
		var self = this;

		if (this.index != -1) {
			var msg = {
				index: self.index,
				project_path: core.status.current_project_path
			};

			this.send('change_project_dir', {
				'data': msg,
				'stringify': true
			});
			// self.socket.emit("change_project_dir", JSON.stringify(msg));
		}
	},

	// get_pwd: function () {
	// 	if (this.index != -1) {
	// 		this.socket.emit("get_pwd", this.current_pwd);
	// 	}
	// },

	load_pwd: function(stdout) {
		var prom = '$';
		var del_enter = function(str) {
			var t = "";

			if (str && str !== "") {
				for (var i = 0; i < str.length; i++) {
					var code = str.charCodeAt(i);

					if (code === 13) {
						i++;
						continue;
					} else {
						t += str[i];
					}
				}
			}

			return t;
		}

		


		var idx = stdout.indexOf(prom);
		
		var dir = "";

		if (idx > -1 && stdout !== prom) {
			this.test_stdout = stdout;

			dir = stdout.split('/').pop().trim()
			dir = dir.substring(0, dir.indexOf(prom));
			dir = dir.split('\n').pop();

			if (/\\[H\\[2J/.test(dir)) dir = dir.replace(/\\[H\\[2J/, '');
			if (dir === "") dir = '/';

			dir = del_enter(dir);
		}
		
		if (dir && dir !== "") {
			$("#g_window_tab_list").find('.tab_title[id$="tab_title__' + this.terminal_name + '"]').attr("filename", dir);
			this.set_title(dir);
		}
	},

	set_title: function(title) {
		var _title;
		_title = title.substring(0,title.indexOf('['));

		var w = core.module.layout.workspace.window_manager.get_window('/', this.terminal_name);
		
		if (w) {
			w.title = _title;
			w.tab.title = _title;

			w.set_title(w.title);
			w.tab.set_title(w.tab.title);
		}
	},

	send_command: function(command, options, callback, callback_prompt) {
		if(!this.ready){
			return;
		}

		var msg = {
			index: this.index,
			command: command
		};

		var prompt = null;
		var no_write = false;

		// remove second parameter 'options' null
		if (options) {
			if (typeof(options) === "function") {
				callback_prompt = callback;
				callback = options;
				options = null;
			}
			else if (RegExp.prototype.isPrototypeOf(options)) {
				prompt = options;
			}
			else {
				if (options.prompt) {
					prompt = options.prompt;
				}

				if (options.no_write) {
					no_write = options.no_write;
				}
			}
		}

		if (!prompt) prompt = this.default_prompt;
		if (!this.old_prompt) this.old_prompt = this.default_prompt;

		this.command_queue.push({
			"prompt": prompt,
			"command": msg,
			"no_write": no_write
		});

		if (callback) {
			this.command_queue.push({
				"prompt": (callback_prompt) ? callback_prompt : prompt,
				"no_write": no_write,
				"callback": callback
			});
		}

		if (this.command_queue.length < 3) {
			this.work_queue();
		}
	},

	flush_command_queue: function() {
		this.command_queue = [];
	},

	work_queue: function(stdout) {
		var self = this;

		if (stdout) {
			this.stdout += stdout;
		}
		
		if (!this.command_queue || this.command_queue.length === 0) {
			this.command_queue = [];
			return;
		}

		if (this.running_queue) return;
		else this.running_queue = true;

		var prompt = this.command_queue[0].prompt;
		if (!prompt) prompt = this.default_prompt;

		if (this.stdout === "") {
			this.command_ready = true;
		}
		else if (prompt && prompt.test(this.stdout)) {
			this.command_ready = true;
		}
		else if (this.terminal_name != 'debug' && this.stdout) {
			var output = this.stdout.replace(/\r\n/g, "").replace(/\n/g, "").replace(/\r/g, "");

			if (prompt.test(output) || this.old_prompt.test(output)) {
				this.stdout = this.stdout.replace(/\r/g, "");
				this.command_ready = true;
			} else if(prompt == "/Build /") {
				if(this.stdout.indexOf("No such file or directory") >= 0){
					this.stdout = this.stdout.replace(/\r/g, "");
					this.command_ready = true;	
				}
			}
		}

		if (this.command_ready) {
			this.command_ready = false;

			if (!prompt.test(this.old_prompt)) {
				this.old_prompt = prompt;
			}

			var item = this.command_queue[0];

			if (item) {
				if (item.command) {
					this.command_queue.shift();

					item.command.user = core.user.id;

					this.send('pty_execute_command', {
						'data': item.command,
						'stringify': true
					});
					// this.socket.emit("pty_execute_command", JSON.stringify(item.command));
					this.no_write = item.no_write || false;
					this.stdout = "";

				} else if (item.callback && this.stdout !== "") {
					this.command_queue.shift();

					item.callback(this.stdout);
					this.stdout = "";
				}
			}
		}

		this.running_queue = false;
		if (this.command_queue.length > 0) {
			window.setTimeout(function() {
				self.work_queue();
			}, 500);
		}
	},

	resize_all: function(from) {
		if (from == "panel") {
			this.resize();
		} else if (from == "layout") {
			if (this.terminal_name == "default_terminal") {
				this.resize();
			} else {
				if (!core.module.layout.workspace.window_manager.maximized) {
					var workspace_height = parseInt($("#workspace").css('height'));
					var workspace_width = parseInt($("#workspace").css('width'));
					var this_top = parseInt($(this.target).parent().css('top'));
					var this_left = parseInt($(this.target).parent().css('left'));
					var this_height = parseInt($(this.target).parent().css('height') - 10);
					var this_width = parseInt($(this.target).parent().css('width') - 10);

					if (workspace_height < (this_top + this_height)) {
						if (workspace_height > this_height) {
							$(this.target).parent().css('top', (workspace_height - this_height));
						} else {
							$(this.target).parent().css('top', 0);
						}
					}

					if (workspace_width < (this_left + this_width)) {
						if (workspace_width > this_width) {
							$(this.target).parent().css('left', (workspace_width - this_width));
						} else {
							$(this.target).parent().css('left', 0);
						}
					}
				}
			}
		}
		//prevent terminal rolling-up over the workspace --heeje
		if (!$('#workspace').hasClass('use-scroll')) {
			$("#workspace").scrollTop(0).scrollLeft(0);
		}
	},

	set_option: function(options) {
		options = options || {};
		this.font_family = (options.font_family) ? options.font_family : this.preference["preference.terminal.font_family"];
		this.font_size = (options.font_size) ? options.font_size : parseInt(this.preference["preference.terminal.font_size"], 10);
		this.line_spacing = (options.line_spacing) ? options.line_spacing : this.preference["preference.terminal.line_spacing"];
		this.font_color = (options.font_color) ? options.font_color : this.preference["preference.terminal.font_color"];

		$(this.target[0]).css("font-family", this.font_family)
			.css("font-size", this.font_size)
			.css("line-height", this.line_spacing / 10 + 1)
			.css("color", this.font_color);

		setTimeout(self.resize, 1000);
	}
};


