/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file._new.folder = {
	dialog: null,
	buttons: null,
	dialog_explorer: null,

	init: function() {
		var self = this;

		this.panel = $('#dlg_new_folder');

		var dst_name_check = function(dst_name) {
			// var strings = "{}[]()<>?|~`!@#$%^&*+\"' ";
			// for (var i = 0; i < strings.length; i++)
			// 	if (dst_name.indexOf(strings[i]) != -1) return false;
			if (core.module.file.test(dst_name)) {
				return false;
			} else {
				return true;
			}

			// if (dst_name.indexOf('..') > -1) return false; // jeongmin: prevent access higher directory

			// return true;
		};

		var handle_ok = function(panel) {
			var localization = core.module.localization.msg;
			var data = self.dialog_explorer.get_data();

			if (data == false) {
				// when folder name has space(' '), get_data returns false
				alert.show(localization.alert_invalid_folder_name);
				return false;
			}
			if (data.path == '/') {
				alert.show(localization.alert_deny_make_folder_in_workspace_root);
				return;
			}

			if (!dst_name_check(data.name)) {
				alert.show(localization.alert_invalid_folder_name);
				return false;
			}

			if (data.path === '' || data.name === '') {
				alert.show(localization.alert_filename_empty);

				return false;
			} else {
				var postdata = {
					current_path: data.path,
					folder_name: data.name
				};

				// check input name exists or not. Jeong-Min Im.
				core.dialog.rename_file.check_exist(postdata, 'confirmation_new_message', function(check_data) {
					// if (core.module.terminal.terminal) {
					// 	// actual making new folder. Jeong-Min Im.
					// 	function do_fs_mkdir() {
					// 		core.module.terminal.fs_mkdir(data.path + "/" + data.name, function on_mkdir(check_data) {
					// 			var m = check_data.match(/mkdir\:.*/m);
					// 			if (m) {
					// 				alert.show(localization.alert_not_directory);
					// 			} else {
					// 				core.module.layout.project_explorer.treeview.open_path(data.path);
					// 				core.module.layout.project_explorer.refresh();
					// 			}
					// 		});
					// 	}

					// 	if (check_data && check_data.exist) { // jeongmin: first, remove exist folder
					// 		core.module.terminal.fs_rm(data.path + "/" + data.name, function on_delete_file() {
					// 			core.module.layout.project_explorer.refresh();

					// 			var window_manager = core.module.layout.workspace.window_manager;
					// 			var window_list = window_manager.window;

					// 			for (var i = window_list.length - 1; i >= 0; i--) {
					// 				if ((window_list[i].title).indexOf(core.status.selected_file) > -1) {
					// 					window_list[i].is_saved = true;
					// 					window_list[i].tab.is_saved = true;
					// 					// window_list[i].close(i);
					// 					window_manager.close_by_index(i, i);

					// 					// jeongmin: these are should be done after deleting selected file
					// 					core.status.selected_file = "";
					// 					core.status.selected_file_type = "";

					// 					break; // jeongmin: we find our target file, so no need to go further
					// 				}
					// 			}

					// 			do_fs_mkdir();
					// 		});
					// 	} else { // jeongmin: not exists, new folder
					// 		do_fs_mkdir();
					// 	}
					// } else {
					// actual making new folder. Jeong-Min Im.
					function do_file_new_folder() {
						//$.get("file/new_folder", postdata, function (data) {
						core._socket.once('/file/new_folder', function(check_data) {
							if (check_data.err_code === 0) {
								core.module.layout.project_explorer.treeview.refresh_node(data.path);
								core.module.layout.project_explorer.treeview.open_path(data.path);
							} else if (check_data.err_code == 20) {
								alert.show(localization[check_data.message]);

							} else {
								alert.show(check_data.message);
							}
						});

						core._socket.emit('/file/new_folder', postdata);
					}

					if (check_data && check_data.exist) { // jeongmin: first, remove exist folder
						var _postdata = {
							filename: data.path + '/' + data.name
						};

						core._socket.once('/file/delete', function(data) {
							var window_manager = core.module.layout.workspace.window_manager;
							var window_list = window_manager.window;

							for (var i = window_list.length - 1; i >= 0; i--) {
								if ((window_list[i].title).indexOf(core.status.selected_file) > -1) {
									window_list[i].is_saved = true;
									window_list[i].tab.is_saved = true;
									// window_list[i].close(i);
									window_manager.close_by_index(i, i);

									// jeongmin: these are should be done after deleting selected file
									core.status.selected_file = '';
									core.status.selected_file_type = '';

									break; // jeongmin: we find our target file, so no need to go further
								}
							}

							do_file_new_folder();
						}, true);

						core._socket.emit('/file/delete', _postdata);
					} else { // jeongmin: not exists, new folder
						do_file_new_folder();
					}
					// }
				});
			}

			if (typeof(this.hide) !== 'function' && panel) {

				self.panel.modal('hide');
			} else {

				self.panel.modal('hide');
			}
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_new_folder",
			id: 'dlg_new_folder',
			handle_ok: handle_ok,
			success: null,
			show: $.proxy(this.after_show, this)
		});

		// enter key 'OK'
		this.panel.keydown(function(e) {
			switch (e.which) {
				case 13: // enter key
					$('#g_nfo_btn_ok').click();
					break;
				// case 27:
				// 	$("#g_nfo_btn_close").click();
				// 	break;
			}
		});

		this.dialog_explorer = new goorm.core.dialog.explorer('#folder_new', this);
		this.bind();
	},

	show: function() {
		this.dialog_explorer.init(false, true);
		this.panel.modal('show');
	},

	after_show: function() {
		$('#folder_new_dir_tree').find('.jstree-clicked').click();
		$('#folder_new_target_name').focus();
	},

	bind: function() {
		var self = this;
		var files = this.dialog_explorer.files;

		$('#g_nfo_btn_ok').keydown(function(e) {
			if (e.keyCode == 9) {
				$('#folder_new_dir_tree').find('.jstree-clicked').click();
			}
			e.preventDefault();
		});

		$(files).on('click', 'div.file_item', function() {
			self.filename = $(this).attr('filename');
			self.filetype = $(this).attr('filetype');
			self.filepath = $(this).attr('filepath');
		});
	},

	expand: function(tree_div, src) {
		var self = this;
		var nodes = src.split('/');

		var target_parent = '';
		var target_name = '';

		function get_node_by_path(node) {
			if (node.data.parent_label == target_parent && node.data.name == target_name) {
				return true;
			} else {
				return false;
			}
		}

		for (var i = 0; i < nodes.length; i++) {
			target_name = nodes[i];

			var target_node = self.dialog_explorer.treeview.getNodesBy(get_node_by_path);
			if (target_node) {
				target_node = target_node.pop();
				target_node.expand();
			}

			target_parent += nodes[i] + '/';
		}
	}
};
