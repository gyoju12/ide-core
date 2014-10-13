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

	init: function() {

		var self = this;

		this.panel = $("#dlg_move_file");

		var handle_ok = function(panel) {

			var data = self.dialog_explorer.get_data();

			if (data.path === "" || data.name === "") {
				alert.show(core.module.localization.msg.alert_filename_empty);

				return false;
			}

			var postdata = {
				ori_path: $("#file_move_ori_path").val(),
				ori_file: $("#file_move_ori_file").val(),
				dst_path: data.path,
				dst_file: data.name
			};

			if (core.module.terminal.terminal) {
				core.module.terminal.fs_move(postdata.ori_path + "/" + postdata.ori_file, postdata.dst_path + "/" + postdata.dst_file, function on_move(data) {
					postdata.change = 'dialog_mv';
					postdata.file_type = core.status.selected_file_type == 'folder' ? 'folder' : 'file';
					if (postdata.ori_path + postdata.ori_file != postdata.dst_path + postdata.dst_file)
						core.module.layout.workspace.window_manager.synch_with_fs(postdata);
					//2.open file .....
					core.module.layout.project_explorer.refresh();
					self.panel.modal('hide');

					
				});
			} else {
				core.socket.once("/file/move", function(data) {
					if (data.err_code === 0) {
						postdata.change = 'dialog_mv';
						postdata.file_type = core.status.selected_file_type == 'folder' ? 'folder' : 'file';
						if (postdata.ori_path + postdata.ori_file != postdata.dst_path + postdata.dst_file)
							core.module.layout.workspace.window_manager.synch_with_fs(postdata);
						//2.open file .....
						core.module.layout.project_explorer.refresh();

						
					} else if (data.err_code == 20) {
						alert.show(data.message);

					} else {
						alert.show(data.message);
					}
				});
				core.socket.emit("/file/move", postdata);

				self.panel.modal('hide');
			}
		};


		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_move",
			id: "dlg_move_file",
			handle_ok: handle_ok,
			show: $.proxy(this.after_show, this),
			success: function() {

				$("#file_move_project_type").change(function() {
					var type = $(this).val();
					$("#move_dialog_center").find(".file_item").each(function() {
						if (type === 0) {
							$(this).css("display", "block");
						} else if ($(this).attr('filetype') == type) {
							$(this).css("display", "block");
						} else {
							$(this).css("display", "none");
						}
					});
				});
			}
		});

		this.dialog_explorer = new goorm.core.dialog.explorer("#file_move", this);
		this.bind();
	},

	show: function(context) {

		var self = this;
		self.dialog_explorer.init(true, true, false);
		self.is_alive_window = false;
		if (context) {
			if (core.status.current_project_path === core.status.selected_file) {
				alert.show("Cannot move!");
				return;
			}
			var filename = (core.status.selected_file.split("/")).pop();
			var filepath = core.status.selected_file.slice(0, core.status.selected_file.lastIndexOf('/')); // jeongmin: if file's parent and file have same name, replacing filename to blank will make wrong result
			filepath = filepath.replace("//", "/");

			$("#file_move_ori_file").attr("value", filename);
			$("#file_move_ori_path").attr("value", filepath);
			$("#file_move_target_name").attr("value", filename);

			var window_manager = core.module.layout.workspace.window_manager;

			for (var i = 0; i < window_manager.index; i++) {
				var window_filename = window_manager.window[i].filename;
				var window_filepath = window_manager.window[i].filepath;
				window_filepath = window_filepath + "/";
				window_filepath = window_filepath.replace("//", "/");

				if (window_manager.window[i].alive && window_filename == filename && window_filepath == filepath) {
					self.is_alive_window = true;
				}
			}
		} else {
			var window_manager = core.module.layout.workspace.window_manager;

			for (var i = 0; i < window_manager.index; i++) {
				if (window_manager.window[i].alive) {
					self.is_alive_window = true;
				}
			}

			if (self.is_alive_window) {
				$("#file_move_ori_file").attr("value", window_manager.window[window_manager.active_window].filename);
				$("#file_move_ori_path").attr("value", window_manager.window[window_manager.active_window].filepath);
				$("#file_move_target_name").attr("value", window_manager.window[window_manager.active_window].filename);
			} else {
				var temp_path = core.status.selected_file;
				var temp_name = temp_path.split("/").pop();
				temp_path = temp_path.replace(temp_name, "");

				$("#file_move_ori_file").attr("value", temp_name);
				$("#file_move_ori_path").attr("value", temp_path);
				$("#file_move_target_name").attr("value", temp_name);
			}

		}
		$("#file_move_target_name").val(core.status.selected_file.split('/').pop());



		this.panel.modal('show');

	},

	after_show: function() {
		$("#file_move_dir_tree").find(".jstree-clicked").click();
		// var files = this.dialog_explorer.files;
		// $(files).click();
	},

	bind: function() {
		var self = this;
		var files = this.dialog_explorer.files;


		// when enter 'enter' key, dialog OK.
		this.panel.keydown(function (e) {
			switch (e.keyCode) {
				case 13: 	// 'enter' key
					$("#g_mf_btn_ok").click();
					break;
			}
		});

		// when enter 'tab' key, move from left tree to right file view 
		$("#file_move_dir_tree").keydown(function (e) {
			switch (e.keyCode) {
				case 9: 	// 'tab' key
					$(files).find("div")[0].click();
					return false;
			}
		});

		// on selecting file view
		$(files).on("click", "div.file_item", function() {
			self.filename = $(this).attr("filename");
			self.filetype = $(this).attr("filetype");
			self.filepath = $(this).attr("filepath");
		});
	}
};