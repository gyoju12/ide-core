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
	this.current_pwd = '';
	this.export_path = '';
	this.preference = null;
	this.font_family = 'inherit';
	this.font_size = null;
	this.line_spacing = 3;
	this.font_color = 'white';
	this.default_prompt = null;
	this.old_prompt = null;
	this.row = 0;
	this.cols = 0;
	this.ready = false;
	this.on_ready = function() {};
	this.on_message = function() {};
	this.dummy = null;
};

goorm.core.terminal.prototype = {
	init: function(target, terminal_name, in_panel) {
		var self = this;

		this.target = target;
		this.in_panel = in_panel;
		this.terminal_name = terminal_name;
		this.dummy = 'dummy_' + terminal_name;
		this.timestamp = (new Date()).getTime();
		this.preference = core.preference;

		this.resize = $.debounce(self._resize, 100);

		if (this.target && typeof(this.target) === 'string') {
			this.target = $(this.target);
		}

		$('#terminal_dummy').append('<span id="' + self.dummy + '"></span>');

		var create_terminal = function() {
			if (self.target) {
				$(self.target).addClass('terminal');

				var terminal_open_complete = function() {
					if (core.status.is_mobile) {
						$(self.target).parent().append('<textarea class="inputbox" spellcheck=false style="position:absolute; left: -9999px; z-index:-1; width:98%; height:93%; visibility:none;">');
						$(self.target).parent().find('textarea.inputbox').keydown(function(e) {
							if (e.keyCode === 0) {
								var key = $(this).val();
								self.Terminal.handler(key);
								$(this).val('');
							} else {
								self.Terminal.keyDown(e);
							}
						});
						core.adapt_smart_pad($(self.target)[0]);
						$(self.target)[0].addEventListener('touchstart', function(e) {
							$(self.target).parent().find('textarea.inputbox').focus();
						});

						$('div#terminal').css('-moz-user-select', 'none').css('-khtml-user-select', 'none').css('-webkit-user-select', 'none').css('user-select', 'none');
						$('div.terminal').css('-moz-user-select', 'none').css('-khtml-user-select', 'none').css('-webkit-user-select', 'none').css('user-select', 'none');
					}

					$(self.target).parent().css('outline', 'none').css('overflow', 'hidden'); //.css('background-color', 'rgb(70,70,70)');

					$(self).trigger(self.terminal_name + '_open_complete');
				};

				var geometry = self.calculate_geometry();

				self.Terminal = new Terminal({
					cols: geometry.cols,
					rows: geometry.rows,
				}); //seongho.cha: if not calculate when new Terminal, first line will be not refreshed correctly fisrt time.

				self.Terminal.open(self, self.target, {
					'timestamp': self.timestamp,
					'terminal_name': self.terminal_name
				}, terminal_open_complete);

				self.Terminal.bindKeys(self.target[0]);

				$(self.target).on('dialogfocus', function(event, ui) {
					setTimeout(function() {
						$('#workspace').scrollTop(0).scrollLeft(0);
					}, 100);
				});
			} else {
				var msg = {
					'timestamp': self.timestamp,
					'cols': 1000,
					'workspace': core.status.current_project_path,
					'terminal_name': self.terminal_name,
					'uid': core.user.uid,
					'gid': core.user.gid,
					// "user": core.user.id
				};

				self.send('terminal_init', {
					'data': msg,
					'stringify': true
				});
			}
		};

		var init_terminal = function() {
			if (self.target) {
				$(self.target).addClass('terminal');

				// attach Terminal
				$(self).on(self.terminal_name + '_open_complete', $.debounce(function() {
					self.set_option();
					self.focus();
					self.resize_all('layout');
					self.resize();
				}, 100, false));
			}

			var init = false;
			$(self).one('terminal_ready.' + self.terminal_name, function() {
				if (!init) {
					init = true;
					self.ready = true;
					self.set_environment();
					self.on_ready();
					$('#workspace').scrollTop(0).scrollLeft(0);
				}
			});
		};

		var init_event = function() {
			$(window).on('unload', function() { // jeongmin: unload -> beforeunload. For doing necessary works before socket is disconnected

				// terminal leave
				if (self.target) {
					self.Terminal.destroy();
				}
				$(document).trigger(self.terminal_name + '_closed'); // jeongmin: let server know terminal is closed
				$('#' + self.dummy).remove();
				// socket disconnect
				// self.socket.disconnect();	// hidden by jeongmin: this disconnects socket before other terminal's socket communication is done. Socket disconnection is automatically done by socket.io, so no need to do this manually
			});

			$(core).on('layout_resized', function() {
				self.resize_all('layout');
			});

			$(core).on('on_project_open', function() {
				if (self.terminal_name === 'default_terminal') {
					self.change_project_dir();
				}
			});

			$(document).on(self.terminal_name + '_resized', function() {
				if (self.index >= 0) {
					self.resize();
				}
			});

			$(document).one(self.terminal_name + '_closed', function() {
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

			if (self.target) {
				$(self.target).click(function() {
					self.focus();
				});
			}

			$(self).on('terminal_resize', function() { //$.debounce(function() {	// hidden by jeongmin: if debounce is applied, resizing will not be enough
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
					var layout_bottom_height = $('div.ui-layout-south').height() - $('#goorm_inner_layout_bottom .nav').outerHeight();
					$('#goorm_inner_layout_bottom').find('div.tab-content').height(layout_bottom_height);
					if (core.module.layout.workspace.window_manager.maximized) {
						self.focus();
					}
				}
			}); //, 100, false));
		};

		var init_socket = function() {
			//useonly(mode=goorm-standalone,goorm-oss)
			self.socket = io.connect();
			

			

			//			self.socket.on("on_change_project_dir." + self.terminal_name, function(data) {
			//				$(self).trigger("terminal_ready." + self.terminal_name);
			//			});

			self.socket.on('terminal_index.' + self.terminal_name, function(data) {
				data = JSON.parse(data);
				if (self.index == -1 && self.timestamp == data.timestamp) {
					self.index = data.index;
					self.export_path = data.export_path;
					$(self).trigger('terminal_ready.' + self.terminal_name);
					if (core.status.current_project_path !== '' && self.terminal_name !== 'debug') {
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
			self.socket.on('pty_command_result', function(msg) {
				//build stop fix --heeje
				if ((core.module.project.is_running && msg.stdout.indexOf('^C') == 0) || (core.module.project.is_running && msg.stdout.lastIndexOf('[00m$') == msg.stdout.length - 6) || (core.module.project.is_running && msg.stdout.lastIndexOf('[00m#') == msg.stdout.length - 6)) {
					this.is_running = false;
					$('button[action="stop"]').addClass('debug_not_active');
					$('button[action="stop"]').attr('isdisabled', 'disabled');
					$('a[action="stop"]').parent().addClass('disabled')
				}

				

				//useonly(mode=goorm-oss)
				if (self.terminal_name == msg.terminal_name) {
					self.work_queue(msg.stdout);
					if (self.target) {
						self.Terminal.write(msg.stdout);
					}
					if (self.terminal_name == 'debug') {
						$(self.target).scrollTop($(self.target).parent().prop('scrollHeight'));

						if (msg.stdout && self.debug_endstr) {
							var regex = new RegExp(self.debug_endstr);
							if (regex.test(msg.stdout)) {
								$(core.module.debug).trigger('debug_end');
							}
						}
					}

					if (self.in_panel) {
						if (self.Terminal.title && self.Terminal.title !== '') {
							self.set_title(self.Terminal.title);
						} else {
							self.load_pwd(msg.stdout);
						}
					}
				}
				
			});

			// received terminal refresh complete msg
			self.socket.on('terminal_refresh_complete.' + self.terminal_name, function(data) {
				if (data.index == self.index) {
					self.resize();
					self.change_project_dir();
				}

				
			});

			self.socket.on('terminal_exited.' + self.terminal_name, function(data) {
				if (data.index == self.index && self.in_panel) {
					setTimeout(function() {
						self.target.parent().find('.ui-dialog-titlebar-close').click();
					}, 1000);
				}
			});

			
		};

		if (self.target) {
			$(core).on('on_preference_confirmed', function() {
				self.set_option();
				// self.resize();
			});
		}

		// append message & prompt to terminal
		init_terminal();

		// initialize socket.io event
		init_socket();

		//useonly(mode=goorm-standalone,goorm-oss)
		// attach Terminal Library
		create_terminal();

		// initialize js event
		init_event();
		
	},

	send: function(namespace, options) {
		var data = options.data;
		var stringify = options.stringify;

		//useonly(mode=goorm-standalone,goorm-oss)
		if (this.socket && this.socket.socket && this.socket.socket.connected) {
			data.name = this.terminal_name

			if (stringify) {
				data = JSON.stringify(data);
			}

			this.socket.emit(namespace, data);
		}
		

		
	},

	set_environment: function() {
		var self = this;
		if (/^background/.test(this.terminal_name)) {
			this.send_command('export PS1="<bg$>"\r');
			this.command_ready = true;
			this.default_prompt = /\<bg\$\>/;

			if (!core.user.user_ports) {
				core.user.user_ports = [1234];
			}
			if (core.user.user_ports) {
				var port = core.user.user_ports[0];

				for (var i = 0; i < core.user.user_ports.length; i++) {
					var port = core.user.user_ports[i];
					if (i == 0) {
						this.send_command('export PORT=' + port + '\r'); // PORT
					} else {
						this.send_command('export PORT' + i + '=' + port + '\r'); // PORT1, 2 ..
					}
				}
			}

			this.send_command('complete;history -c;clear;\r');
		} else {
			if (!self.default_prompt) {
				self.default_prompt = /.*@.*:.*(\#|\$)/;
			}
		}
	},

	focus: function() {
		$(this.target).parent().attr('tabindex', 0);
		$(this.target).parent().focus();
		core.status.focus_obj = this;
	},

	// it makes all terminals refresh
	refresh_terminal: function() {

		if (this.index != -1) {

			var msg = {
				'index': this.index,
				'terminal_name': this.terminal_name,
				'workspace': core.status.current_project_path
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
		var font_width = Math.floor(font_size * 0.5818079); // jeongmin: changed number -> it's statistical!!
		// if (font_width == 6) // but font_size:11px is exception. Calculation value is 6px, but in real, 7px
		// 	font_width = 7;	// hidden by jeongmin: more accurate column will be calculated below, anyway

		if (!this.in_panel) {
			var parent = $(this.target).parents('.tab-content');

			// for target space
			height = parseInt(parent.height() - 10); // 10 for leaving margins
			width = parseInt(parent.width() - 10); // 10 for leaving margins

			if (!$(this.target).parent().hasClass('tab-content') && $(this.target).parent().children().length !== 1) {
				$(this.target).parent().children().map(function(i, o) {
					if (!$(o).hasClass('terminal')) {
						height = height - $(o).height();
					}
				});
			}

			// for text space
			geometry.rows = Math.floor((height - 10) / div_height); // 10 for leaving margins
			geometry.cols = Math.floor((width - 10) / font_width); // 10 for leaving margins
		} else {
			if (core.module.layout.workspace.window_manager.maximized) {
				height = parseInt($('#workspace').css('height')) - 10;
				width = parseInt($('#workspace').css('width')) - 12;
			} else {
				// 10 for terminal padding
				height = $(this.target).parent().height() - $(this.target).siblings('.ui-dialog-titlebar').outerHeight() - 10;
				width = $(this.target).parent().width() - 10;
			}
			geometry.rows = Math.floor((height - 2) / div_height);
			geometry.cols = Math.floor((width - 3) / font_width);
		}
		////// jeongmin: sometimes, width is much smaller than it is. So, reset its width as its parent's width //////

		$(this.target).width(width);
		$(this.target).height(height);

		if (geometry.cols <= 0 || geometry.rows <= 0 || isNaN(geometry.cols)) { //it can be NaN - divide by 0
			geometry.cols = 1000;
			geometry.rows = 10;
		} else { // column experiment: check if caculated column exactly fits to target's width with font-size and font-family
			///seongho.cha : some browers not fit upper fomula because of spacing. it will calculate real width...
			var dummy_str = (new Array(geometry.cols + 1)).join('a'); // dummy text
			$('#' + this.dummy).html(dummy_str); // put dummy text to dummy terminal

			if ($('#' + this.dummy).width() > width) { // calculated column is too many for width -> text will be hidden
				while ($('#' + this.dummy).width() > width) { // until calculated column exactly fits to terminal width
					geometry.cols -= 1; // calculated column is too many, so decrease
					dummy_str = dummy_str.slice(1); // what if shorter dummy text?
					$('#' + this.dummy).html(dummy_str); // check again
				}
			} else if ($('#' + this.dummy).width() < width) { // calculated column is too few for width -> text will go over to next line
				while ($('#' + this.dummy).width() < width) { // until calculated column exactly fits to terminal width
					geometry.cols += 1; // calculated column is too few, so increase
					dummy_str = dummy_str + 'a'; // what if longer dummy text?
					$('#' + this.dummy).html(dummy_str); // check again
				}

				geometry.cols -= 1; // text should be inside of width, so decrease one more time
			}
		}

		geometry.cols -= 1; // give some margin

		return geometry;
	},
	_resize: function() {
		if (!this.target) {
			return;
		}
		var geometry = this.calculate_geometry();
		this.cols = geometry.cols;
		this.rows = geometry.rows;
		$(this).trigger('terminal_resize');
	},

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

	load_pwd: function(stdout) {
		var prom = '$';
		var del_enter = function(str) {
			var t = '';

			if (str && str !== '') {
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

		var dir = '';

		if (idx > -1 && stdout !== prom) {
			this.test_stdout = stdout;

			dir = stdout.substring(stdout.lastIndexOf('/') + 1, stdout.indexOf(prom));
			dir = dir.split('\n').join('');

			if (/\\[H\\[2J/.test(dir)) {
				dir = dir.replace(/\\[H\\[2J/, '');
			}
			if (dir === '') {
				dir = '/';
			}

			dir = del_enter(dir);
		}

		if (dir && dir !== '') {
			$('#g_window_tab_list').find('.tab_title[id$="tab_title__' + this.terminal_name + '"]').attr('filename', dir);
			this.set_title(dir);
		}
	},

	set_title: function(title) {
		var _title;
		_title = title.substring(0, title.indexOf('['));

		if (core.status.current_project_path === '') {
			_title = '~';
		} else if (this.terminal_name == 'debug') {
			_title = 'debug';
		}
		var w = core.module.layout.workspace.window_manager.get_window('/', this.terminal_name);

		if (w) {
			w.title = _title;
			w.tab.title = _title;

			w.set_title(w.title);
			w.tab.set_title(w.tab.title);
		}
	},

	send_command: function(command, options, callback, callback_prompt) {
		if (!this.ready) {
			return;
		}

		var msg = {
			index: this.index,
			command: command
		};

		var prompt = null;

		// remove second parameter 'options' null
		if (options) {
			if (typeof(options) === 'function') {
				callback_prompt = callback;
				callback = options;
				options = null;
			} else if (RegExp.prototype.isPrototypeOf(options)) {
				prompt = options;
			} else {
				if (options.prompt) {
					prompt = options.prompt;
				}
			}
		}

		if (!prompt) {
			prompt = this.default_prompt;
		}
		if (!this.old_prompt) {
			this.old_prompt = this.default_prompt;
		}

		this.command_queue.push({
			'prompt': prompt,
			'command': msg
		});

		if (callback) {
			this.command_queue.push({
				'prompt': (callback_prompt) ? callback_prompt : prompt,
				'callback': callback
			});
		}

		if (this.command_queue.length < 3) {
			this.work_queue();
		}
	},

	flush_command_queue: function() {
		this.command_queue = [];
		this.command_ready = true;
	},

	work_queue: function(stdout) {
		var self = this;
		if (stdout) {
			this.stdout += stdout;
			if (this.onMessage) {
				this.onMessage(stdout);
			}
		}

		if (!this.command_queue || this.command_queue.length === 0) {
			this.command_queue = [];
			return;
		}

		if (this.running_queue) {
			return;
		} else {
			this.running_queue = true;
		}

		var prompt = this.command_queue[0].prompt;
		if (!prompt) {
			prompt = this.default_prompt;
		}

		if (this.stdout === '') {
			this.command_ready = true;
		} else if (prompt && prompt.test(this.stdout)) {
			this.command_ready = true;
		} else if (/Error/.test(this.stdout)) {
			this.command_ready = true;
		} else if (this.terminal_name != 'debug' && this.stdout) {
			var output = this.stdout.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '');

			if (prompt.test(output) || this.old_prompt.test(output)) {
				this.stdout = this.stdout.replace(/\r/g, '');
				this.command_ready = true;
			} else if (prompt == '/Build /') {
				if (this.stdout.indexOf('No such file or directory') >= 0) {
					this.stdout = this.stdout.replace(/\r/g, '');
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
					this.stdout = '';

				} else if (item.callback && this.stdout !== '') {
					this.command_queue.shift();
					item.callback(this.stdout);
					this.stdout = '';
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
		if (from == 'panel') {
			this.resize();
		} else if (from == 'layout') {
			if (!this.in_panel) {
				this.resize();
			} else {
				if (!core.module.layout.workspace.window_manager.maximized) {
					var workspace_height = parseInt($('#workspace').css('height'));
					var workspace_width = parseInt($('#workspace').css('width'));
					var this_top = parseInt($(this.target).parent().css('top'));
					var this_left = parseInt($(this.target).parent().css('left'));
					var this_height = parseInt($(this.target).parent().css('height')) - 8;
					var this_width = parseInt($(this.target).parent().css('width')) - 8;

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
			$('#workspace').scrollTop(0).scrollLeft(0);
		}
	},

	set_option: function(options) {
		options = options || {};
		this.font_family = (options.font_family) ? options.font_family : this.preference['preference.terminal.font_family'];
		this.font_size = (options.font_size) ? options.font_size : parseInt(this.preference['preference.terminal.font_size'], 10);
		this.line_spacing = (options.line_spacing) ? options.line_spacing : this.preference['preference.terminal.line_spacing'];
		this.font_color = (options.font_color) ? options.font_color : this.preference['preference.terminal.font_color'];

		$(this.target[0]).css('font-family', this.font_family)
			.css('font-size', this.font_size)
			.css('line-height', this.line_spacing / 10 + 1)
			.css('color', this.font_color);

		// setTimeout(self.resize, 1000);
		this.resize();
	}
};
