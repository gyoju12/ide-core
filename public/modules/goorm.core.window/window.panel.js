/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.window.panel = function() {
	this.panel = null;
	this.resize = null;
	this.context_menu = null;
	this.workspace = null;
	this.tab = null;
	this.editor = null;
	this.terminal = null;
	this.title = null;
	this.type = null;
	this.status = null;
	this.filepath = null;
	this.filename = null;
	this.filetype = null;
	this.left = null;
	this.top = null;
	this.width = null;
	this.height = null;
	this.zindex = 2;
	this.alive = null;
	this.is_first_maximize = null;
	this.is_saved = null;
	this.project = null;
	this.history_window = {};
	this.index = 0;
	// this.storage = "goormIDE_Storage";	// hidden: storage is deprecated
	this.searching = false; // jeongmin: default should be false
	this.undo_depth = 0; // to remember undo. remove '*' sign when save and modify.
	this.done = null;
	this.options = null;
	this.id = null;

	this.history_edit = {
		undo: 0,
		redo: 0,
		undone: 0
	};
};

goorm.core.window.panel.prototype = {
	init: function(filepath, filename, filetype, editor, options) {
		var self = this;
		options = options || {};
		options.parent = this;
		this.options = options;

		this.is_loaded = false;
		this.is_saved = true;

		this.undo_depth = 0;
		this.done = [];

		this.titlebar = {}; // ui-dialog-titlebar

		// this.container = container;
		this.workspace = $('#workspace');

		if (filetype === '' || filetype == 'etc') {
			filetype = 'txt';
		} else if (filetype == 'merge') {
			core.module.layout.outline.clear();
		}

		////////////////////////
		// if (options.storage) {	// hidden: storage is deprecated
		// 	this.storage = options.storage;
		// }
		////////////////////////

		this.filepath = filepath;
		this.filename = filename;
		this.filetype = filetype;

		for (var i = 0; i < core.filetypes.length; i++) {
			if (filetype == core.filetypes[i].file_extension) {
				editor = core.filetypes[i].editor;
				break;
			}
		}

		if (!editor) {
			editor = 'Editor';
		}

		var project = core.status.current_project_path;
		if (filepath && typeof(filepath) === 'string') {
			if (filepath.split('/')[0] === '') {
				project = filepath.split('/')[1];
			} else {
				project = filepath.split('/')[0];
			}
		}

		this.project = project;

		this.alive = true;
		this.is_first_maximize = true;

		var window_manager = core.module.layout.workspace.window_manager;
		var target_active_window = window_manager.active_window;

		// var workspace_offset = $('#workspace').offset();

		var x = 5;
		var y = 10;

		//var previous_window = window_manager.window[target_active_window];

		// var previous_window = window_manager.window[window_manager.window.length - 1];

		var flag = 1;
		var cnt = 0;
		if (options.left !== undefined) {
			x = options.left;
			// } else if (target_active_window > -1 && options.maximized === false) {
		} else if (target_active_window > -1) {

			//		var previous_window = window_manager.window[target_active_window].panel;

			//		x = previous_window.parent().offset().left - workspace_offset.left + 30;
			//		y = previous_window.parent().offset().top - workspace_offset.top + 30;
			var temp_x = x;
			while (flag) {
				flag = 0;
				cnt++;
				$.each(window_manager.window, function(index, value) {
					if (value.left == temp_x) {
						flag = 1;
						return false;
					}
				});
				if (flag) {
					temp_x += 20;
				}
				if (cnt > window_manager.window.length) {
					break;
				}
			}
			x = temp_x;
			if (options.maximized === true) {
				x = 0;
			}

			// 	//x = previous_window.left;
			// 	x=temp_x;
			// else
			// 	//x = previous_window.left + 20;
			// 	x=temp_x+20;
		}

		flag = 1;
		cnt = 0;
		if (options.top !== undefined) {
			y = options.top;
		} else if (target_active_window > -1) {
			// } else if (target_active_window > -1 && options.maximized === false) {

			//		var previous_window = window_manager.window[target_active_window].panel;

			//		x = previous_window.parent().offset().left - workspace_offset.left + 30;
			//		y = previous_window.parent().offset().top - workspace_offset.top + 30;
			var temp_y = y;
			while (flag) {
				flag = 0;
				cnt++;
				$.each(window_manager.window, function(index, value) {
					if (value.top == temp_y) {
						flag = 1;
						return false;
					}
				});
				if (flag) {
					temp_y += 20;
				}
				if (cnt > window_manager.window.length) {
					break;
				}
			}
			y = temp_y;
			if (options.maximized === true) {
				y = 0;
			}
			// 	//y = previous_window.top;
			// 	y=temp_y;
			// else
			// 	//y = previous_window.top + 20;
			// 	y=temp_y+20;
		}

		this.left = x;
		this.top = y;

		if (options.width !== undefined) {
			this.width = options.width;
		} else {
			this.width = 350;
		}

		if (options.height !== undefined) {
			this.height = options.height;
		} else {
			this.height = 250;
		}

		if (options.is_draggable !== undefined) {
			this.is_draggable = options.is_draggable;
		} else {
			this.is_draggable = true;
		}

		this.status = 'normal';
		//////////////////////////////////////////////////////////////////////////////////////////////////////////////
		//this.width = parseInt(this.workspace.width() / 1.3, 10);
		//this.height = parseInt(this.workspace.height() / 1.5, 10);
		//////////////////////////////////////////////////////////////////////////////////////////////////////////////
		this.zindex = this.zindex + core.module.layout.workspace.window_manager.window.length - 1;

		//bootstrap start
		if (this.filetype == 'url') {
			this.title = this.filepath;
		}
		
		//useonly(mode=goorm-oss)
		else if ((this.filename == 'debug' && editor == 'Terminal')) {
			this.title = this.filename;
		}
		
		else {
			this.title = this.filepath + this.filename;
		}

		// var morphed_title = this.title.split("/").join("_").split(".").join("_").split(':').join('_');
		// var morphed_title = new Date().getTime();
		var morphed_title = options.id;

		if (editor == 'Editor') {
			this.panel = $('<div id="g_window_' + morphed_title + '" title="' + options.filename + '" path="' + this.title + '"><textarea class="code_editor" placeholder="Code goes here...">Loading Data...</textarea></div>'); // jeongmin: add placeholder
			core.module.localization.apply({
				'placeholder_editor': {
					'value': core.module.localization.msg.placeholder_editor
				}
			}); // jeongmin: placeholder localization
		}
		
		//useonly(mode=goorm-oss)
		else if (this.filename == 'debug' && editor == 'Terminal') {
			this.panel = $('<div id="g_window_' + morphed_title + '" title="' + this.title + '"></div>');
			$(this.panel).on('mousedown', $.throttle(function() {
				self.activate();
			}, 200));
		}
		
		else if (editor == 'WebView') {
			this.panel = $('<div id="g_window_' + morphed_title + '" title="' + this.title + '"></div>');
		} else if (editor == 'Custom') {
			this.panel = $('<div id="g_window_' + morphed_title + '" title="' + this.title + '"></div>');
		}

		this.workspace.append(this.panel);
		var on_panel_create = function() {
			var mode;

			// if (self.storage == "goormIDE_Storage") {	// hidden: storage is deprecated
			if (editor == 'Editor') {

				self.type = 'Editor';

				
				//useonly(mode=goorm-oss)
				mode = core.filetypes[self.inArray(self.filetype)].mode;
				
				self.panel.dialog('option', 'title', title);

				self.editor = new goorm.core.edit();
				//bootstrap start
				self.editor.init('#g_window_' + morphed_title, self.title, self.filepath, options);
				//bootstrap end
				//
				self.editor.load(self.filepath, self.filename, self.filetype, options);
				self.editor.set_mode(mode);

			}
			
			//useonly(mode=goorm-oss)
			else if (this.filename == 'debug' && editor == 'Terminal') {
				self.type = 'Terminal';
				// self.title = 'debug';

				self.terminal = new goorm.core.terminal();

				self.terminal.init($('#g_window_' + morphed_title), self.filename, true);

				self.panel.parent().height(parseInt(self.panel.parent().height(), 10));

				// $("#g_window_" + morphed_title).css("overflow", "auto");

				// self.panel.setFooter("");
			}
			
			else if (editor == 'WebView') {
				self.type = 'WebView';
				var title = (options.title) ? options.title : self.title;

				

				var iframe = $('<iframe src="' + self.filepath + '/' + self.filename + '" style="width:100%;height:100%;border:0;background:white">');
				$(self.panel).css('overflow', 'hidden').html(iframe);
				// .end().find('.ui-dialog-title').text('[Web view] '+title);
				self.panel.dialog('option', 'title', '[Web view] ' + title);

				// iframe cannot bind onclick event
				iframe.on('load', function() {
					$(this).contents().find('body').on('click', function() {
						self.panel.mousedown();
					}).on('keydown keypress keyup', function(e) {
						var evt = $.Event(e.type);
						evt.which = e.which;
						evt.keyCode = e.keyCode;
						evt.ctrlKey = e.ctrlKey;
						evt.metaKey = e.metaKey;
						evt.altKey = e.altKey;
						evt.shiftKey = e.shiftKey;

						$(document).trigger(evt);

						////// jeongmin: prevent occurring multiple events //////
						var shortcut_manager = core.module.shortcut_manager;
						var key_string = shortcut_manager.make_shortcut_input(e); // key -> string (e.g. ctrl+s), because 'shortcuts' is string array
						if (shortcut_manager.shortcuts.indexOf(key_string) > -1 || shortcut_manager.fixed_shortcut.indexOf(key_string) > -1) { // there is shortcut! So, manually triggered event will do something
							e.stopPropagation(); // and we don't have to propagate original key event
							e.preventDefault();
						}
					}).on('mousemove mouseup', function(e) { // not resized properly when heading to inside by drag. we have to send correct pageX, Y positions to outside.
						e.pageX += self.panel.parent().offset().left;
						e.pageY += self.panel.parent().offset().top;

						$(document).trigger(e);
					});
				});

				// self.panel.setFooter('Web view is running');
			} else if (editor == 'Custom') {
				//for Custom Window
				self.plug();

			} else if (self.inArray(self.filetype) > -1) {
				self.type = core.filetypes[self.inArray(self.filetype)].editor;

				if (self.type == 'Editor') {
					mode = core.filetypes[self.inArray(self.filetype)].mode;
					self.editor = new goorm.core.edit(this);
					self.editor.init(self.panel.find('.window_container'), null, self.filepath);
					self.editor.load(self.filepath, self.filename, self.filetype, options);
					self.editor.set_mode(mode);

				}
			} else { // default txt
				mode = 'text/javascript';

				self.editor = new goorm.core.edit(this);
				// self.editor.init(self.panel.find(".window_container"), null, self.filepath);
				// self.editor.init("#g_window_"+timestamp, null, self.filepath);
				// self.editor.load(self.filepath, self.filename, self.filetype, options);

				self.editor.init(self.panel.find('.window_container'));
				self.editor.load(self.filepath, self.filename, 'txt', options);

				self.editor.set_mode(mode);
			}
			self.set_footer(); //native function to call the self.panel.setFooter();

			self.titlebar = self.panel.siblings(); // ui-dialog-titlebar

		};

		//need callback or event-drived approach
		var panel = $(this.panel);
		panel.dialog({
			closeOnEscape: false,
			modal: false,
			width: this.width,
			height: this.height,
			position: [this.left, this.top],
			focus: function() {
				if (options.activated !== false) { // jeongmin: only if this window was activated
					self.activate();
				}
			},
			create: function() {
				// $(core).trigger("panel_create" + self.index);	// jeongmin: move to open function for sync
			},
			open: function(event) {
				var dlg = $(event.target).parent();

				if (options.container !== undefined) {
					dlg.draggable('option', 'containment', options.container).appendTo(options.container);
					// $(panel).dialog({position:[options.top, options.left]});
				} else {
					dlg.draggable('option', 'containment', self.workspace).appendTo(self.workspace);
				}
				on_panel_create();

				// when all editor panels are closed, hide bottom status bar(line, col)
				if ($.grep(window_manager.window, function(n) {
						return n.editor !== null;
					}).length > 0) {
					$('#goorm_bottom nav ol:nth-child(3)').show();
				}
				var menu_undo = $('.menu-undo[action=do_undo]').parent();
				var menu_redo = $('.menu-redo[action=do_redo]').parent();
				var button_redo = $('button[action=do_redo]');
				var button_undo = $('button[action=do_undo]');
				button_undo.addClass('disabled');
				button_redo.addClass('disabled');
				menu_redo.addClass('disabled');
				menu_undo.addClass('disabled');
				$('<div class="disconnected"><i class="fa fa-frown-o fa-5x"></i><br />DISCONNECTED! <br /> goorm is trying to reconnect the server...<br />But we recommend you to relaunch goorm.</div>').appendTo(self.panel.parent()).hide();
				self.is_loaded = true;

				self.history_edit.undo = 0;
				self.history_edit.redo = 0;
				self.history_edit.undone = 0;
			},
			beforeClose: function() {
				if (self.is_saved) {
					return true;
				} else {
					confirmation_save.init({
						message: '\"' + self.filename + '\" ' + core.module.localization.msg.confirmation_save_message,
						yes_text: core.module.localization.msg.yes,
						cancel_text: core.module.localization.msg.confirmation_cancel,
						no_text: core.module.localization.msg.no,
						title: 'Close...',

						//if editor, it should be off from ot-server --heeje
						yes: function() {
							if (self.editor) { // jeongmin: prevent resizing error (for terminal or merge window)
								
								self.editor.save('close');
							}
							
						},
						cancel: function() {},
						no: function() {
							
							self.is_saved = true;
							self.tab.is_saved = true;
							var menu_undo = $('.menu-undo[action=do_undo]').parent();
							var menu_redo = $('.menu-redo[action=do_redo]').parent();
							var button_redo = $('button[action=do_redo]');
							var button_undo = $('button[action=do_undo]');
							button_undo.addClass('disabled');
							button_redo.addClass('disabled');
							menu_redo.addClass('disabled');
							menu_undo.addClass('disabled');
							window_manager.close_by_title(self.title);
						}
					});
					confirmation_save.show();
					return false;
				}
			},
			close: function() {
				//to prevent multiple event calling on debug window closing --heeje
				// console.log(self.filename);
				if (self.filename == 'debug') {
					core.module.layout.debug.debug_terminate();
				} else {

					if (self.type == 'Editor') {
						$('#editor_status').hide();
						$('#lint_summury').hide();
					}

					//if editor, it should be off from ot-server --heeje
					
					self.tab.close();
					self.close();
				}
			},

			resizeStart: function() {},
			resize: $.throttle(function() {
				self.resize_all();
			}, 200),
			resizeStop: function() {
				self.resize_all();
			},
			dragStop: function() {
				var dlg_content_position = $(event.target).parent().position();

				if (parseInt(self.panel.offsetParent().css('top'), 10) < 0) {
					self.panel.offsetParent().css('top', 0);
				}

				self.top = dlg_content_position.top;
				self.left = dlg_content_position.left;
			}
		}).dialogExtend({
			dblclick: 'maximize',
			maximizable: true,
			minimizable: true,
			//collapsable : true,
			//closable: true,
			minimizeLocation: 'left',
			maximize: function() {
				// if one window panel is maximize, all panel are maximized
				// 					var left = parseInt($("#goorm_inner_layout_center").offset().left, 10);
				// 					var top = parseInt($("#goorm_inner_layout_center").offset().top, 10) + 30;

				panel.dialog('widget').addClass('ui-dialog-maximize');

				window_manager.maximized = true;

				// 				$('[action=show_all_windows]').parent().addClass('disabled');	// we want to hide/show all windows even if windows are maximized
				// 				$('[action=hide_all_windows]').parent().addClass('disabled');
				$('[action=show_hide_window]').parent().addClass('disabled');

				self.panel.dialog('option', 'width', self.workspace.width()).dialog('option', 'height', self.workspace.height() - 1); //.dialog('option', 'position', [1, 1]);
				self.panel.parent().css('left', '0px');
				self.panel.parent().css('top', '0px');

				if (self.tab) {
					self.tab.maximize();
				}
				self.status = 'maximized';
				self.resize_all();

				var idx = (self.index + 1) % window_manager.window.length;
				var __window = window_manager.window[idx];

				if (__window.state() === 'minimized') {
					__window.restore();
				}
				if (__window.state() !== 'maximized') {
					__window.maximize();
					if (__window.tab) { // jeongmin: when window is added(newly opened), window.tab is null. Because they aren't connected yet. So, maximize tab directly by index.
						__window.tab.maximize();
					}
				}
				// for (var i = 0; i < window_manager.window.length; i++) {
				// 	if (window_manager.window[i].state() === "minimized")
				// 		window_manager.window[i].restore();

				// 	if (window_manager.window[i].state() !== "maximized") {
				// 		window_manager.window[i].maximize();
				// 	}
				// }

			},
			minimize: function() {
				self.status = 'minimized';

				if (self.tab) {
					self.tab.minimize();
				}
			},
			// when restore dialog, set drag and resize containment.
			_restore_maximized: function(evt) {
				$(evt.target).parent().draggable('option', 'containment', self.workspace);
				$(evt.target).parent().resizable('option', 'containment', self.workspace);
				panel.dialog('widget').removeClass('ui-dialog-maximize');
				$('[action=show_all_windows]').parent().removeClass('disabled');
				$('[action=hide_all_windows]').parent().removeClass('disabled');
				$('[action=show_hide_window]').parent().removeClass('disabled');

				window_manager.maximized = false;
				self.status = 'normal';

				self.tab.restore();

				// console.log("_restore_maximized : " + self.panel.parent().css("top"));

				// self.panel.trigger(self.filename + "_resized"); // jeongmin: document -> panel

				if (self.editor) { // jeongmin: prevent resizing error (for terminal or merge window)
					self.editor.refresh();
				} else if (self.terminal) {
					self.terminal.resize();
				} else if (self.merge) {
					core.module.merge.refresh(self.filename);
				}
			},
			_restore_minimized: function(evt) {
				$(evt.target).parent().draggable('option', 'containment', self.workspace);
				$(evt.target).parent().resizable('option', 'containment', self.workspace);

				self.status = 'normal';

				self.tab.restore();

				if (self.editor) {
					self.editor.refresh();
				} else if (self.terminal) {
					self.terminal.resize();
				} else if (self.merge) {
					core.module.merge.refresh(self.filename);
				}
			}
		});

		// for context menu
		//
		panel.mouseup(function(e) {
			// show editor context menu
			//
			if (e.which === 3 && self.editor && self.editor.context_menu) {
				self.editor.context_menu.show(e);
				return false;
			}
		});

		//window body click event assign/
		panel.click(function(e) {
			// self.window_body_click();	// hidden by jeongmin: function is deprecated
			if ($('#project_selector').find('.btn-group').hasClass('open')) {
				$('#project_selector').find('.btn-group').removeClass('open');
			}

			e.stopPropagation();
			e.preventDefault();
			return false;
		});

		titlebar.click(function(e) {
			self.titlebar_click();

			e.stopPropagation();
			e.preventDefault();
			return false;
		});

		// set Resizable
		//
		panel.parent().resizable({
			containment: 'parent' // workspace
		});

		// Set Drag & Drop
		// var workspace = core.module.layout.workspace;
		// var ws = $(workspace.context);
		// this.editor.editor.on('dragover', function (__editor, e) {
		// 	console.log(__editor);
		// 	ws.css('border', '3px dashed #aaa');
		// 	workspace.window_manager.tab_resize_window_relocation();
		// });

		if (this.editor) {
			this.editor.editor.on('drop', function(__editor, e) {
				var files = e.dataTransfer.files;
				if (files && files.length > 0) {
					alert.show(core.module.localization.msg.alert_drop_on_editor);
					e.stopPropagation();
					e.preventDefault();
					return;
				}
			});
		}

		this.init_title();

		if (window_manager.maximized) {
			this.maximize();
		}

		if (options.status) {
			if (options.status === 'minimized') {
				this.minimize();
			}
		}

		panel.parent().data('window', this);
		//bootstrap end
	},

	connect: function(tab) {
		this.tab = tab;
	},

	

	titlebar_click: function() {
		var window_manager = core.module.layout.workspace.window_manager;
		window_manager.activate(this.index);

	},

	set_modified: function(data) {
		var self = this;
		var titlebar = this.panel.dialog('option', 'title');

		// undo/redo makes window saved, and it is done by codemirror's original edit history. Jeong-Min Im.
		function set_saved_by_original_cm(editor) { // editor: codemirror
			// when all modified undo, remove '*'
			if (self.undo_depth !== null && editor.doc.historySize().undo === self.undo_depth) { // jeongmin: add undo_depth valid check. If undo_depth is null, no saved status to go back.
				if (editor.doc.historySize().redo !== 0) { // jeongmin: add 'redo != 0' for knowing whether modified by undo or not
					self.set_saved();
					return true;
				} else if (editor.doc.history.undone.length !== 0) { // jeongmin: modified by redo -> undone array is not 0 because if redo is possible, there is undone text
					self.set_saved();
					return true;
				} else {
					self.undo_depth = null; // jeongmin: if not in above any conditions, modified by new text -> undo_depth must be initialized. It means saved status no longer exists.
				}
			}
		}

		if (this.editor) {
			
			//useonly(mode=goorm-oss)
			if (set_saved_by_original_cm(this.editor.editor)) {
				return;
			}
			
		} else if (this.merge) { // jeongmin: use codemirror's original edit history
			if (set_saved_by_original_cm(this.merge.edit)) {
				return;
			}
		}

		this.panel.dialog('option', 'title', titlebar);

		if (this.panel.siblings('.ui-dialog-titlebar').find('.title_option').length === 0) {
			this.panel.siblings('.ui-dialog-titlebar').find('.ui-dialog-title').before('<span class="title_option"><i class="fa fa-asterisk"></i></span>').html(titlebar); // jeongmin: put title_option before title
		}

		this.is_saved = false;
	},
	set_saved: function() {
		var titlebar = null;

		if ($('#' + this.panel[0].id).length !== 0) {
			titlebar = this.panel.dialog('option', 'title');
			this.panel.dialog('option', 'title', titlebar);
		}

		this.is_saved = true;

		// when user modified editor and saved, it removes '*' sign window, tab.
		if (this.editor) {
			this.undo_depth = this.history_edit.undo || this.undo_depth; // jeongmin: getStack can be undefined at first
		}

		this.panel.siblings('.ui-dialog-titlebar').find('.title_option').remove(); // jeongmin: remove title_option

		var $title_container = $(this.panel).siblings('.ui-dialog-titlebar');
		$title_container.find('.ui-dialog-titlebar-modified').hide().end().find('.ui-dialog-titlebar-close').show();
	},

	maximize: function() {
		if (this.state() === 'maximized') {
			// if it is already maximized
			// only resize panel width, height.
			// 				var left = parseInt($('#g_window_tab_list').offset().left, 10);
			// 				var top = parseInt($('#g_window_tab_list').offset().top, 10) + 30;
			this.panel.dialog('option', 'width', this.workspace.width()).dialog('option', 'height', this.workspace.height() - 1); //.dialog('option', 'position', [1, 1]);
			this.panel.parent().css('left', '0px');
			this.panel.parent().css('top', '0px');

			this.resize_all();
		} else {
			$(this.panel).dialogExtend('maximize');
		}
	},

	state: function() {
		return $(this.panel).dialogExtend('state');
	},

	minimize: function() {
		$(this.panel).dialogExtend('minimize');
	},

	restore: function() {
		$(this.panel).dialogExtend('restore');
	},

	move: function(top, left) {
		var container = $(this.panel).parent();

		if (typeof(top) == 'string' && top.indexOf('px')) {
			top = parseInt(top.split('px')[0], 10);
		}

		if (typeof(left) == 'string' && left.indexOf('px')) {
			left = parseInt(left.split('px')[0], 10);
		}

		this.top = top;
		this.left = left;

		container.css('top', this.top + 'px').css('left', this.left + 'px');
	},

	bind_width: function(width) {
		var container = $(this.panel).parent();

		if (typeof(width) == 'string' && width.indexOf('px')) {
			width = parseInt(width.split('px')[0], 10);
		}

		this.width = width;

		$(this.panel).dialog({
			'width': width
		});
		container.css('width', width + 'px').find('.ui-dialog-content').width(container.width() - 12);

		// move to top, left
		this.move(this.top, this.left);
	},

	bind_height: function(height) {
		var container = $(this.panel).parent();

		if (typeof(height) == 'string' && height.indexOf('px')) {
			height = parseInt(height.split('px')[0], 10);
		}

		this.height = height;

		$(this.panel).dialog({
			'height': height
		});
		container.css('height', height + 'px'); //.find('.ui-dialog-content').height(container.height() - 38);

		// window codemirror container
		//
		var titlebar_height = container.find('.ui-dialog-titlebar').height();
		this.panel.css('height', height - titlebar_height - 12 + 'px');

		// move to top, left
		this.move(this.top, this.left);
	},

	close: function() {
		var self = this;
		var i = 0;
		var editor_exist = false;

		// seongho.cha : if call self.close directly in setTimeout. function will use global scope - 'this' value is not work.
		var callself = function() {
			self.close();
		};

		if ((self.is_loaded !== true) || (self.type === 'Editor' && (self.editor === null || self.editor.editor_loaded !== true))) {
			if (this.timeout !== null) {
				clearTimeout(this.timeout);
			}
			this.timeout = setTimeout(callself, 300);
			return;
		} else {
			if (this.timeout !== null) {
				clearTimeout(this.timeout);
			}
		}

		var window_manager = core.module.layout.workspace.window_manager;
		var activated_index = window_manager.activated_list.indexOf(this);
		if (activated_index > -1) {
			window_manager.activated_list.splice(activated_index, 1);
		}

		window_manager.history_window = {};
		window_manager.history_window.filename = this.filename;
		window_manager.history_window.filetype = this.filetype;
		window_manager.history_window.filepath = this.filepath;

		// clear highlight
		if (this.type === 'Terminal') {
			var project = this.project;
			for (i = 0; i < window_manager.window.length; i++) {
				var target_window = window_manager.window[i];
				if (target_window.project == project && target_window.editor) {
					target_window.editor.clear_highlight();
				}
			}
		}

		$(document).trigger(this.filename + '_closed');

		if (self.editor) {
			self.editor.context_menu.remove();
			
		}

		

		this.alive = false;
		this.filename = null;
		this.filetype = null;

		this.panel.remove();
		window_manager.window.remove(this.index, this.index);
		window_manager.index--;
		window_manager.active_filename = '';

		if (core.module.layout.history) {
			core.module.layout.history.deactivated();
		}

		// var new_window = window_manager.window.length - 1;
		// if (new_window !== -1 && window_manager.window[new_window]) {
		// 	window_manager.activate(new_window);
		// }
		// // } else {
		// // 	if (self.editor && self.editor.collaboration) {
		// // 		self.editor.collaboration.update_editor({
		// // 			filename: ""
		// // 		});
		// // 	}
		// // 	$(".tab_max_buttons").hide();
		// // }
		// window_manager.active_window = new_window;

		for (i = 0; i < window_manager.index; i++) {
			
			//useonly(mode=goorm-oss)
			if (window_manager.window[i].type == 'Editor') {
				editor_exist = true;
				break;
			}
			
		}
		if (!editor_exist) {

			// disable main menu - editor

			this.disable_edit_menu();
			$('.menu-undo[action=do_undo]').parent().addClass('disabled');
			$('.menu-redo[action=do_redo]').parent().addClass('disabled');
			$('button[action=do_redo]').addClass('disabled');
			$('button[action=do_undo]').addClass('disabled');
		}

		if (window_manager.active_window != this.index) { // jeongmin: reset active_window
			if (window_manager.active_window > this.index) {
				window_manager.active_window--;
			}

			window_manager.activate(window_manager.active_window);
		} else if (window_manager.window.length > 0) { // jeongmin: only if window exists
			if (window_manager.activated_list[0]) {
				window_manager.activate(window_manager.activated_list[0].index);
			} else {
				var next = (this.index > 1) ? this.index - 1 : 0;
				window_manager.activate(next);
			}
		} else if (window_manager.window.length <= 0) {
			window_manager.active_window = -1;
			document.title = core.status.current_project_name + ' - goorm';
		}

		$(core).trigger('bookmark_table_refresh'); //jeongmin

	},

	activate: function() {
		var window_manager = core.module.layout.workspace.window_manager;

		//push panel reference at activated array front
		var index = window_manager.activated_list.indexOf(this);
		if (index > -1) {
			window_manager.activated_list.splice(index, 1);
		}
		window_manager.activated_list.unshift(this);

		window_manager.active_window = this.index;

		if (this.editor && this.editor.filename) {
			if (window_manager.active_filename !== (this.editor.filepath + this.editor.filename)) {
				window_manager.active_filename = this.editor.filepath + this.editor.filename; // jeongmin: need active filename update before on_activated

				this.editor.on_activated();
			}

			this.editor.focus(); // jeongmin: when window is focused, focus codemirror, too.
		} else { // jeongmin: other windows(terminal...)
			window_manager.active_filename = '';
		}

		if (this.panel) {
			this.panel.dialog('moveToTop');
			// this.resize_all('activated');
			if (this.type == 'Editor') {
				$('#editor_status').show();
				$('#lint_summury .err_count').text(' ' + this.editor.err_count);
				$('#lint_summury .warn_count').text(' ' + this.editor.warn_count);
				$('#lint_summury').show();
				this.enable_edit_menu('Editor');
				document.title = this.filename + ' - goorm';
			}
			
			else {
				$('#editor_status').hide();
				$('lint_summury').hide();

				$('a[action=do_undo]').parent().addClass('disabled');
				$('a[action=do_redo]').parent().addClass('disabled');
				$('button[action=do_redo]').addClass('disabled');
				$('button[action=do_undo]').addClass('disabled');
				this.disable_edit_menu();
				document.title = this.type + ' - goorm';
			}

			if (this.type == 'Terminal') { // jeongmin: terminal doesn't have outline
				core.module.layout.outline.clear();
				if (this.terminal && this.terminal.Terminal) {
					this.terminal.Terminal.focus();
				}
			}
		}

		if (this.tab !== null) {
			this.tab.activate();
		}

		this.activated = true;
	},

	init_title: function() {
		var $title_container = $(this.panel).siblings('.ui-dialog-titlebar');

		// var title = (this.options.title) ? this.options.title : this.title; //annotation - Donguk Kim
		var title = (this.options.filename) ? this.options.filename : this.title; // jeongmin: in case of url, filename is undefined. So, put title instead.

		this.panel.dialog('option', 'title', title);

		// bind tabindex=-1 for TAB KEY
		//
		$title_container.prepend('<div class="panel_image window_tab-toolbar-disconnect" tabindex="-1"><i class="fa fa-share-alt"></i></div>')
			.append('<button class="ui-dialog-titlebar-modified" tabindex="-1">●</button>').find('button').attr('tabindex', -1);

		// append Modifed Button Event
		//
		$title_container.find('.ui-dialog-titlebar-modified').click(function() {
			$title_container.find('.ui-dialog-titlebar-close').click(); // close event
		});
	},

	set_title: function(title) {
		if (!title) {
			title = this.options.filename;
		}
		this.panel.dialog('option', 'title', title);
	},

	set_footer: function() {
		if (this.type == 'Editor') {}
	},

	resize_all: function(where) {
		var wm = core.module.layout.workspace.window_manager;
		where = where || 'resized';

		var width = parseInt((wm.maximized) ? this.workspace.width() : this.panel.parent().width(), 10);
		var height = parseInt((wm.maximized) ? this.workspace.height() : this.panel.parent().height(), 10);
		var content_height = parseInt((wm.maximized) ? height : height - this.panel.siblings('.ui-dialog-titlebar').outerHeight(), 10);

		//Terminal has 10px padding and 2px border
		if (this.type === 'Terminal') {
			width -= 12;
			content_height -= 12;
			this.terminal.resize();
		}

		var dlg_content = this.panel.parent().find('.ui-dialog-content');
		if (wm.maximized) {
			width -= 2;
			height -= 3;
		}
		if (where === 'resized') {
			dlg_content.width(width);
			dlg_content.height(content_height);
		}

		if (!wm.maximized) {
			this.width = width;
			this.height = height;
		}

		if (this.editor) {
			this.editor.refresh();
		} else if (this.merge) {
			core.module.merge.refresh(this.filename);
		}

		if (parseInt(this.panel.offsetParent().css('top'), 10) < 0) {
			this.panel.offsetParent().css('top', 0);
		}

		if (!$('#workspace').hasClass('use-scroll')) {
			$('#workspace').scrollTop(0).scrollLeft(0);
		}
		// this.panel.trigger(this.filename + '_resized'); // jeongmin: document -> panel
	},

	refresh: function() {
		if (this.context_menu) {
			this.context_menu.hide();
		}
		
		if (this.editor) {
			this.editor.refresh();
		}

		if (this.terminal) {
			this.terminal.resize();
		}
		
		if (!$('#workspace').hasClass('use-scroll')) {
			$('#workspace').scrollTop(0).scrollLeft(0);
		}
	},

	inArray: function(keyword) {
		var i;

		for (i = 0; i < core.filetypes.length; i++) {
			if (core.filetypes[i].file_extension == keyword) {
				return i;
			}
		}

		for (i = 0; i < core.filetypes.length; i++) {
			if (core.filetypes[i].file_extension == 'txt') {
				return i;
			}
		}

		return 12;
	},

	extract_url: function() {
		// id / file_path --> encode to base64
		//
		// file/open?[encode data] --> check session & open file url
		//
		var id = core.user.id;
		var filepath = this.filepath;
		var filename = this.filename;
		var filetype = this.filetype;

		var get_encode = function(str) {
			str = btoa(str);
			str = str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');

			return str;
		};

		var api = get_encode('id') + '=' + get_encode(id) + '&' + get_encode('filepath') + '=' + get_encode(filepath) + '&' + get_encode('filename') + '=' + get_encode(filename) + '&' + get_encode('filetype') + '=' + get_encode(filetype);
		return location.origin + '/file/open?q=' + get_encode(api);
	},

	plug: function() {
		$(core).trigger('window_panel_plug', [this.filename, this.filepath, this.filetype, this.title]);
	},

	disable_edit_menu: function() {

		$('a[action=do_delete]').parent().addClass('disabled');
		$('a[action=select_all]').parent().addClass('disabled');
		$('a[action=do_go_to_line]').parent().addClass('disabled');
		$('a#parent_bookmark_menu').parent().addClass('disabled');
		$('a[action=do_find]').parent().addClass('disabled');
		$('a[action=do_find_next]').parent().addClass('disabled');
		$('a[action=do_find_previous]').parent().addClass('disabled');
		//$('a[action=auto_formatting]').parent().addClass('disabled');
		$('a[action=comment_selected]').parent().addClass('disabled');
		
	},
	enable_edit_menu: function() {
		$('a[action=do_delete]').parent().removeClass('disabled');
		$('a[action=select_all]').parent().removeClass('disabled');
		$('a[action=do_go_to_line]').parent().removeClass('disabled');
		$('a#parent_bookmark_menu').parent().removeClass('disabled');
		$('a[action=do_find]').parent().removeClass('disabled');
		$('a[action=do_find_next]').parent().removeClass('disabled');
		$('a[action=do_find_previous]').parent().removeClass('disabled');
		//$('a[action=auto_formatting]').parent().removeClass('disabled');
		$('a[action=comment_selected]').parent().removeClass('disabled');
		
	}
};
