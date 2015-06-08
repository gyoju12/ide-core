/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file._new.untitled_textfile = {
	dialog: null,
	buttons: null,
	dialog_explorer: null,

	init: function() {
		var self = this;

		this.panel = $('#dlg_new_untitled_textfile');

		var handle_ok = function(panel) {

			var data = self.dialog_explorer.get_data();

			if (data.path === '') {
				alert.show(core.module.localization.msg.alert_filename_empty);
				return false;
			}

			if (data.path == '/') {
				alert.show(core.module.localization.msg.alert_deny_make_file_in_workspace_root);
				return;
			}

			var postdata = {
				current_path: data.path
			};
			//$.get("file/new_untitled_text_file", postdata, function (data) {
			core._socket.once('/file/new_untitled_text_file', function(check_data) {

				if (check_data.err_code === 0) {
					core.module.layout.project_explorer.treeview.refresh_node(data.path);
					core.module.layout.project_explorer.treeview.open_path(data.path);
					core.module.layout.workspace.window_manager.open(data.path + '/', check_data.filename, data.type);
				} else if (check_data.err_code == 20) {
					alert.show(core.module.localization.msg[check_data.message]);

				} else {
					alert.show(check_data.message);
				}

			});
			core._socket.emit('/file/new_untitled_text_file', postdata);

			if (typeof(this.hide) !== 'function' && panel) {

				self.panel.modal('hide');
			} else {

				self.panel.modal('hide');
			}
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_new_untitled_text_file",
			id: 'dlg_new_untitled_textfile',
			handle_ok: handle_ok,
			success: null,
			show: $.proxy(this.after_show, this)
		});

		// enter key 'OK'
		this.panel.keydown(function(e) {
			switch (e.keyCode) {
				case 13: // enter key
					$('#g_nut_btn_ok').click();
					break;
			}
		});

		this.dialog_explorer = new goorm.core.dialog.explorer('#text_new', this);
		this.bind();
	},

	show: function() {
		this.dialog_explorer.init(false, true);

		this.panel.modal('show');
	},

	after_show: function() {
		$('#text_new_dir_tree').find('.jstree-clicked').click();
	},

	bind: function() {
		var self = this;
		var files = this.dialog_explorer.files;

		$('#g_nut_btn_ok').keydown(function(e) {
			if (e.keyCode == 9) {
				$('#text_new_dir_tree').find('.jstree-clicked').click();
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
