/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm = function() {};
goorm.core = function() {

	this.user = {
		first_name: null,
		last_name: null,
		email: null,
		img: null
	};

	this.env = {
		version: null,
		browser: null,
		browser_version: 0,
		os: null,
		device: null,
		touchable: null,
		websocket_support: null,
		html5_support: null
	};

	this.module = {
		plugin_manager: null,
		plugin_linter: null,
		debug: null,
		preference: null,
		project: null,
		file: null,
		layout: null,
		localization: null,
		action: null,
		shortcut_manager: null,
		search: null,
		browser: null,
		device: null,
		fn: null,
		loading_bar: null,
		toast: null,
		auth: null,
		
		bookmark: null, //jeongmin: add bookmark to the module
		
		close_alert: false
	};

	this.dialog = {
		new_project: null,
		open_project: null,
		new_file: null,
		new_other_file: null,
		new_folder: null,
		new_untitled_textfile: null,
		open_file: null,
		upload_file: null,
		// go_to_line: null,	//jeongmin: go to line is not in dialog anymore
		
		save_as_file: null,
		rename_file: null,
		move_file: null,
		import_file: null,
		export_file: null,
		export_project: null,
		import_project: null,
		delete_project: null,
		// build_all: null,
		// build_project: null,
		// build_clean: null,
		// build_configuration: null,
		
		find_and_replace: null,
		search: null,
		preference: null,
		project_property: null,
		help_contents: null,
		help_shortcuts: null,
		help_about: null,
		help_license: null,
		loaded_count: 0
	};

	this.status = {
		is_mobile: false,
		is_login: false,
		login_complete: false,
		keydown: false,
		focus_obj: '',
		focus_on_editor: false,
		foucs_on_dialog: false,
		selected_file: '',
		selected_dialog: '',
		selected_dialog_container: '',
		current_project_path: '',
		current_project_name: '',
		current_project_type: '',
		current_opened_list: {},
		current_running_server: {}
	};

	this.socket = null;

	this.dialog_loading_count = 0;
	this.loading_count = 0;

	this.filetypes = null;
	this.preference = null;
	this.property = null;
	this.workspace = null;

	

	this.force_unload = false;
};

goorm.core.prototype = {
	init: function(container) {
		var self = this;

		this.container = container;

		

		

		

		//useonly(mode=goorm-oss)
		this.init_load();
		
	},

	init_load: function() {
		var self = this;

		var container = this.container;

		if (core.options.mode && core.options.mode.indexOf('book') > -1) {
			$('[action="build_project"]').hide();
			$('[action="build_clean"]').hide();
			$('[action="build_all"]').hide();
			$('[action="build_configuration"]').hide();

			$('[action="build_all"]').parent().parent().hide();
		}

		this.start();

		this.filetypes = [];
		this.workspace = {};

		var _this = $(this); //jeongmin: access object member less

		_this.on('layout_loaded', function() {
			console.log('layout load complete');

			this.module.layout.resize_all();
			this.module.plugin_manager.get();
		});

		_this.on('preference_load_complete', function() {
			console.log('preference load complete');
			goorm.core.terminal.dummy();
		});

		_this.on('plugin_loaded', function() {
			console.log('plugin load complete');

			this.module.plugin_manager.load(0, false); // jeongmin: load plugin first

			// this.main();
		});

		_this.on('plugin_load_complete', function() {
			console.log('plugin init complete');

			this.main();
		});

		this.load_complete_flag = false;

		//Loading Animation
		_this.on('goorm_loading', function() {
			if (self.loading_count < Object.keys(core.dialog).length - 9 + parseInt(core.module.plugin_manager.list.length, 10)) {
				self.loading_count++;
			} else {
				if (!self.load_complete_flag) {
					self.check_localStorage_version();
					$(self).trigger('goorm_load_complete');
					self.load_complete_flag = true;

					//useonly(mode=goorm-oss)
					self.show_local_login_box();
					

					var core_mod_auth = core.module.auth; //jeongmin: access object module less ------ here

					

					
				}
			}
		});

		//Loading Ending
		_this.on('goorm_load_complete', function() {
			console.log('goormIDE load complete');

			$('input[type=checkbox]').iCheck({
				checkboxClass: 'icheckbox_minimal',
				radioClass: 'iradio_minimal',
				increaseArea: '20%' // optional
			});
			$('input[type=radio]').iCheck({
				checkboxClass: 'icheckbox_minimal',
				radioClass: 'iradio_minimal',
				increaseArea: '20%' // optional
			});
			// core.module.tutorial.start('basic');

			$(document).on('contextmenu', function(e) {
				var target = $(e.target);

				// terminal & chat & find/replace - open browser context menu
				//
				if (!(target.parents('#terminal').length > 0 || target.parents('.terminal').length > 0 || target.hasClass('terminal_style') || target.attr('id') == 'input_chat_message' || target.parent().hasClass('chat_message_container') || target.parent().hasClass('chat_message_content') || target.attr('id') == 'find_query_inputbox' || target.attr('id') == 'replace_query_inputbox' || target.attr('id') == 'search_query_inputbox')) {
					e.preventDefault();
				}
			});

			$(window).focus(function() {
				$(self.focused).focus();
			});

			$(window).blur(function() {
				self.focused = this;
			});

			self.module.action.init();
			//theme
			// self.module.theme = goorm.core.theme;
			// self.module.theme.init();
		});

		_this.on('goorm_login_complete', function() {
			// self._socket.emit('/project/valid_manifest', {}); // jeongmin: goorm.manifest validation
			// if (parseInt(localStorage.left_tabview_index, 10) >= 0 && $('#goorm_left ul li a').length - 1 >= parseInt(localStorage.left_tabview_index, 10))
			// 	core.module.layout.left_tabview.selectTab(parseInt(localStorage.left_tabview_index, 10));
			// else
			// 	core.module.layout.left_tabview.selectTab(0);
			// if (parseInt(localStorage.inner_bottom_tabview_index, 10) >= 0 && $('#goorm_inner_layout_bottom ul li a').length - 1 >= parseInt(localStorage.inner_bottom_tabview_index, 10))
			// 	core.module.layout.inner_bottom_tabview.selectTab(parseInt(localStorage.inner_bottom_tabview_index, 10));
			// else
			// 	core.module.layout.select('debug');

			// if (parseInt(localStorage.inner_right_tabview_index, 10) >= 0 && $('#goorm_inner_layout_right ul li a').length - 1 >= parseInt(localStorage.inner_right_tabview_index, 10))
			// 	core.module.layout.inner_right_tabview.selectTab(parseInt(localStorage.inner_right_tabview_index, 10));
			// else
			// 	core.module.layout.inner_right_tabview.selectTab(0);

			$('#east_tab a:first').tab('show'); // Select first tab
			$('#west_tab a:first').tab('show'); // Select first tab
			$('#south_tab a:first').tab('show'); // Select first tab

			core.status.login_complete = true;
			// core.module.toast.show(core.module.localization.msg.notice_welcome_goorm);

			

			$('#goorm').show();
		});

		$(window).on('unload', function() {
			self.unload();
		});

		$(window).on('beforeunload', function() {
			// if (!self.is_login) return;
			// if (!self.force_disconnect) return;
			if (core.module.close_alert) {
				return;
			}
			if (!core.force_unload && !self.module.auth.open_keep_session_dialog && !core.logout) {
				//2. refresh, back button, close button
				var unsaved_file = goorm.core.edit.prototype.find_unsaved_file();
				if (unsaved_file) {
					return unsaved_file + core.module.localization.msg.confirmation_not_saved;
				} else {
					var msg = (core.module.localization && core.module.localization.msg && core.module.localization.msg.confirmation_close_tab) ? core.module.localization.msg.confirmation_close_tab : 'Do you want to close goorm?';
					return msg;
				}
			}
		});

		window.onerror = function(errorMsg, url, lineNumber, column) {
			var postdata = {
				user_id: core.user.id,
				error_msg: errorMsg,
				url: url,
				line_number: lineNumber,
				col_number: column || -1, // old browsers do not support this param
				browser: navigator.userAgent,
				os: navigator.platform
			};

			$.ajax({
				'type': 'POST',
				'url': '/log/save_error_log',
				'data': postdata,
				'async': false,
				'success': function(result) {
					if (result) {
						console.log('error reported');
					}
				}
			});
		};

		// window.onbeforeunload = function (e) {
		// 	if (core.module.auth.open_keep_session_dialog) return;

		// 	//1. logout
		//     if(core.logout){
		//     	return "core.logout";
		//     }
		//     //2. refresh, back button, close button
		//     var unsaved_file = goorm.core.edit.prototype.find_unsaved_file();
		//     if(unsaved_file){
		//     	return unsaved_file + core.module.localization.msg.confirmation_not_saved;
		//     }else{
		//     	return "Goorm IDE close";
		//     }
		// };

		//Project
		this.module.project = goorm.core.project;

		//File
		this.module.file = goorm.core.file;

		//Plugin Loading Aspects
		if (goorm.plugin.manager) {
			this.module.plugin_manager = goorm.plugin.manager;
			this.module.plugin_manager.init();
		}

		

		if (goorm.plugin.linter) { // jeongmin
			this.module.plugin_linter = goorm.plugin.linter;
		}

		//Toolbar
		if (goorm.core.toolbar) {
			//this.module.toolbar = goorm.core.toolbar;
			//this.module.toolbar.init();
		}

		//Search Tab
		this.module.search = goorm.core.search.message;

		//Preference
		if (goorm.core.preference) {
			this.module.preference = goorm.core.preference;
			this.module.preference.init();
		}

		if (goorm.core.router) {
			this.module.router = goorm.core.router;
			this.module.router.init();
		}

		

		//Menu Actions
		this.module.action = goorm.core.menu.action;

		if (goorm.core.browser) {
			this.module.browser = goorm.core.browser;
			this.module.browser.init();
		}

		if (goorm.core.device) {
			this.module.device = goorm.core.device;
			this.module.device.init();
		}

		if (goorm.core.fn) {
			this.module.fn = goorm.core.fn;
			this.module.fn.init();
		}

		this.env.touchable = this.is_touchable_device();
		this.env.websocket_support = this.test_web_socket();
		this.progressbar = goorm.core.utility.progressbar;

		if (goorm.core.layout) {
			this.module.layout = goorm.core.layout;
			this.module.layout.init(container);
		}

		//Shortcuts
		if (goorm.core.shortcut.manager) {
			this.module.shortcut_manager = goorm.core.shortcut.manager;
			this.module.shortcut_manager.init();
		}

		if (goorm.core.tutorial) {
			// bootstrap tour
			this.module.tutorial = goorm.core.tutorial;
		}

		if (core.realtime_lint) {
			$('#toggle_realtime_lint_checker').show();
		} else {
			$('#toggle_realtime_lint_checker').hide();
		}

		//Cloud
		// if (goorm.core.cloud) {
		// 	this.module.cloud = goorm.core.cloud;
		// }

		// if (goorm.core.cloud.google) {
		// 	this.module.cloud.google = goorm.core.cloud.google;
		// }
	},

	main: function() {

		if (goorm.core.project._new) {
			this.dialog.new_project = goorm.core.project._new;
			this.dialog.new_project.init();
		}

		if (goorm.core.project.open) {
			this.dialog.open_project = goorm.core.project.open;
			this.dialog.open_project.init();
		}

		if (goorm.core.file._new) {
			this.dialog.new_file = goorm.core.file._new;
			this.dialog.new_file.init();
		}

		if (goorm.core.file._new.other) {
			this.dialog.new_other_file = goorm.core.file._new.other;
			this.dialog.new_other_file.init();
		}

		if (goorm.core.file._new.folder) {
			this.dialog.new_folder = goorm.core.file._new.folder;
			this.dialog.new_folder.init();
		}

		if (goorm.core.file._new.untitled_textfile) {
			this.dialog.new_untitled_textfile = goorm.core.file._new.untitled_textfile;
			this.dialog.new_untitled_textfile.init();
		}

		if (goorm.core.file.open) {
			this.dialog.open_file = goorm.core.file.open;
			this.dialog.open_file.init();
		}
		
		if (goorm.core.file.save_as) {
			this.dialog.save_as_file = goorm.core.file.save_as;
			this.dialog.save_as_file.init();
		}

		if (goorm.core.file.rename) {
			this.dialog.rename_file = goorm.core.file.rename;
			this.dialog.rename_file.init();
		}

		if (goorm.core.file.move) {
			this.dialog.move_file = goorm.core.file.move;
			this.dialog.move_file.init();
		}
		
		if (goorm.core.file._import) {
			this.dialog.import_file = goorm.core.file._import;
			this.dialog.import_file.init();
		}

		if (goorm.core.file._export) {
			this.dialog.export_file = goorm.core.file._export;
			this.dialog.export_file.init();
		}

		if (goorm.core.project._export) {
			this.dialog.export_project = goorm.core.project._export;
			this.dialog.export_project.init();
		}

		if (goorm.core.project._import) {
			this.dialog.import_project = goorm.core.project._import;
			this.dialog.import_project.init();
		}

		if (goorm.core.project._delete) {
			this.dialog.delete_project = goorm.core.project._delete;
			this.dialog.delete_project.init();
		}

		

		// if (goorm.core.project.build.all) {
		// 	this.dialog.build_all = goorm.core.project.build.all;
		// 	this.dialog.build_all.init();
		// }

		// if (goorm.core.project.build.project) {
		// 	this.dialog.build_project = goorm.core.project.build.project;
		// 	this.dialog.build_project.init();
		// }

		// if (goorm.core.project.build.clean) {
		// 	this.dialog.build_clean = goorm.core.project.build.clean;
		// 	this.dialog.build_clean.init();
		// }

		// if (goorm.core.project.build.configuration) {
		// 	this.dialog.build_configuration = goorm.core.project.build.configuration;
		// 	this.dialog.build_configuration.init();
		// }

		
		// if (goorm.core.edit.go_to_line) {	//jeongmin: go to line is not in dialog anymore
		// 	// by pear
		// 	this.dialog.go_to_line = goorm.core.edit.go_to_line;
		// 	this.dialog.go_to_line.init();
		// 	// by pear
		// }

		if (goorm.core.edit.find_and_replace) {
			this.dialog.find_and_replace = goorm.core.edit.find_and_replace;
			this.dialog.find_and_replace.init();
		}

		if (goorm.core.edit.bookmark_list) { //jeongmin: connect edit.bookmark and module.bookmark
			this.module.bookmark_list = goorm.core.edit.bookmark_list;
			this.module.bookmark_list.init(); //initialize bookmark
		}

		if (goorm.core.search) {
			this.dialog.search = goorm.core.search;
			this.dialog.search.init();
		}
		
		if (goorm.core.project.property) {
			this.dialog.project_property = goorm.core.project.property;
			this.dialog.project_property.init();
		}

		if (goorm.core.help.contents) {
			this.dialog.help_contents = goorm.core.help.contents;
			this.dialog.help_contents.init();
		}

		if (goorm.core.help.shortcuts) {
			this.dialog.help_shortcuts = goorm.core.help.shortcuts;
			this.dialog.help_shortcuts.init();
		}

		if (goorm.core.help.about) {
			this.dialog.help_about = goorm.core.help.about;
			this.dialog.help_about.init();
		}

		if (goorm.core.help.license) {
			this.dialog.help_license = goorm.core.help.license;
			this.dialog.help_license.init();
		}

		

		// if (goorm.core.npm) {
		// 	this.module.npm = goorm.core.npm;
		// 	this.module.npm.init();
		// }

		if (goorm.core.utility.loading_bar) {
			this.module.loading_bar = goorm.core.utility.loading_bar;
			this.module.loading_bar.init();
		}

		if (goorm.core.utility.progress_manager) {
			this.module.progress_manager = goorm.core.utility.progress_manager;
			this.module.progress_manager.init();
		}

		if (goorm.core.utility.toast) {
			this.module.toast = goorm.core.utility.toast;
			this.module.toast.init();
		}

		

		if (this.module.preference) {
			this.dialog.preference = this.module.preference;
			this.dialog.preference.init_dialog();
		}

		if (goorm.core.localization) {
			this.module.localization = goorm.core.localization;
			this.module.localization.init();
		}

		// for Selenium IDE
		alert = __alert;
		alert.init();
		notice.init();
	},

	start: function() {
		var self = this;

		var loading_panel_container = $('#loading_panel_container');

		

		//useonly(mode=goorm-oss)
		$('#login_box').remove();
		

		

		//useonly(mode=goorm-oss)
		$('#goorm_local_mode_button').click(function() {
			self.access_local_mode();
		});
		
		$('#loading_panel_container').show();

		var loading_background = $('#loading_background');
		loading_background.css('position', 'absolute').width($(window).width()).height($(window).height());
		loading_background.css('left', 0).css('top', 0).css('z-index', 999);

		$(window).resize(function(event) {
			// jQuery-ui resizable triggers window.resize event.
			if (!$(event.target).hasClass('ui-resizable')) {
				loading_background.width($(window).width()).height($(window).height());
			}
		});

		loading_panel_container.css('display', 'none').width(640).height(480).css('position', 'absolute').css('z-index', 1000).css('left', $(window).width() / 2 - 320).css('top', parseInt($(window).height() / 2, 10) - 240).fadeIn(2000);
	},

	// manage socket connections. Jeong-Min Im.
	socket_connect: function() {
		var self = this;

		this.module.router.connect();

		this.socket = this.module.router.get_socket();
		this._socket = new this.module.router._socket();

		_$ = new this.module.router._$();

		goorm.core.utility.ajax_loading.init(this.socket);

		this.socket.on('user_access', function(goorm_server_ip) {
			self.module.router.goorm_server_ip = goorm_server_ip;

			$(core).trigger('goorm_login_complete');
		});

		this.socket.on('other_window_logged_out', function() {
			self.socket.removeListener('disconnect'); //Don't try reconnect
			$('#g_alert_btn_ok').one('click', function() {
				core.logout = true;
				location.href = 'http://goorm.io';
			});
			alert.show(core.module.localization.msg.alert_logged_out_from_other);
			core.router.disconnect();
		});
		

		

		//useonly(mode=goorm-oss)
		self.socket.emit('access', JSON.stringify({ // jeongmin: join channel code is moved to ajax from collaboration and named 'access' for oss
			'channel': 'join'
		}));
		

		$(core).trigger('socket_connected'); // for binding socket handler
	},

	
	//useonly(mode=goorm-oss)
	show_local_login_box: function() {
		if (localStorage.user && localStorage.user != 'undefined') {
			var user = JSON.parse(localStorage.user);
			$('#local_user_input').val(user.id);
		}

		$('#local_login_box').delay(1500).fadeIn(2000);

		// setTimeout(function() {
		$.debounce(function() {
			$('#local_user_input').focus();

			if ($('#local_user_input').val() !== '') {
				$('#local_user_pw_input').focus();
			}
		}, 2000)();
	},

	local_complete: function() {
		$('#loading_background').delay(1000).fadeOut(1000);
		$('#loading_panel_container').delay(1500).fadeOut(1000);

		// $(core).trigger('goorm_login_complete');
		this.socket_connect();
	},

	access_local_mode: function() {
		var self = this;

		var id = $('#local_user_input').val();
		var pw = $('#local_user_pw_input').val();

		$.post('/local_login', {
			'id': id,
			'pw': pw
		}, function(data) {
			if (data.result) {
				self.user.id = id;
				self.user.email = '';
				self.user.name = id;
				self.user.level = 'Member';
				self.user.type = 'password';

				localStorage.user = JSON.stringify(self.user);
				self.local_complete();
			} else {
				alert.show(core.module.localization.msg.alert_not_valid_user);
			}
		});
	},
	
	new_main_window: function() {
		window.open('./');
	},

	is_touchable_device: function() {
		var el = document.createElement('div');
		el.setAttribute('ongesturestart', 'return;');

		if (typeof el.ongesturestart == 'function') {
			return true;
		} else {
			return false;
		}
	},

	test_web_socket: function() {
		if ('WebSocket' in window) {
			return true;
		} else {
			// the browser doesn't support WebSockets
			return false;
		}
	},

	pause: function(millis) {
		var date = new Date();
		var curDate = null;
		do {
			curDate = new Date();
		}
		while (curDate - date < millis);
	},

	unload: function() {
		if (core !== undefined && !core.local_mode && core.user !== undefined && core.user.id) {
			// window unload event for user-preference. youseok.nam
			//
			core.module.preference.save_to_database();
			
		}
	},

	cookie_manager: {
		set: function(name, data, exdays, domain) {
			var exdate = new Date();
			exdate.setDate(exdate.getDate() + exdays);

			if (domain) {
				domain = 'domain=' + domain + ';';
			} else {
				domain = '';
			}

			var value = escape(data) + ((exdays === null) ? '' : '; expires=' + exdate.toGMTString() + ';' + domain + 'path=/');

			document.cookie = name + '=' + value;
		},

		del: function(name, domain) {
			var expire_date = new Date();

			if (domain) {
				domain = 'domain=' + domain + ';';
			} else {
				domain = '';
			}

			expire_date.setDate(expire_date.getDate() - 10);
			document.cookie = name + '=path=/;' + domain + '; expires=' + expire_date.toGMTString();
		},

		get: function(c_name) {
			var c_value = document.cookie;
			var c_start = c_value.indexOf(' ' + c_name + '=');

			if (c_start == -1) {
				c_start = c_value.indexOf(c_name + '=');
			}
			if (c_start == -1) {
				c_value = null;
			} else {
				c_start = c_value.indexOf('=', c_start) + 1;
				var c_end = c_value.indexOf(';', c_start);

				if (c_end == -1) {
					c_end = c_value.length;
				}

				c_value = unescape(c_value.substring(c_start, c_end));
			}

			return c_value;
		}
	},

	restore_prev_focus: function() {
		if (this.status.focus_obj !== null && this.status.focus_obj !== undefined && this.status.focus_obj !== '') {
			this.status.focus_obj.focus();
		}
	},

	check_localStorage_version: function() {
		var server_version = JSON.parse(external_json['public'].configs.version['version.json']);
		var current_version = (localStorage.version) ? JSON.parse(localStorage.version) : {};
		for (var key in server_version) {
			if (current_version[key] === undefined || current_version[key] < server_version[key]) {
				localStorage.removeItem(key);
			}
		}
		localStorage.setItem('version', JSON.stringify(server_version));

	},

	// initialize validation state. Jeong-Min Im.
	// wrapper (jQuery) : input wrapper
	init_input_validation: function(wrapper) {
		wrapper.removeClass('has-success has-error');
		wrapper.find('.form-control-feedback').removeClass('glyphicon-ok glyphicon-remove').hide(); // icon
		wrapper.find('.help-block').hide(); // error message
	},

	// show input validation result. Jeong-Min Im.
	// dialog (jQuery) : dialog that has input
	input_validation: function(dialog) {
		var self = this;

		dialog.find('.has-feedback .form-control').keyup(function() {
			var localization_msg = self.module.localization.msg;
			var text = $(this).val();
			var input_wrapper = $(this).parents('.has-feedback');
			var help_block = input_wrapper.find('.help-block');
			var msg = '';
			var success = function() {
				input_wrapper.addClass('has-success');
				input_wrapper.find('.form-control-feedback').addClass('glyphicon-ok').show();
			};
			var fail = function() {
				input_wrapper.addClass('has-error');
				input_wrapper.find('.form-control-feedback').addClass('glyphicon-remove').show();
				help_block.html(msg).show();
			};

			self.init_input_validation(input_wrapper);

			if (text.length) {
				var test_result = null;

				if (~dialog.attr('id').indexOf('file')) {
					test_result = self.module.file.test(text);

					if (test_result) { // invalid
						msg = localization_msg.alert_invalid_folder_name + '<br/>"' + test_result.join(', ') + '"';

						fail();
					} else { // valid
						success();
					}
				} else { // project
					test_result = self.module.project.name_test(text, $(this).parents('.modal-body').find('[project_detailed_type]').attr('project_detailed_type'));

					if (test_result && test_result['char']) {
						var _char = '<br/>"' + test_result['char'].join(', ') + '"';

						if (test_result.code === 1) {
							msg = localization_msg.alert_allow_character;
						} else { // django
							msg = localization_msg.alert_allow_character2;
						}

						msg += _char;

						fail();
					} else {
						success();
					}
				}
			} else { // blank
				// msg = localization_msg.alert_filename_empty;	// hidden: not necessary

				// fail();
			}
		});
	}
};
