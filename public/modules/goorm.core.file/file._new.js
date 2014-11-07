/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file._new = {
	dialog: null,
	buttons: null,
	is_new_anyway: false,
	dialog_explorer: null,

	init: function() {
		var self = this;

		this.panel = $("#dlg_new_file");

		var dst_name_check = function(dst_name) {
			/*var strings = "{}[]()<>?|~`!@#$%^&*+\"'\\/";
			for (var i = 0; i < strings.length; i++)
				if (dst_name.indexOf(strings[i]) != -1) return false;
			return true;*/
			if (/[^a-zA-Z0-9\_\-\.\(\)\[\]]/.test(dst_name)){
				return false;
			}else{
				return true;
			}
		};

		var handle_ok = function() {
			var localization = core.module.localization.msg;
			var data = self.dialog_explorer.get_data();

			if (data.path === "" || data.name === "") {
				alert.show(localization.alert_filename_empty);
				return false;
			}

			if (data === false || !dst_name_check(data.name)) {
				alert.show(localization.alert_allow_character);
				return false;
			}

			if (data.path == "/") {
				alert.show(localization.alert_deny_make_file_in_workspace_root);
				return;
			}
			var postdata = {
				new_anyway: self.is_new_anyway,
				path: data.path + "/" + data.name,
				type: data.type
			};
			//$.get("file/new", postdata, function (data) {
			core._socket.once("/file/new", function(data) {
				if (data.err_code == 99) {
					confirmation.init({
						message: localization.confirmation_new_message,
						yes_text: localization.confirmation_yes,
						no_text: localization.confirmation_no,
						title: "Confirmation",


						yes: function() {
							self.is_new_anyway = true;
							handle_ok();
						},
						no: function() {}
					});

					confirmation.show();
				} else if (data.err_code === 0) {
					self.panel.modal('hide');

					if (self.is_new_anyway) { // jeongmin: if exists and opened, close created file
						var window_manager = core.module.layout.workspace.window_manager;
						var windows = window_manager.window;
						for (var i = windows.length - 1; 0 <= i; i--) {
							if ((windows[i].title).indexOf(postdata.path) > -1) {
								windows[i].is_saved = true;
								windows[i].tab.is_saved = true;

								window_manager.close_by_index(i, i);

								// jeongmin: these are should be done after deleting selected file
								core.status.selected_file = "";
								core.status.selected_file_type = "";

								break;
							}
						}
					}

					core.module.layout.project_explorer.refresh();
				} else if (data.err_code == 20) {
					var msg = localization[data.message] || data.message;
					alert.show(msg);

				} else {
					var msg = localization[data.message] || data.message;
					alert.show(msg);
				}
			});
			core._socket.emit("/file/new", postdata);
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_new_file",
			id: "dlg_new_file",
			handle_ok: handle_ok,
			success: null,
			show: $.proxy(this.after_show, this)
		});

		// enter key 'OK'
		$("#file_new_target_name").keydown(function(e) {
			switch (e.which) {
				case 13: // enter key
					$("#g_nf_btn_ok").click();
					break;
				case 27: // esc key
					$("#g_nf_btn_cancel").click();
					break;
			}
		});

		this.dialog_explorer = new goorm.core.dialog.explorer("#file_new", this);
	},

	show: function() {
		this.is_new_anyway = false;
		this.dialog_explorer.init(true, true);
		this.panel.modal('show');
	},

	after_show: function() {
		// var files = this.dialog_explorer.files;
		// $(files).click();
		$("#file_new_target_name").focus();
	},

	expand: function(tree_div, src) {
		var self = this;
		var nodes = src.split('/');

		var target_parent = "";
		var target_name = "";

		function get_node_by_path(node) {
			if (node.data.parent_label == target_parent && node.data.name == target_name) return true;
			else return false;
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
	},

	add_items: function(item_div, src) {
		this.dialog_explorer.add_file_items(src);
	}
};
