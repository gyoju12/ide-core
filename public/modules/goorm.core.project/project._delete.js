/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project._delete = {
	dialog: null,
	buttons: null,
	chat: null,
	project_list: null,
	processing: false,

	init: function() {

		var self = this;

		this.panel = $('#dlg_delete_project');
		// this.panel.click(function() {	// hidden: storage is deprecated
		// 	$('button[localization_key=common_target]').blur();
		// });
		this.panel.on('focus', function(e) {
			e.stopPropagation();
			$('#project_delete_list').focus();
		});

		
		this.__handle_delete = $.debounce(function() { // jeongmin: prevent multiple export
			self.processing = true;
			$(core).trigger('on_project_before_delete');

			var data = self.project_list.get_data();
			var delete_project_path = data.path;
			var delete_project_type = data.type;
			var postdata = {
				project_path: delete_project_path
			};
			// var storage = $('#project_delete_storage').find('span').html().toString();	// hidden: storage is deprecated

			// if (storage == 'goormIDE Storage') {
			var do_delete = function() {
				core._socket.once('/project/delete', function(data) {
					$('#project_delete_list').empty();

					var received_data = data;
					if (received_data.err_code === 0) {

						
						// var window_manager = core.module.layout.workspace.window_manager;
						// $(window_manager.window).each(function (i) {
						// 	if (postdata.project_path == this.project && this.storage == 'goormIDE_Storage') {
						// 		window_manager.close_by_index(i, i);
						// 	}
						// });

						goorm.core.edit.bookmark_list.delete_project_bookmarks(delete_project_path);

						var wm = core.module.layout.workspace.window_manager;

						for (var i = wm.window.length - 1; i >= 0; i--) {
							var w = wm.window[i];

							// if (postdata.project_path == w.project && w.storage == 'goormIDE_Storage') {
							if (postdata.project_path == w.project) { // hidden: storage is deprecated
								w.is_saved = true; // jeongmin: don't ask 'save changes confirmation'. Because we delete this project!

								wm.close_by_index(i, i);
							}
						}

						core.module.debug.button_inactive();
						$('#project_delete_list .selected_button').blur();
						notice.show(core.module.localization.msg.notice_project_delete_done);

						if (core.module.layout.project_explorer.treeview) {
							core.module.layout.project_explorer.remove_explorer_treeview(delete_project_path);
						}
						// project list focusing is needed for enable key event. Jeong-Min Im.
						// notice.panel.one('hidden.bs.modal', function() {
						// 	$('#project_delete_list').focus();
						// });
					} else {
						alert.show(core.module.localization.msg.alert_cannot_project_delete);

						// project list focusing is needed for enable key event. Jeong-Min Im.
						// alert.panel.one('hidden.bs.modal', function() {
						// 	$('#project_delete_list').focus();
						// });
					}
					var tab_manager = core.module.layout.tab_manager;

					$.each(tab_manager.list, function(key, value) {
						if (~key.indexOf('gLayoutServer_') && ~key.indexOf(delete_project_type) && $('#' + value.id + ' .badge').length > 0) {
							$('#' + value.id + ' .badge').click();
						}
					});

					if (core.status.current_project_path === '' || core.status.current_project_path == data.path) {
						tab_manager.del_by_tab_name('south', 'tab_title_build');
						tab_manager.del_by_tab_name('south', 'tab_title_run');
						core.module.layout.project_explorer.refresh();
						document.title = 'goorm - cloud coding service';
					} else {
						switch (core.status.current_project_type) {
							case 'cpp':
							case 'java':
							case 'go':
							case 'dart':
							case 'jsp':
								tab_manager.del_by_tab_name('south', 'tab_title_' + delete_project_type);
								break;

							default:
								tab_manager.del_by_tab_name('south', 'tab_title_build');
								break;
						}
						core.module.layout.project_explorer.refresh_project_selectbox();
					}

					$('#gLayoutTab_Terminal').click();
					$('#south_tab + div.tab-content div.tab-pane').removeClass('active').removeClass('in');
					$('#south_tab + div.tab-content div.terminal').addClass('active').addClass('in');

					core.module.layout.terminal.resize();

					self.project_list = new goorm.core.project.list();
					self.project_list.init('#project_delete', function() {
						self.project_list.init_project(); //let's set first project
						$('#project_delete_list').focus();

						self.processing = false;
						self.show();
					});
				}, true, {
					lock: true
				}); // jeongmin: last parameter means hiding lock. True -> Can't hide loading bar.
				core._socket.emit('/project/delete', postdata);
			};
			if (postdata.project_path == core.status.current_project_path) {
				$(core).one('on_project_open', function() {
					do_delete();
				});

				

				core.status.current_project_path = '';
				core.status.current_project_name = '';
				core.status.current_project_type = '';
				core.dialog.open_project.open('', '', '');
			} else {
				do_delete();
			}

			// }
		}, 400, true); // jeongmin: true means invokeAsap

		this.project_list = new goorm.core.project.list();
		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: 'title_delete_project',
			id: 'dlg_delete_project',
			help_url: 'http://help.goorm.io/ide#help_manage_project_delete',
			handle_ok: function() {
				if (!self.processing) {
					var data = self.project_list.get_data();

					if (data.path === '') {
						alert.show(core.module.localization.msg.alert_project_not_selected);
					} else {
						if (typeof core.status.current_running_server[data.path] !== 'undefined') {
							confirmation.init({
								title: core.module.localization.msg.confirmation_title,
								message: core.module.localization.msg.confirmation_server_running_delete_msg,
								yes_text: core.module.localization.msg.yes,
								no_text: core.module.localization.msg.no,
								yes: function() {
									$('#gLayoutServer_' + core.status.current_running_server[data.path]).find('.hide_tab').click();
									$('#gLayoutServer_' + core.status.current_running_server[data.path]).find('.server_btn').click();
									self.processing = true;
									self.__handle_delete();
								},
								no: function() {
									$('#project_delete_list').focus();
								}
							});

							confirmation.show();
						} else {
							confirmation.init({
								title: core.module.localization.msg.confirmation_delete_title,
								message: core.module.localization.msg.confirmation_delete_project,
								yes_text: core.module.localization.msg.yes,
								no_text: core.module.localization.msg.no,
								yes: function() {
									self.processing = true;
									self.__handle_delete();
								},
								no: function() {
									$('#project_delete_list').focus();
								}
							});
							confirmation.show();
						}
						// if(delete_server) {
						// 	confirmation.init({
						// 		title: core.module.localization.msg.confirmation_title,
						// 		message: core.module.localization.msg.confirmation_server_running_delete_msg,
						// 		yes_text: core.module.localization.msg.confirmation_yes,
						// 		no_text: core.module.localization.msg.confirmation_no,
						// 		yes: function() {
						// 			$('#gLayoutServer_'+delete_server).find('.hide_tab').click()
						// 			self.processing = true;
						// 			self.__handle_delete();
						// 		},
						// 		no: function() {
						// 			$('#project_delete_list').focus();
						// 		}
						// 	});

						// 	confirmation.show();
						// } else {
						// 	confirmation.show();
						// }
					}
				}

			},

			// success: function() {	// hidden: storage is deprecated
			// 	$('#project_delete_storage').find('span').html('goormIDE_Storage');
			// 	$(document).on('click', 'li.delete.storage', function() {
			// 		// var storage = $(this).find('a').html();
			// 		$('button[localization_key=common_target]').blur();
			// 		// $('#project_delete_storage').find('span').html(storage);
			// 		// $('#project_delete_list').empty();
			// 		// $('#project_delete_information').empty();
			// 		// if (storage == 'goormIDE Storage') {
			// 		// 	self.project_list = new goorm.core.project.list();
			// 		// }
			// 		// else if (storage == 'Google Drive') {

			// 		// }
			// 		//self.project_list.init('#project_delete');
			// 	});
			// },

			//the modal has been made visible to the user! Jeong-min Im.
			show: function() {
				self.project_list.init_project(); //let's set first project
				$('#project_delete_list').focus();
			}
		});
	},

	show: function(list_callback) {
		var self = this;
		this.project_list.init('#project_delete', list_callback);

		this.project_list.set_keydown_event({
			'handler': function() {
				if (!self.processing && $('.modal:visible').length === 1) { // only when there is delete project dialog
					var data = self.project_list.get_data();
					if (data.path === '') {
						alert.show(core.module.localization.msg.alert_project_not_selected);
					} else {
						confirmation.init({
							title: core.module.localization.msg.confirmation_delete_title,
							message: core.module.localization.msg.confirmation_delete_project,
							yes_text: core.module.localization.msg.yes,
							no_text: core.module.localization.msg.no,
							yes: function() {
								self.processing = true;
								self.__handle_delete();
							},
							no: function() {
								$('#project_delete_list').focus();
							}
						});

						confirmation.show();
					}
				}
			}
		});

		this.panel.modal('show');
	},

	all_delete: function() {
		// jeongmin: make all windows saved
		var wm = core.module.layout.workspace.window_manager;
		for (var i = wm.window.length - 1; i >= 0; i--) {
			wm.window[i].is_saved = true; // jeongmin: don't ask 'save changes confirmation'. Because we delete this project!
		}
		//every window close
		wm.close_all();

		//etc
		core.module.debug.button_inactive();

		//go to project list state
		if (core.status.current_project_path !== '') {
			

			core.status.current_project_path = '';
			core.status.current_project_name = '';
			core.status.current_project_type = '';
			core.dialog.open_project.open('', '', '');
		}

		//real delete start

		for (var o in core.workspace) {
			if (!o) {
				continue;
			}

			core._socket.once('/project/delete', function() {
				core.module.layout.project_explorer.refresh();
			}, true);
			core._socket.emit('/project/delete', {
				project_path: o + ''
			});
		}
	}
};
