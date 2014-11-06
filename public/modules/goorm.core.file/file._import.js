/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file._import = {
	dialog: null,
	buttons: null,
	dialog_explorer: null,

	init: function() {
		var self = this;

		self.panel = $("#dlg_import_file");
		self.input = $('#file_import_file');

		var handle_ok = function() {
			if (self.input.val() === '') {
				alert.show(core.module.localization.msg.alert_file_not_select);
				return false;
			}

			var data = self.dialog_explorer.get_data();
			core.module.loading_bar.start({
				str: core.module.localization.msg.processing
			});

			self.upload_file_path = data.path + '/'; // jeongmin: for reopening windows

			$("#file_import_location_path_hidden").val(data.path);
			$('#myForm').submit();
		};

		self.dialog = new goorm.core.dialog();
		self.dialog.init({
			// localization_key: "title_import_file",
			id: "dlg_import_file",
			handle_ok: handle_ok,
			show: $.proxy(this.after_show, this),
			// kind: "import",
			success: function() {
				self.input.on("change", function(e) {
					self.filename_check(e);
				});

				var form_options = {
					target: "#upload_output",
					success: function (data) {
						self.files_upload(data);
					}
				};

				$('#myForm').ajaxForm(form_options);

				$('#myForm').submit(function() {
					return false;
				});
			}
		});


		this.dialog_explorer = new goorm.core.dialog.explorer("#file_import", this);
		this.bind();
	},

	show: function() {
		$("#upload_output").empty();
		$("#file_import_file").val("");
		this.dialog_explorer.init(true, true);


		this.panel.modal('show');
	},

	after_show: function() {
		$("#file_import_dir_tree").find(".jstree-clicked").click();
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
					if (self.input.val() === '') {
						self.input.click();
						$('.modal-body').click();
						break;
					} else {
						$("#g_if_btn_ok").click();
						break;
					}
			}
		});

		// when enter 'tab' key, move from left tree to right file view 
		$("#file_import_dir_tree").keydown(function(e) {
			switch (e.keyCode) {
				case 9: // 'tab' key
					$(files).find("div")[0].click();
					return false;
			}
		});

		$(files).on("click", "div.file_item", function() {
			self.filename = $(this).attr("filename");
			self.filetype = $(this).attr("filetype");
			self.filepath = $(this).attr("filepath");
		});
	},

	filename_check: function(e) {
		var self = this;
		var data = self.dialog_explorer.get_data();
		var file_list = e.target.files;
		var filename_check_regexp = /[^a-zA-Z0-9_\-\.]/g;

		if (data.path === "" || data.path === "/") {
			alert.show(core.module.localization.msg.alert_deny_make_file_in_workspace_root);
			self.input.val('');
			return false;
		}

		if (file_list.length > 0) {
			for (var i = 0; i < file_list.length; i++) {
				//if (!/^[\w가-힣0-9a-zA-Z._-]*$/.test(file_list[i].name)) { // jeongmin: remove space
				if (filename_check_regexp.test(file_list[i].name)) {
					alert.show(core.module.localization.msg.alert_allow_file_has_valid_name);
					self.input.val('');
					return false;
				}
			}
		}
	},

	files_upload: function(data) {
		var self = this;
		console.log(self);
		core.module.loading_bar.stop();

		if (data.err_code === 0) {
			self.panel.modal('hide');

			// jeongmin: close opened windows and reopen these windows
			var window_manager = core.module.layout.workspace.window_manager;
			var opening_window = [];

			for (var i = window_manager.window.length - 1; 0 <= i; i--) {
				for (var j = self.upload_file_name.length - 1; 0 <= j; j--) {
					if (window_manager.window[i].title == self.upload_file_path + self.upload_file_name[j]) {
						window_manager.close_by_index(i, i);
						window_manager.open(self.upload_file_path, self.upload_file_name[j], self.upload_file_name[j].split('.')[1]);

						break; // jeongmin: we found
					}
				}
			}

			notice.show(core.module.localization.msg.notice_file_import_done);
			core.module.layout.project_explorer.refresh();
		} else {
			switch (data.err_code) {
				case 21:
					confirmation.init({
						message: (data.file.length == 1) ? "[" + data.file[0] + "] " + core.module.localization.msg.imported_file_exist_single : "[" + data.file.join(", ") + "] " + core.module.localization.msg.imported_file_exist_multiple,
						yes_text: core.module.localization.msg.confirmation_yes,
						no_text: core.module.localization.msg.confirmation_no,
						title: "Confirmation",
						zIndex: 1001,

						yes: function() {
							$('#myForm').attr('action', 'file/import?is_overwrite=true');
							core.module.loading_bar.start({
								str: core.module.localization.msg.import_in_progress
							});

							self.upload_file_name = data.file; // jeongmin: for reopening windows

							$('#myForm').submit();
							self.panel.modal('hide');
							$('#myForm').attr('action', 'file/import');
						},
						no: function() {
							self.dialog_explorer.init(true, true);

							// Prevent working two treeviews at the same(close) time. Jeong-Min Im.
							setTimeout(function() {
								core.module.layout.project_explorer.refresh();
							}, 300);

							$('#myForm').resetForm();
						}
					});

					confirmation.show();
					break;
				case 20:
					self.panel.modal('hide');
					alert.show(core.module.localization.msg.alert_permission_denied);
					break;
				case 30:
					alert.show("[" + data.file.join(", ") + "]<br/>" + core.module.localization.msg.alert_duplicate_dir);
					break;
				default:
					self.panel.modal('hide');

					alert.show(core.module.localization.msg.alert_invalide_query);
					break;
			}
		}
	}
};