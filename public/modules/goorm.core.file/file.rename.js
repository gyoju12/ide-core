/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file.rename = {
	dialog: null,
	buttons: null,
	tabview: null,
	treeview: null,
	is_alive_window: null,

	init: function() {

		var self = this;

		this.panel = $("#dlg_rename_file");

		var dst_name_check = function(dst_name) {
			/*var strings = "{}[]()<>?|~`!@#$%^&*+\"'\\/ ";
			for (var i = 0; i < strings.length; i++)
				if (dst_name.indexOf(strings[i]) != -1) return false;
			return true;*/
			if (/[^a-zA-Z0-9\_\-\.]/.test(dst_name)){
				return false;
			}else{
				return true;
			}
		};

		var handle_ok = function(panel) {
			var ori_path = $("#input_rename_old_filepath").val();
			var ori_name = $("#input_rename_old_filename").val();
			var dst_name = $("#input_rename_new_filename").val();

			if(ori_name == dst_name){
				return false;
			}

			$("#input_rename_new_filename").blur();
	
			if (dst_name === "") {
				alert.show(core.module.localization.msg.alert_filename_empty);
				return false;
			} else if (dst_name.indexOf(" ") != -1) {
				alert.show(core.module.localization.msg.alert_allow_file_has_valid_name);
				return false;
			} else if (!dst_name_check(dst_name)) {
				alert.show(core.module.localization.msg.alert_allow_file_has_valid_name);
				return false;
			}

			var postdata = {
				ori_path: $("#input_rename_old_filepath").val(),
				ori_name: $("#input_rename_old_filename").val(),
				dst_name: $("#input_rename_new_filename").val()
			};

			function do_rename(data) {
				if (core.module.terminal.terminal) {
					function do_fs_rename(){
						core.module.terminal.fs_move(postdata.ori_path + "/" + postdata.ori_name, postdata.ori_path + "/" + postdata.dst_name, function on_move(data) {
							var window_manager = core.module.layout.workspace.window_manager;
							var window_list = window_manager.window;

							for (var i = window_list.length - 1; i >= 0; i--) {
								if ((window_list[i].title).indexOf(ori_path + ori_name) > -1) {
									window_list[i].is_saved = true;
									window_list[i].tab.is_saved = true;

									var old_path = window_list[i].title;

									var new_path = old_path.replace(ori_path + ori_name, ori_path + dst_name);

									var filename = new_path.split('/').pop();
									var filepath = new_path.substring(0, new_path.length - filename.length);
									var filetype = postdata.dst_name.slice(postdata.dst_name.lastIndexOf('.') + 1); // jeongmin: extract dst file name's filetype (filetype can be changed)

									// window_list[i].close();
									window_manager.close_by_index(i, i); // panel idx, tab idx

									if (data.type == 'file') { // jeongmin: only file can be opened
										core.module.layout.workspace.window_manager.open(filepath, filename, filetype);

										
									}
								}
							}

							core.module.layout.project_explorer.refresh();
							self.panel.modal('hide');
						});
					}
					if (data && data.exist && data.type == 'file') {
						core.module.terminal.fs_rm(ori_path + "/" + dst_name, function on_delete_file() {
							do_fs_rename();
						});
					}else{
						do_fs_rename();
					}
				} else {
					function do_file_rename(){
						core._socket.once("/file/rename", function(data) {
							var received_data = data;

							if (received_data.err_code === 0) {
								var window_manager = core.module.layout.workspace.window_manager;
								var window_list = window_manager.window;

								for (var i = window_list.length - 1; i >= 0; i--) {
									if ((window_list[i].title).indexOf(ori_path + ori_name) > -1) {
										window_list[i].is_saved = true;
										window_list[i].tab.is_saved = true;

										var old_path = window_list[i].title;

										var new_path = old_path.replace(ori_path + ori_name, ori_path + dst_name);

										var filename = new_path.split('/').pop();
										var filepath = new_path.substring(0, new_path.length - filename.length);
										var filetype = window_list[i].filetype;

										// window_list[i].close();
										window_manager.close_by_index(i, i); // panel idx, tab idx

										if (data.type == 'file') { // jeongmin: only file can be opened
											core.module.layout.workspace.window_manager.open(filepath, filename, filetype);

											
										}
									}
								}

								core.module.layout.project_explorer.refresh();
							} else if (received_data.err_code == 20) {
								alert.show(core.module.localization.msg[received_data.message]);
							} else {
								alert.show(received_data.message);
							}
						});
						core._socket.emit("/file/rename", postdata);
						self.panel.modal('hide');
					}
					if (data && data.exist && data.type == 'file') {
						var _postdata = {
							filename: ori_path + "/" + dst_name
						};
						core._socket.once("/file/delete", function(data) {
							do_file_rename();
						}, true);
						core._socket.emit("/file/delete", _postdata);
					}else{
						do_file_rename();
					}

				}
			}

			self.check_exist(postdata, 'confirmation_rename_message', do_rename);
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			id: "dlg_rename_file",
			handle_ok: handle_ok,
			success: null,
			show: $.proxy(this.after_show, this)
		});

		// enter key 'OK'
		$("#input_rename_new_filename").keydown(function(e) {
			switch (e.keyCode) {
				case 13: // key 'enter'
					$("#g_rf_btn_ok").click();
					break;
				case 27: // key 'esc'
					$("#g_rf_btn_cancel").click();
					break;
			}
		});
	},

	show: function(context) {
		this.is_alive_window = false;

		if (core.status.selected_file === core.status.current_project_path) {
			alert.show(core.module.localization.msg.alert_project_rename);
			return;
		}
		if (context) {
			var fullpath = core.status.selected_file.split("/");

			var filename = fullpath.pop();
			var filepath = fullpath.join('/') + '/';
			filepath = filepath.replace("//", "/");

			$("#input_rename_new_filename").val(filename);
			$("#input_rename_old_filepath").val(filepath);
			$("#input_rename_old_filename").val(filename);

			var window_manager = core.module.layout.workspace.window_manager;

			for (var i = 0; i < window_manager.index; i++) {
				var window_filename = window_manager.window[i].filename;
				var window_filepath = window_manager.window[i].filepath;
				window_filepath = window_filepath + "/";
				window_filepath = window_filepath.replace("//", "/");

				if (window_manager.window[i].alive && window_filename == filename && window_filepath == filepath) {
					this.is_alive_window = true;
				}
			}



			this.panel.modal('show');
		} else {
			var window_manager = core.module.layout.workspace.window_manager;

			for (var i = 0; i < window_manager.index; i++) {
				if (window_manager.window[i].alive) {
					this.is_alive_window = true;
				}
			}

			if (this.is_alive_window) {
				$("#input_rename_new_filename").val(window_manager.window[window_manager.active_window].filename);
				$("#input_rename_old_filepath").val(window_manager.window[window_manager.active_window].filepath);
				$("#input_rename_old_filename").val(window_manager.window[window_manager.active_window].filename);
			} else if (core.status.selected_file) {
				var fullpath = core.status.selected_file.split("/");

				var temp_name = fullpath.pop();
				var temp_path = fullpath.join('/') + '/';
				temp_path = temp_path.replace("//", "/");

				$("#input_rename_new_filename").val(temp_name);
				$("#input_rename_old_filepath").val(temp_path);
				$("#input_rename_old_filename").val(temp_name);
			} else {
				// alert please click ...
				//
			}

			this.panel.modal('show');
		}
	},

	after_show: function() {
		$("#input_rename_new_filename").focus();
	},

	// check file exists. Jeong-Min Im.
	check_exist: function(postdata, confirm_msg, callback) {
		var localization = core.module.localization.msg;
		core._socket.once('/file/exist', function(data) {
			if (data.err_code == 0) {
				if (data.exist) {
					confirmation.init({
						message: localization[confirm_msg],
						yes_text: localization.confirmation_yes,
						no_text: localization.confirmation_no,
						title: "Confirmation",

						yes: function() {
							callback(data);
						},
						no: function() {}
					});

					confirmation.show();
				} else {
					callback();
				}
			} else {
				var msg = '' || localization[data.message];

				alert.show(localization[data.message]);
			}
		});
		core._socket.emit('/file/exist', postdata);
	}
};
