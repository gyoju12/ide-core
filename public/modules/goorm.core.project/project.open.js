/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.open = {
	dialog: null,
	buttons: null,
	chat: null,
	project_list: null,
	
	handler: {},
	loading: false,
	progress_elements: {},
	opened_list: [],

	init: function() {

		var self = this;

		this.panel = $('#dlg_open_project');
		// this.panel.click(function() {	// hidden: storage is deprecated
		// 	$('button[localization_key=common_target]').blur();
		// });

		this.__handle_open = function() {
			var data = self.project_list.get_data();

			if (data.path === '' || data.name === '' || data.type === '') {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			} else {
				// var storage = $('#project_open_storage').find('span').html().toString();	// hidden: storage is deprecated
				// if (storage == 'goormIDE Storage') {
				self.open(data.path, data.name, data.type);
				// }

				self.panel.modal('hide');
			}
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: 'title_open_project',
			id: 'dlg_open_project',
			handle_ok: this.__handle_open,
			show: $.proxy(this.after_show, this)
			// success: function() {	// hidden: storage is deprecated
			// 	$('#project_open_storage').find('span').html('goormIDE_Storage');
			// 	$(document).on('click', 'li.open.storage', function() {
			// 		var storage = $(this).find('a').html();
			// 		$('button[localization_key=common_target]').blur();
			// 		$('#project_open_storage').find('span').html(storage);
			// 		if (storage == 'goormIDE Storage') {
			// 			$('#project_open_list').empty();
			// 			$('#project_open_information').empty();
			// 			self.project_list = new goorm.core.project.list();
			// 			self.project_list.init('#project_open');
			// 		}
			// 		// else if (storage == 'Google Drive') {

			// 		// }
			// 	});
			// }
		});

		this.project_list = new goorm.core.project.list();

		// open으로 이동
		// $(core).trigger('on_project_binding');
	},

	show: function() {
		this.project_list.init('#project_open');
		this.project_list.set_keydown_event({
			'handler': this.__handle_open
		});

		this.panel.modal('show');
	},

	after_show: function() {
		$('#project_open_list').focus();
	},

	bind: function(type, name, fn) {
		if (!this.handler) {
			this.handler = {};
		}

		if (fn && typeof(fn) === 'function') {
			this.handler[type] = {};
			this.handler[type][name] = fn;
		}
	},

	mount: function(path, callback) {
		if (typeof(path) === 'function') {
			callback = path;
			path = null;
		}

		var project_path = path || core.status.current_project_path;

		if (project_path !== '') {
			core._socket.set_url('/project/mount' + project_path);
			core._socket.once('/project/mount_message', function(path) {
				confirmation_save.init({
					message: core.module.localization.msg.confirmation_project_close_and_save,
					yes_text: core.module.localization.msg.save_and_close,
					cancel_text: core.module.localization.msg.confirmation_cancel,
					no_text: core.module.localization.msg.dont_save_and_close,
					title: 'Close...',

					yes: function() {
						var wm = core.module.layout.workspace.window_manager;
						for (var i = wm.window.length - 1; i >= 0; i--) {
							var w = wm.window[i];

							// if (postdata.project_path == w.project && w.storage == 'goormIDE_Storage') {
							if (path == w.project) { // hidden: storage is deprecated
								if (w.is_saved) {
									w.editor.save('close');
								} else {
									w.is_saved = true; // jeongmin: don't ask 'save changes confirmation'. Because we delete this project!
									wm.close_by_index(i, i);
								}
							}
						}
					},
					no: function() {
						var wm = core.module.layout.workspace.window_manager;
						for (var i = wm.window.length - 1; i >= 0; i--) {
							var w = wm.window[i];

							// if (postdata.project_path == w.project && w.storage == 'goormIDE_Storage') {
							if (path == w.project) { // hidden: storage is deprecated
								w.is_saved = true; // jeongmin: don't ask 'save changes confirmation'. Because we delete this project!
								wm.close_by_index(i, i);
							}
						}
					},
					cancel: function() {}
				});
				confirmation_save.show();
			});

			core._socket.once('/project/mount' + project_path, function(result) {
				core.module.layout.project.permission[project_path] = result.permission;

				if (path && result.path == path) {
					$(core).trigger('/project/mount.' + path);

					if (callback && typeof(callback) == 'function') {
						callback(result);
					}
				} else {
					if (callback && typeof(callback) == 'function') {
						callback(result);
					}
				}
			});

			core._socket.emit('/project/mount', {
				'project_path': project_path
			});
		} else {
			callback({
				'result': true
			});
		}
	},

	unmount: function(path, callback) {
		var self = this;

		if (this.loading) {
			return;
		}

		if (typeof(path) === 'function') {
			callback = path;
			path = null;
		}

		var project_path = path || core.status.current_project_path;

		if (project_path !== '') {
			this.loading = true;

			core._socket.once('/project/unmount', function(result) {
				setTimeout(function() {
					self.loading = false;
				}, 500);

				callback(result);
			});

			core._socket.emit('/project/unmount', {
				'project_path': project_path
			});
		} else {
			callback(true);
		}
	},

	reopen: function(next) {
		
		
	},

	open: function(current_project_path, current_project_name, current_project_type, storage) {
		var self = this;

		//$(core).trigger('on_project_binding');

		//set once-open trigger every call of open so that can get the message of nodejs project --heeje
		$(core).one('do_open', $.throttle(function() {
			

			

			//useonly(mode=goorm-oss)
			// core.status.current_project_storage = 'goormIDE_Storage';
			core.status.current_project_path = current_project_path;
			core.status.current_project_name = current_project_name;
			core.status.current_project_type = current_project_type;

			var current_project = {};
			current_project.current_project_path = current_project_path;
			current_project.current_project_name = current_project_name;
			current_project.current_project_type = current_project_type;

			localStorage.current_project = JSON.stringify(current_project);

			core.module.layout.project_explorer.refresh();
			core.module.layout.project_explorer.refresh_project_selectbox();

			if (use_terminal !== false) {
				core.module.terminal.terminal.refresh_terminal();
				core.module.layout.terminal.refresh_terminal();
			}

			core.module.layout.workspace.window_manager.refresh_all_title(current_project_path);

			$(core).trigger('on_project_open', {
				'project_path': current_project_path,
				'project_name': current_project_name,
				'project_type': current_project_type
			});
			
		}, 2000));

		if (this.handler && this.handler[core.status.current_project_type] && this.handler[core.status.current_project_type].before) {
			this.handler[core.status.current_project_type].before();
		} else {
			$(core).one('on_project_open', function() {
				core.module.layout.select('gLayoutTab_Terminal');
				setTimeout(function() {
					var output_list = core.module.plugin_linter.output_tab_list;
					var output_index = output_list.indexOf(core.status.current_project_type);

					core.module.layout.tab_manager.del_by_tab_name('south', 'output');
					if (output_index >= 0) {
						core.module.layout.tab_manager.make_output_tab(output_list[output_index]);
					}
					
					if (core.module.layout.workspace.window_manager.window.length === 0) {
						if (core.status.current_project_name === '') {
							document.title = 'goorm - cloud coding service';
						} else {
							document.title = core.status.current_project_name + ' - goorm';
						}
					}
				}, 700);
			});

			$(core).trigger('do_open');
		}
	},
	
};
