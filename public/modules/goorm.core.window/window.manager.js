/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.window.manager = {
	window: null,
	tab: null,
	context_menu: null,
	list_menu: null,
	window_list_menu: null,
	workspace: null,
	window_list_container: null,
	index: 0,
	tab_window_index: 0,
	terminal_count: 0,
	merge_count: 0,
	// window_tabview: null,
	active_window: -1,
	active_filename: '',
	window_count: 0,
	maximized: false,
	window_list: null,
	transition_manager: null,
	recent_window: [],
	min_tab_width: 50,
	activated_list: [], //[window.panel, window.panel, ...]

	init: function(container) {
		var self = this;
		this.window = [];
		this.tab = [];
		this.context_menu = [];
		this.window_list_menu = [];
		this.workspace = $('#workspace');
		this.window_list = [];
		this.window_list_container = 'g_window_tab_list';
		this.context_menu[0] = new goorm.core.menu.context();
		this.context_menu[0].init('configs/menu/goorm.core.window/window.manager.html', 'window.manager_context', $('#' + container)[0], '');

		// window events

		// workspace and workspace_tab_list context menu. Jeong-Min Im.
		$('#' + container).mousedown(function(e) {
			if (e.which == 3 && e.target.id == container) { // right click and only for workspace
				self.context_menu[0].show(e);
			}
		});

		$(core).on('goorm_login_complete', function() {
			if (!$.isEmptyObject(localStorage.workspace_window)) {
				var saved_workspace_window = $.parseJSON(localStorage.workspace_window);
				var saved_window_state = saved_workspace_window.win_data;
				self.check_file_list(saved_window_state, function(file_list) {
					var active_window = null;
					var maximized = saved_workspace_window.maximized;
					var editor_exist = false;

					var open = [];
					var opened = [];

					async.map(file_list, function(__file, async_callback) {
						var project_path = __file.filepath.split('/')[0];

						
						//useonly(mode=goorm-oss)
						if (__file.filename === 'debug' || __file.filetype === 'WebView') {
							return async_callback();
						}
						

						// if (__file.width <= 200 || __file.height <= 300) {
						// 	__file.width = 350;
						// 	__file.height = 250;
						// }

						if (typeof(__file.left) === 'string' && __file.left.indexOf('px')) {
							__file.left = __file.left.split('px')[0];
						}

						if (typeof(__file.top) === 'string' && __file.top.indexOf('px')) {
							__file.top = __file.top.split('px')[0];

						}
						if (__file.left === 5 && __file.top === 10 && maximized) {
							__file.left = undefined;
							__file.top = undefined;
						}

						editor_exist = true;

						var open_cb = function() {
							if (opened && opened.indexOf(project_path) === -1) {
								opened.push(project_path);
							}

							self.open(__file.filepath, __file.filename, __file.filetype, __file.editor, __file, function(__window) {
								var current_window = __window;
								// arrange windows with each position and size
								// current_window = self.window[self.index - 1];

								// when the editor was set to vim mode, open the editor as it was
								if (__file.vim_mode) {
									var editor = __window.editor;
									editor.set_option({
										'vim_mode': true,
										'shortcut_theme': 'vim'
									});
								}

								current_window.left = __file.left;
								current_window.top = __file.top;
								current_window.width = __file.width;
								current_window.height = __file.height;
								current_window.zindex = __file.zindex;
								current_window.project = __file.project;
								current_window.activated = __file.activated;
								current_window.cursor = __file.cursor;

								if (current_window.activated) {
									active_window = current_window;
								}
								current_window.move(__file.top, __file.left);
								// 								current_window.bind_width(__file.width);
								// 								current_window.bind_height(__file.height);

								async_callback();
							});
						};

						

						

					}, function() {
						if (active_window) {
							active_window.activate();
						} else if (self.window.length > 0) {
							self.window[self.window.length - 1].activate();
						}
						if (maximized) {
							self.maximize_all();
						}

						if (!editor_exist) {

							$('a[action=do_undo]').parent().addClass('disabled');
							$('a[action=do_redo]').parent().addClass('disabled');
							$('a[action=do_delete]').parent().addClass('disabled');
							$('a[action=select_all]').parent().addClass('disabled');
							$('a[action=do_go_to_line]').parent().addClass('disabled');
							$('a#parent_bookmark_menu').parent().addClass('disabled');
							$('a[action=do_find]').parent().addClass('disabled');
							$('a[action=do_find_next]').parent().addClass('disabled');
							$('a[action=do_find_previous]').parent().addClass('disabled');
							//$("a[action=auto_formatting]").parent().addClass("disabled");
							$('a[action=comment_selected]').parent().addClass('disabled');
							$('a#parent_merge_menu').parent().addClass('disabled');
							$('a#parent_refactor_menu').parent().addClass('disabled');
						}
						// when all windows are loaded, confirm restoring data.
						// var language = localStorage["language.confirmation.automatic_change"];
						// if (language && typeof(language) === 'string')
						// 	language = JSON.parse(language);
						// if (localStorage.unsaved_data && language === true) {
						if (localStorage.unsaved_data) { // no more language change confirmation on login
							confirmation.init({
								message: core.module.localization.msg.confirmation_restore_unsaved_data,
								yes_text: core.module.localization.msg.yes,
								no_text: core.module.localization.msg.no,
								title: 'Confirmation',

								yes: function() {
									goorm.core.edit.prototype.restore_unsaved_file_from_local();
								},
								no: function() {
									localStorage.unsaved_data = '';
								}
							});

							confirmation.show();
						}

						var window_list_container = $('#' + self.window_list_container);

						for (var i = file_list.length - 1; 0 <= i; i--) { // set tab's order as saved order
							window_list_container.prepend($('[filepath="' + file_list[i].filepath + '"][filename="' + file_list[i].filename + '"]').parents('.g_windows_tab_li').detach());
						}

						window_list_container.trigger('sortstop'); // sync window/tab object information
					});

				});

			}

			if (core.module.layout.history) {
				core.module.layout.history.wait_for_loading = false;
			}
		});

		$(core).on('layout_resized', function() {
			self.tab_resize_window_relocation();
			if (self.maximized) {
				self.maximize_all();
			}
		});

		$(window).unload(function() {
			self.save_workspace();
			goorm.core.edit.prototype.save_unsaved_file_in_local();
		});

		this.tab_manager.init(this);
	},

	save_workspace: function() {
		var window_data = [];

		var cursor;
		var scroll_top;
		for (var i = 0; i < this.window.length; i++) {
			
			//useonly(mode=goorm-oss)
			if (this.window[i].filename === 'debug' || this.window[i].filetype == 'WebView') { // jeongmin: skip debug window
				continue;
			}
			
			if (this.window[i].editor && this.window[i].editor.editor) {
				cursor = this.window[i].editor.editor.getCursor();
				scroll_top = this.window[i].editor.scroll_top; // jeongmin: terminal window doesn't have editor
			}
			window_data.push({
				filepath: this.window[i].filepath,
				filename: this.window[i].filename,
				filetype: this.window[i].filetype,
				project: this.window[i].project,
				editor: this.window[i].type,
				left: this.window[i].left,
				top: this.window[i].top,
				width: this.window[i].width,
				height: this.window[i].height,
				zindex: this.window[i].zindex,
				index: this.window[i].index,
				status: this.window[i].status,
				cursor: cursor,
				activated: ((this.window[i].index === this.active_window) ? true : false),
				// storage: this.window[i].storage,	// hidden: storage is deprecated
				scroll_top: scroll_top,
				vim_mode: this.window[i].editor.vim_mode
			});

		}

		var window_info = {
			maximized: this.maximized,
			win_data: window_data
		};
		localStorage.workspace_window = JSON.stringify(window_info);
	},
	
	
	open: function(filepath, filename, filetype, editor, __options, callback) {
		var self = this;
		var options = __options || {};

		////// file is good to open, so do it! Jeong-Min Im. //////
		var do_open = function() {
			if (filepath !== '/' && filepath !== '') {
				if (core.module.layout.history) {
					core.module.layout.history.last_init_load = filepath + filename;
				}
			}

			var i = self.is_opened(filepath, filename);
			var project_name = filepath.split('/')[1];
			if (filepath[0] !== '/') {
				project_name = filepath.split('/')[0];
			}

			if (i > -1) {
				self.activate(i);
				self.active_window = i;

				if (callback && typeof(callback) === 'function') {
					callback(self.window[i]); // jeongmin: do callback before return
				}

				self.window[i].resize_all();

				return self.window[i];
			} else {
				// 콜백은 add되고 모든 프로세스가 끝난 이후에 실행되어야함

				options.id = new Date().getTime();
				options.index = self.window_count++;
				options.filename = filename;
				self.add(filepath, filename, filetype, editor, options);

				$(core).one(filepath + '/' + filename + '.window_loaded', function(e, __window) { // remove index: no need
					
					if (callback && typeof(callback) === 'function') {
						callback(__window);
					}
				});

				self.window[self.window.length - 1].resize_all();
				return self.window[self.window.length - 1];
			}
		};

		var path = '';
		var url = '';
		var query = {};
		var postdata = {};
		
		
		//useonly(mode=goorm-oss)
		if (filetype == 'bmp' || filetype == 'jpg' || filetype == 'jpeg' || filetype == 'gif' || filetype == 'png' || filetype == 'doc' || filetype == 'docx' || filetype == 'ppt' || filetype == 'pptx' || filetype == 'xls' || filetype == 'xlsx' || filetype == 'avi' || filetype == 'mpg' || filetype == 'mp4' || filetype == 'wmv') {
			query = {
				filepath: filepath,
				filename: filename
			};

			_$.get('file/get_file', query, function() {
				window.open('files/' + filepath + filename);
			});

			if (callback && typeof(callback) === 'function') {
				callback();
			}
		} else {
			if (editor != 'WebView') { // just editor type except WebView(this is temporary file. So difficult to get property)
				////// check if this file is bigger than 10MB. Jeong-Min Im. //////
				postdata = {
					path: filepath + filename
				};

				core._socket.once('/file/get_property', function(data) {
					if (data.err_code === 0) {
						if (data.size >= 10000000) { // 1MB = 1,000,000Bytes, 10MB = 10,000,000Bytes
							var mega_size = Math.round((data.size / 1000000) * 100) / 100; // making megabytes and rounding to 2 decimal places

							alert.show(core.module.localization.msg.alert_file_size_too_big + '<br/>' + filename + ': ' + mega_size + 'MB');
						} else {
							do_open();
						}
					} else if (data.err_code === 20) {
						// file not exists
						alert.show(data.message + ': ' + data.path);

						if (callback && typeof(callback) === 'function') {
							callback(null);
						}
					}
				});

				core._socket.emit('/file/get_property', postdata);
			} else { // no need to check file size
				return do_open();
			}
		}
		
	},
	open_file_already_opened: function(filepath, filename, filetype, editor, __options, callback) {
		var self = this;

		var active_window_index = self.active_window;
		var active_window_target = core.module.layout.workspace.window_manager.window[active_window_index];
		filepath = active_window_target.filepath;
		filename = active_window_target.filename;
		filetype = active_window_target.filetype;

		var options = __options || {};
		var query = {};
		var i;
		var project_name;

		
		
		//useonly(mode=goorm-oss)
		if (filetype == 'jpg' || filetype == 'jpeg' || filetype == 'gif' || filetype == 'png' || filetype == 'doc' || filetype == 'docx' || filetype == 'ppt' || filetype == 'pptx' || filetype == 'xls' || filetype == 'xlsx') {
			query = {
				filepath: filepath,
				filename: filename
			};

			_$.get('file/get_file', query, function() {
				window.open('files/' + filepath + filename);
			});
		} else {
			i = this.is_opened(filepath, filename);
			project_name = filepath.split('/')[1];
			if (filepath[0] != '/') {
				project_name = filepath.split('/')[0];
			}

			this.add(filepath, filename, filetype, editor, options, callback);

			if (this.maximized) {
				this.window[this.window.length - 1].maximize();
			}

			return this.window[this.window.length - 1];
		}
		
	},

	find_by_filename: function(filepath, filename) {
		var result = null;

		$(this.window).each(function() {
			if (this.filepath == filepath && this.filename == filename) {
				result = this;
			}
		});

		return result;
	},

	is_opened: function(filepath, filename) {
		var self = this;
		var window_index = -1;
		var empty_windows = [];

		$(this.window).each(function(i) {
			if (this.filepath === null && this.filename === null) {
				empty_windows.push(i);
			}
		});

		$(empty_windows).each(function() {
			self.window.pop(this);
		});

		$(this.window).each(function(i) {
			var base_path = this.filepath;
			var base_name = this.filename;

			if (this.filetype !== 'url') {
				var index = filepath.indexOf('/');
				var project_name = (index > -1) ? filepath.substring(0, index) : filepath;
				project_name = core.module.project.get_project_path(project_name) + '/';
				filepath = (index > -1) ? project_name + filepath.substring(index + 1) : project_name;
			}

			var target_path = filepath;
			var target_name = filename;

			if (base_path == target_path && base_name == target_name) {
				window_index = i;
			}

		});

		return window_index;
	},

	add: function(filepath, filename, filetype, editor, __options) {
		var self = this;
		var options = __options || {};
		this.active_window = this.index; // jeongmin: no need -> Donguk : need (using eduView)
		if (!options.title) {
			options.title = filepath + filename;
		}

		// if ((this.min_tab_width * (this.tab.length + 1)) > $("#goorm_inner_layout_center").width()) {
		if (core.module.layout.workspace.window_manager.window.length === 10) {
			core.module.toast.show(core.module.localization.msg.alert_too_many_editors, 3000);

		} else {
			this.tab[this.index] = new goorm.core.window.tab();
			options.filepath = filepath;
			this.tab[this.index].init(options);

			this.window[this.index] = new goorm.core.window.panel();
			options.maximized = this.maximized;
			this.window[this.index].init(filepath, filename, filetype, editor, options);

			this.window[this.index].index = this.index;

			this.tab[this.index].connect(this.window[this.index]);
			this.window[this.index].connect(this.tab[this.index]);
			if (options.activated !== false) {
				this.activate(this.index);
			}

			self.tab_resize_window_relocation();
			$('#goorm_inner_layout_center').css('min-width', this.min_tab_width * (this.tab.length));

			////// bind shortcut for selecting window //////
			this.tab_manager.set_event(this.index);
			this.tab[this.index++].set_saved();

		}
	},

	activate: function(index) {
		for (var i = 0; i < this.window.length; i++) {
			this.window[i].activated = false;
		}
		// core.module.layout.workspace.window_manager.active_window = index;	// jeongmin: active_window is updated at panel.activate()
		this.window[index].activate();

		if (this.window[index].type === 'Terminal') {
			this.window[index].panel.click();
		}
	},

	maximize_all: function() {
		$(this.window).each(function() {
			this.maximize();
		});
		this.maximized = true;
	},

	unmaximize_all: function() {
		$(this.window).each(function() {
			if (this.state() === 'maximized') {
				this.restore();
			}
		});
		this.maximized = false;
	},

	previous_window: function() {
		// console.log("---", this.index);
		if (this.active_window > 0) {
			this.activate(this.active_window - 1);
		} else {
			this.activate(this.index - 1);
		}
	},

	next_window: function() {
		if (this.active_window < this.index - 1) {
			this.activate(this.active_window + 1); // jeongmin: - -> +
		} else {
			this.activate(0); // jeongmin: - -> +
		}
	},

	

	save_all: function(callback) {
		for (var i = 0; i < this.window.length; i++) {
			if (this.window[i].alive) {
				if (this.window[i].editor) {
					if (callback) {
						this.window[i].editor.save('refresh', callback);
					} else {
						this.window[i].editor.save();
					}
				}

				this.window[i].set_saved();
				this.tab[i].set_saved();
			}
		}
	},

	cascade: function() {
		var workspace_width = $('#workspace').width();
		var workspace_height = $('#workspace').height();

		var alive_windows = this.get_alive_window();
		var length = alive_windows.length;

		var target_window = null;

		var left = 4;
		var top = 4;

		if ((left + (length * 24) + 350) > workspace_width) {
			//show dailog "too many"
		}

		for (var i = 0; i < length; i++) {
			target_window = alive_windows[i];

			if (target_window && target_window.alive) {
				if (target_window.state() == 'maximized') {
					target_window.restore();
				}

				// var width = 350;
				var height = 250;

				if (top + height > workspace_height) {
					top = 4;
				}

				// window jquery container
				//
				$(target_window.panel).dialog({
					width: 350,
					height: 250
				});

				target_window.move(top, left);
				target_window.bind_width(350);
				target_window.bind_height(250);
				target_window.refresh();

				// $(document).trigger(target_window.filename + '_resized');
			}
			left = left + 24;
			top = top + 24;

			this.activate(target_window.index);
		}

		this.maximized = false;

		//$(".tab_max_buttons").hide();
	},

	tile_vertically: function() {
		var workspace_width = $('#workspace').width();
		var workspace_height = $('#workspace').height();

		var alive_windows = this.get_alive_window();
		var length = alive_windows.length;

		var each_width = Math.floor((workspace_width - 8) / length);
		var each_height = workspace_height - 8;

		if (each_width < 150) {
			// show dialog "too many"
			//each_width = 150;
		}

		if (each_height < 200) {
			each_height = 200;
		}

		var target_window = null;
		for (var i = 0; i < length; i++) {
			target_window = alive_windows[i];

			if (target_window.alive) {
				if (target_window.state() == 'maximized') {
					target_window.restore();
				}

				var left = 4 + (each_width * i);
				var top = 4;

				// window jquery container
				//
				target_window.move(top, left);
				target_window.bind_width(each_width);
				target_window.bind_height(each_height);
				target_window.refresh(); // for terminal resizing
				if (target_window.type == 'Editor') {
					target_window.editor.editor.refresh();
					target_window.editor.refresh();
				}
			}
		}

		this.maximized = false;
	},

	tile_horizontally: function() {
		var workspace_width = $('#workspace').width();
		var workspace_height = $('#workspace').height();

		var alive_windows = this.get_alive_window();
		var length = alive_windows.length;

		var each_width = workspace_width - 8;
		var each_height = Math.floor((workspace_height - 8) / length);

		if (each_width < 300) {
			//each_width = 300;
		}

		if (each_height < 150) {
			// show dialog "too many"
			//each_height = 200;
		}

		var target_window = null;

		for (var i = 0; i < length; i++) {
			target_window = alive_windows[i];

			if (target_window.alive) {
				if (target_window.state() == 'maximized') {
					target_window.restore();
				}

				var left = 4;
				var top = 4 + (each_height * i);

				target_window.move(top, left);
				target_window.bind_width(each_width);
				target_window.bind_height(each_height);
				target_window.refresh();
				if (target_window.type == 'Editor') {
					target_window.editor.editor.refresh();
					target_window.editor.refresh();
				}
			}
		}

		this.maximized = false;
	},

	tile_left: function() {
		var each_width = Math.floor(($('#workspace').width()) / 2);
		var each_height = $('#workspace').height();

		if (each_width <= 200) {
			//each_width = 450;
		}

		if (each_height <= 250) {
			//each_height = 300;
		}
		var window_manager = core.module.layout.workspace.window_manager;
		var target_window = this.window[window_manager.active_window];

		if (target_window.alive) {
			if (target_window.state() == 'minimized') {
				return;
			}

			if (target_window.state() == 'maximized') {
				target_window.restore();
				this.maximized = false;
			}

			var left = 0;
			var top = 0;

			target_window.move(top, left);
			target_window.bind_width(each_width);
			target_window.bind_height(each_height);
			target_window.refresh();

			// $(document).trigger(this.window[window_manager.active_window].filename + '_resized');
			this.activate(window_manager.active_window);
		}

		//$(".tab_max_buttons").hide();
	},
	tile_right: function() {
		var each_width = Math.floor(($('#workspace').width()) / 2);
		var each_height = $('#workspace').height();

		if (each_width <= 200) {
			//each_width = 450;
		}

		if (each_height <= 250) {
			//each_height = 300;
		}
		var window_manager = core.module.layout.workspace.window_manager;
		var target_window = this.window[window_manager.active_window];

		if (target_window.alive) {
			if (target_window.state() == 'minimized') {
				return;
			}

			if (target_window.state() == 'maximized') {
				target_window.restore();
				this.maximized = false;
			}

			var left = 0 + each_width;
			var top = 0;

			target_window.move(top, left);
			target_window.bind_width(each_width);
			target_window.bind_height(each_height);
			target_window.refresh();

			// $(document).trigger(this.window[window_manager.active_window].filename + '_resized');
			this.activate(window_manager.active_window);
		}

		//this.maximized = false;
		//$(".tab_max_buttons").hide();
	},

	get_alive_window: function() {
		var windows = [];

		for (var i = 0; i < this.index; i++) {
			if (this.window[i].alive) {
				if (this.window[i].state() == 'minimized') {
					continue;
				}

				windows.push(this.window[i]);
			}
		}

		return windows;
	},

	delete_window_in_tab: function(target_index) {
		if (this.tab && this.tab[target_index]) {
			this.tab.splice(target_index, 1);
		}
	},

	decrement_index_in_window: function(close_index) {
		var length = this.window.length;

		for (var i = close_index + 1; i < length; i++) {
			// var new_index = parseInt(i, 10) - 1;

			// var new_container = "window" + new_index;
			// var new_container_c = "filewindow" + new_index + "_c";
			// var new_container_h = "filewindow" + new_index + "_h";

			// this.window[i].panel.dd.id = new_container_c;
			// this.window[i].panel.dd.dragElId = new_container_c;
			// this.window[i].panel.dd.handleElId = new_container_h;

			// this.workspace.find("#window" + i).parent().attr("id", new_container_c);
			// $("#" + workspace_container).find("#filewindow" + i).find("#filewindow" + i + "_h").attr("id", new_container_h);
			// this.workspace.find("#window" + i).attr("id", new_container);

			// this.window[i].container = new_container;
			this.window[i].index--;
		}
	},

	refresh_all: function() {
		for (var i = this.window.length - 1; i >= 0; i--) {
			var w = this.window[i];

			w.refresh();
		}
	},

	resize_all: function() {
		for (var i = this.window.length - 1; i >= 0; i--) {
			var w = this.window[i];
			w.resize_all();
		}

		//prevent workspace rolled-up --heeje
		if (!$('#workspace').hasClass('use-scroll')) {
			$('#workspace').scrollTop(0);
		}
	},

	close_all: function() {
		var self = this;
		var modified = [];
		var not_modifed = [];
		var msg = '';
		$(this.window).each(function() {
			if (!this.is_saved) {
				modified.push(this);
				msg = msg + '"' + this.filename + '",';
			} else {
				not_modifed.push(this);
			}
		});

		if (msg.length > 0) {
			msg = msg.slice(0, -1);
		}

		if (modified.length > 0) {
			confirmation_save.init({
				message: msg + ' ' + core.module.localization.msg.confirmation_save_message,
				yes_text: core.module.localization.msg.yes,
				cancel_text: core.module.localization.msg.confirmation_cancel,
				no_text: core.module.localization.msg.no,
				title: 'Close...',

				yes: function() {
					$(modified).each(function() {
						this.editor.save('close');
					});
					$(not_modifed).each(function() {
						this.close();
						this.tab.close();
					});
				},
				cancel: function() {},
				no: function() {
					$(modified).each(function() {
						this.is_saved = true;
						this.tab.is_saved = true;
					});
					self.close_all();
				}

			});
			confirmation_save.show();

		} else {
			for (var i = this.window.length - 1; i >= 0; i--) {
				var w = this.window[i];

				w.close();
				w.tab.close();
			}

			// when clicking file all close, all editor panel remove.
			// $(this.window).each(function (i) {
			// 	this.close();
			// 	this.tab.close();
			// });
			this.index = 0;
			this.active_window = -1;

			this.window.remove(0, this.window.length - 1);
		}
	},

	close_others: function() {
		var self = this;
		var modified = [];
		var not_modifed = [];
		var msg = '';
		var clicked_windows = core.module.layout.workspace.window_manager.tab_manager.clicked_window;
		var clicked_title = clicked_windows.title;

		$(this.window).each(function() {
			if (this.title != clicked_title) {
				if (!this.is_saved) {
					modified.push(this);
					msg = msg + '"' + this.filename + '",';
				} else {
					not_modifed.push(this);
				}
			}
		});

		if (msg.length > 0) {
			msg = msg.slice(0, -1);
		}
		if (modified.length > 0) {
			confirmation_save.init({
				message: msg + ' ' + core.module.localization.msg.confirmation_save_message,
				yes_text: core.module.localization.msg.yes,
				cancel_text: core.module.localization.msg.confirmation_cancel,
				no_text: core.module.localization.msg.no,
				title: 'Close...',

				yes: function() {
					$(modified).each(function() {
						this.editor.save('close');
					});
					$(not_modifed).each(function() {

						$('#' + this.tab.tab_list_id + ' .tab_close_button').click();

					});
				},
				cancel: function() {},
				no: function() {
					$(modified).each(function() {
						this.is_saved = true;
						this.tab.is_saved = true;
					});
					self.close_others();
				}

			});
			confirmation_save.show();

		} else {
			for (var i = this.window.length - 1; i >= 0; i--) {
				var w = this.window[i];
				if (w.title != clicked_title) {
					$('#' + w.tab.tab_list_id + ' .tab_close_button').click();
				}
			}
		}
	},

	get_window: function(filepath, filename) {
		var __window = null;

		if (this.window && this.window.length > 0) {
			this.window.forEach(function(e) {
				if ((e.filepath == filepath || e.filepath + '/' == filepath || e.filepath == filepath + '/') && e.filename == filename) {
					__window = e;
				}
			});
		}

		return __window;
	},

	check_file_list: function(temp_window_list, callback) {
		function get_list_cb(project_data) {
			if (!temp_window_list) {
				temp_window_list = [];
			}

			var files = temp_window_list.filter(function(o) {
				for (var i = 0; i < project_data.length; i++) {
					if (project_data[i].name === o.project) {
						return true;
					}
				}

				return false;
			});

			localStorage.workspace_window = JSON.stringify(files);
			callback(files);
		}

		
		//useonly(mode=goorm-oss)
		core.socket.once('/project/get_list/owner', get_list_cb);
		core.socket.emit('/project/get_list', {
			'get_list_type': 'owner_list'
		});
		
	},

	tab_manager: {
		tab_key: 'Ctrl+',
		shortcut_handler: [],

		init: function(parent) {
			this.parent = parent;

			var container = parent.workspace_container + '_window_list';
			var ul = $('#' + container + ' ul');

			ul.attr('id', container + '_container');
		},

		get_by_tab_id: function(id) {
			var window_manager = core.module.layout.workspace.window_manager;
			var __tab = null;

			for (var i = 0; i < window_manager.tab.length; i++) {
				var tab = window_manager.tab[i];

				if (id == tab.tab_list_id) { //jeongmin: tab_id -> tab_list_id
					__tab = tab;
					break;
				}
			}

			return __tab;
		},

		get_index_by_tab_id: function(id) {
			var window_manager = core.module.layout.workspace.window_manager;
			var index = -1;

			for (var i = 0; i < window_manager.tab.length; i++) {
				var tab = window_manager.tab[i];

				if (id == tab.tab_list_id) { //jeongmin: tab_id -> tab_list_id
					index = i;
					break;
				}
			}

			return index;
		},

		sort: function(mode) {
			var self = this;

			var parent = this.parent;

			var window_sort = function() {
				var container = parent.workspace_container + '_window_list' + '_container';
				var window_tab_list = $('#' + container + ' li');
				var new_tab_list = [];
				var new_window_list = [];

				var sync_window_container = function(new_index, window) {
					var old_index = window.index;
					var new_container = 'window' + new_index;
					// var new_container_c = "filewindow" + new_index + "_c";
					// var new_container_h = "filewindow" + new_index + "_h";

					window.index = new_index;
					window.container = new_container;
					// window.panel.dd.id = new_container_c;
					// window.panel.dd.dragElId = new_container_c;
					// window.panel.dd.handleElId = new_container_h;

					// $("#" + parent.workspace_container).find("#window" + old_index).find("#window" + old_index + "_h").attr("id", new_container_h);
					$('#' + parent.workspace_container).find('#window' + old_index).parent().attr('id', new_container_c);

					return window;
				};
				var i = 0;
				for (i = 0; i < window_tab_list.length; i++) {
					var window_tab = window_tab_list[i];
					var window_tab_id = $(window_tab).attr('id');

					var tab_object = self.get_by_tab_id(window_tab_id);
					if (tab_object) {
						tab_object.window = sync_window_container(i, tab_object.window);
						tab_object.tab_count = window_tab_list.length;
						tab_object.container = tab_object.window.container;

						new_tab_list.push(tab_object);
						new_window_list.push(tab_object.window);
					}
				}

				for (i = 0; i < new_window_list.length; i++) {
					// var index = target_window.index;

					// $("#" + parent.workspace_container).find("#filewindow" + index + '_h').parent().attr("id", 'filewindow' + index);
				}

				core.module.layout.workspace.window_manager.tab = new_tab_list;
				core.module.layout.workspace.window_manager.window = new_window_list;

				var active_window = self.get_index_by_tab_id($('#workspace_window_list_container .selected').attr('id'));
				core.module.layout.workspace.window_manager.active_window = active_window;

				if (new_tab_list.length > 1) {
					new_tab_list[new_tab_list.length - 1].resize();
				}
			};

			switch (mode) {
				case 'window':
					window_sort();
					break;

				default:
					break;
			}
		},

		// set shortcut for selecting window. Jeong-Min Im.
		set_event: function(index) {
			var sm = core.module.shortcut_manager;
			var os = sm.getOStype();

			var action = 'toggle_center_tab_' + index;
			var key = ((os === 'mac') ? this.tab_key.replace(/Ctrl/g, 'meta') : this.tab_key) + (index + 1);

			// Bind Event
			//
			sm.bind(action, key, function(e) {
				var num = e.keyCode - 49;

				$('#' + core.module.layout.workspace.window_manager.tab[num].tab_list_id).click();

				return false;
			});
		},

		// off shortcut for selecting window. Jeong-Min Im.
		off_event: function() {
			var _tab = core.module.layout.workspace.window_manager.tab; // tab list

			var action = 'toggle_center_tab_' + (_tab.length - 1);
			var key = this.tab_key + _tab.length;

			core.module.shortcut_manager.unbind(action, key);
		}
	},

	refresh_all_title: function(current_project_path) {
		var self = this;

		$.each(core.status.current_opened_list, function(index, value) {
			self.refresh_title(current_project_path, index, value);
		});
	},

	// set tab/window title as current project. Jeong-Min Im.
	// current_project_path (String)
	// file_name (String) : window name
	refresh_title: function(current_project_path, file_name, cnt) {
		if (cnt > 0) { // Donguk Kim : File Name Duplication Check & File Path Adding
			var temp = $('#g_window_tab_list').find('.tab_title[filename="' + file_name + '"]');

			if (temp) {
				if (cnt == 1) {
					var file_path = temp.attr('filepath');
					var path = file_path.split('/')[0];
					var title = file_name;

					if (/(^http:\/\/|^https:\/\/)/.test(file_path)) { // url
						temp.html(title);
						$('.ui-dialog').find('[path="' + file_path + file_name + '"]').parent().find('.ui-dialog-title').html(title);
					} else if (file_path && path) { // merge window does not have filepath
						if (typeof current_project_path == 'string' && path != current_project_path) {
							title += ' - ' + file_path.split(core.user.id + '_').pop();
						}

						temp.html(title);
						$('.ui-dialog').find('[path="' + file_path + file_name + '"]').parent().find('.ui-dialog-title').html(title);
					}

				} else if (cnt > 1) {
					temp.each(function() {
						var path = $(this).attr('filepath');
						var title = file_name + ' - ' + path.split(core.user.id + '_').pop();

						$(this).html(title);
						$('.ui-dialog').find('[path="' + path + file_name + '"]').parent().find('.ui-dialog-title').html(title);
					});
				}
			}
		}
	},

	close_by_title: function(target_title) {
		var window_list = this.window;
		var tab_list = this.tab;

		//get idx by target_title
		var tab_target_idx = -1;
		var i = 0;
		for (i = 0; i < tab_list.length; i++) {
			if (tab_list[i].title == target_title || tab_list[i].title == '/' + target_title || '/' + window_list[i].title == target_title) {
				tab_target_idx = i;
				break;
			}
		}
		var window_target_idx = -1;
		for (i = 0; i < window_list.length; i++) {
			if (window_list[i].title == target_title || window_list[i].title == '/' + target_title || '/' + window_list[i].title == target_title) {
				window_target_idx = i;
				break;
			}
		}

		//here target_idx is determine
		this.close_by_index(window_target_idx, tab_target_idx);
	},

	close_by_index: function(window_target_idx, tab_target_idx) {
		var self = this;

		if (~window_target_idx && ~tab_target_idx && this.window[window_target_idx]) {
			var target_window = this.window[window_target_idx];

			if (target_window.is_saved) {
				//tab_list[tab_target_idx].is_saved=true;
				this.tab[tab_target_idx].close();
				//target_window.is_saved=true;
				target_window.close();
			} else {
				confirmation_save.init({
					message: '"' + target_window.filename + '" ' + core.module.localization.msg.confirmation_save_message,
					yes_text: core.module.localization.msg.yes,
					cancel_text: core.module.localization.msg.confirmation_cancel,
					no_text: core.module.localization.msg.no,
					title: 'Close...',

					yes: function() {
						target_window.editor.save('close');
					},
					cancel: function() {},
					no: function() {
						// target_window.is_saved = true;
						target_window.close();
						// tab_list[tab_target_idx].is_saved = true;
						self.tab[tab_target_idx].close();
						// self.close_by_title(target_window.title);	// hidden: no need -> just close!
					}
				});

				confirmation_save.show();
			}
		}
	},

	tab_resize_window_relocation: function() {
		var self = this;

		var workspace_top = $('#g_window_tab_list').offset().top;
		workspace_top += $('#g_window_tab_list').outerHeight();
		// var workspace_left = $(this.workspace).offset().left;

		var workspace_height = parseInt($(this.workspace).css('height'), 10);
		var workspace_width = parseInt($(this.workspace).css('width'), 10);

		// 						var is_maxmized = this.maximized;

		$(this.window).each(function() {
			// move window when workspace too small
			// window relocation
			// 							if (is_maxmized) {
			// this.move(workspace_top + (20*i), workspace_left + (20*i));
			// 								var top = workspace_top + (20 * i);
			// 								var left = workspace_left + (20 * i);

			// 								$(this.panel).parent().css('top', workspace_top, 'left', workspace_left);

			// 								this.top = top;
			// 								this.left = left;
			// 							} else {
			if (workspace_height < (this.top + this.height)) {
				if (workspace_height > this.height) {
					this.move((workspace_height - (this.height + 12)), this.left);
				} else {
					this.move(0, this.left); //if this make bug, then call to chw
					self.maximize_all();
				}
			}
			if (workspace_width < (this.left + this.width)) {
				if (workspace_width > this.width) {
					this.move(this.top, (workspace_width - (this.width + 12)));
				} else {
					this.move(this.top, 0); //if this make bug, then call to chw
					self.maximize_all();
				}
			}
			// 							}

			// tab resize
			this.tab.resize();
			$('#goorm_inner_layout_center').scrollTop(0);
		});
	},

	all_clear: function() { // Error Manager Clear
		if (this.window && this.window.length > 0) {
			for (var i = 0; i < this.window.length; i++) {
				if (this.window[i].editor) {
					this.window[i].editor.error_manager.clear();
				}
			}
		}
	},

	get_project_windows: function() {
		if (this.window && this.window.length > 0) {
			var project = core.status.current_project_path;
			var list = [];
			for (var i = 0; i < this.window.length; i++) {
				var w = this.window[i];
				if (w.project === project) {
					list.push(w);
				}
			}
			return list;
		} else {
			return [];
		}
	}

};
