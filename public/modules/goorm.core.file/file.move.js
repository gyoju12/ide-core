/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file.move = {
	dialog: null,
	buttons: null,
	dialog_explorer: null,
	selected_item: null, // selected items in project treeview
	project_root_error: false,

	init: function() {

		var self = this;

		this.panel = $('#dlg_move_file');

		var handle_ok = function(panel) {
			var data = self.dialog_explorer.get_data();

			if (data.path === '') {
				alert.show(core.module.localization.msg.alert_filename_empty);

				return false;
			}

			self.send({
				ori_path: self.selected_item,
				dst_path: data.path,
			});
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_move",
			id: 'dlg_move_file',
			handle_ok: handle_ok,
			show: $.proxy(this.after_show, this),
			success: function() {

				// $("#file_move_project_type").change(function() {
				// 	var type = $(this).val();
				// 	$("#move_dialog_center").find(".file_item").each(function() {
				// 		if (type === 0) {
				// 			$(this).css("display", "block");
				// 		} else if ($(this).attr('filetype') == type) {
				// 			$(this).css("display", "block");
				// 		} else {
				// 			$(this).css("display", "none");
				// 		}
				// 	});
				// });
			}
		});

		this.dialog_explorer = new goorm.core.dialog.explorer('#file_move', this);
		this.bind();
	},

	show: function() {
		var self = this;

		this.selected_item = core.module.layout.project_explorer.get_tree_selected_path();

		if (this.selected_item.files.length || this.selected_item.directorys.length) {
			this.selected_item = this.selected_item.files.concat(this.selected_item.directorys);

			var cur_project_path_index = this.selected_item.indexOf(core.status.current_project_path);

			if (~cur_project_path_index) {
				this.project_root_error = true;
				this.selected_item.splice(cur_project_path_index, 1); // remove root

				if (!this.selected_item.length) { // user selects project root only
					return;
				}
			}

			this.dialog_explorer.init(true, true, true);
			this.panel.modal('show');
		} else {
			alert.show(core.module.localization.msg.alert_select_file);
		}
	},

	after_show: function() {
		$('#file_move_dir_tree').find('.jstree-clicked').click();
		// var files = this.dialog_explorer.files;
		// $(files).click();
	},

	bind: function() {
		var self = this;
		var files = this.dialog_explorer.files;

		// when enter 'enter' key, dialog OK.
		this.panel.keydown(function(e) {
			switch (e.keyCode) {
				case 13: // 'enter' key
					$('#g_mf_btn_ok').click();
					break;
			}
		});

		// when enter 'tab' key, move from left tree to right file view
		$('#file_move_dir_tree').keydown(function(e) {
			switch (e.keyCode) {
				case 9: // 'tab' key
					$(files).find('div')[0].click();
					return false;
			}
		});

		// on selecting file view
		$(files).on('click', 'div.file_item', function() {
			self.filename = $(this).attr('filename');
			self.filetype = $(this).attr('filetype');
			self.filepath = $(this).attr('filepath');
		});
	},

	send: function(postdata) {
		var self = this;
		var layout = core.module.layout;

		// if (core.module.terminal.terminal) {
		// 	function _move(file_data) {
		// 		core.module.terminal.fs_move(file_data.ori_path + "/" + file_data.ori_file, file_data.dst_path + "/" + file_data.dst_file, function on_move(data) {
		// 			file_data.change = 'dialog_mv';
		// 			file_data.file_type = core.status.selected_file_type == 'folder' ? 'folder' : 'file';
		// 			if (file_data.ori_path + file_data.ori_file != file_data.dst_path + file_data.dst_file)
		// 				layout.workspace.window_manager.synch_with_fs(file_data);
		// 			//2.open file .....
		// 			layout.project_explorer.treeview.open_path(file_data.dst_path);
		// 			layout.project_explorer.refresh();
		// 			self.panel.modal('hide');

		// 			
		// 		});
		// 	}

		// 	if (postdata.ori_file && postdata.dst_file) { // jeongmin: from dialog. Only one file.
		// 		_move(postdata);
		// 	} else { // jeongmin: from drag and drop. Can be multiple files.
		// 		for (var i = postdata.ori_path.length - 1; 0 <= i; i--) {
		// 			var cur_ori_path = postdata.ori_path[i];
		// 			var file = cur_ori_path.slice(cur_ori_path.lastIndexOf('/') + 1);

		// 			_move({
		// 				ori_path: cur_ori_path.slice(0, cur_ori_path.lastIndexOf('/')),
		// 				ori_file: file, // jeongmin: file name is same on drag and drop
		// 				dst_path: postdata.dst_path,
		// 				dst_file: file
		// 			});
		// 		}
		// 	}
		// } else {
		core._socket.once('/file/move', function(data) {
			var localization_msg = core.module.localization.msg;
			var err_files = '\n';
			var treeview = layout.project_explorer.treeview;

			if (data.err_files) {
				if (data.err_files.length) { // array
					err_files += data.err_files.join(', ');
				} else { // string
					err_files += data.err_files;
				}

				if (self.project_root_error) {
					err_files += '\n' + localization_msg.alert_move_error;
				}

				postdata.ori_path = postdata.ori_path.filter(function(item) { // remove error files
					return data.err_files.indexOf(item) === -1;
				});
			}

			if (postdata.ori_path.length) { // if there is succeed files
				var bookmark_list = goorm.core.edit.bookmark_list.list;
				var refreshed_node = [];
				for (var i = postdata.ori_path.length - 1; 0 <= i; i--) { // update bookmark list
					var cur_selected_item = postdata.ori_path[i];
					var file_path = cur_selected_item.split('/');
					var file_name = file_path.pop();

					if (bookmark_list[cur_selected_item]) {
						bookmark_list[postdata.dst_path + '/' + file_name] = bookmark_list[cur_selected_item];
						delete bookmark_list[cur_selected_item]; // have to go to list
					}

					file_path = file_path.join('/');
					if (!~refreshed_node.indexOf(file_path)) {
						refreshed_node.push(file_path);
						treeview.refresh_node(file_path);
					}
				}

				//2.open file .....
				treeview.refresh_node(postdata.dst_path);
				treeview.open_path(postdata.dst_path);

				// TODO: Below codes close moved file's window. -> Need to choose what work will appropriate (close, re-open, automatic, nothing, etc).
				// postdata.change = 'dialog_mv';
				// postdata.file_type = core.status.selected_file_type == 'folder' ? 'folder' : 'file';
				// if (postdata.ori_path + postdata.ori_file != postdata.dst_path + postdata.dst_file) {
				// 	layout.workspace.window_manager.synch_with_fs(postdata);
				// }
			}

			switch (data.err_code) {
				case 0:
					if (self.project_root_error) {
						alert.show(localization_msg.alert_move_error);
					}
					break;

				case 18: // EINVAL
					alert.show(localization_msg.alert_invalide_query + err_files);
					break;

				case 20:
					alert.show(localization_msg.alert_permission_denied + err_files);
					break;

				case 27: // ENOTDIR
					alert.show(localization_msg.alert_move_not_directory + err_files);
					break;

				case 28: // EISDIR
					alert.show(localization_msg.alert_move_is_directory + err_files);
					break;

				case 53: // ENOTEMPTY
					alert.show(localization_msg.alert_move_not_empty_directory + err_files);
					break;

				default:
					alert.show(localization_msg.alert_move_error + err_files);
			}

			self.project_root_error = false; // initialize
		});
		core._socket.emit('/file/move', postdata);

		self.panel.modal('hide');
		// }
	}
};
