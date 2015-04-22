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

		// this.panel.click(function() {	// hidden: storage is deprecated
		// 	$("button[localization_key=common_target]").blur();
		// });

		var handle_ok = $.debounce(function() {
			if (self.input.val() === '') {
				alert.show(core.module.localization.msg.alert_file_not_select);
				return false;
			}
			// console.log($("#g_if_btn_ok").attr("disabled") === true);
			if( $("#g_if_btn_ok").attr("disabled") === true) {
				return false;
			}

			var data = self.dialog_explorer.get_data();
			self.upload_file_path = data.path + '/'; // jeongmin: for reopening windows

			$("#file_import_location_path_hidden").val(data.path);

			self.file_valid_check(document.getElementById('file_import_file').files, 'dialog', function(res) {
				if (res) {
					self.progress_elements = core.module.loading_bar.start({
						str: core.module.localization.msg.processing
					});

					$('#myForm').submit();
					$("#g_if_btn_ok").attr("disabled", true);
				} else {
					self.input.val('');
				}
				$('#myForm').attr('action', 'file/import');
			});

		},3000, true);

		self.dialog = new goorm.core.dialog();
		self.dialog.init({
			// localization_key: "title_import_file",
			id: "dlg_import_file",
			handle_ok: handle_ok,
			show: $.proxy(this.after_show, this),
			// kind: "import",
			success: function() {
				// $(document).on("click", "li.open.storage", function() {	// hidden: storage is deprecated
				// 	$("button[localization_key=common_target]").blur();
				// });

				self.input.on("change", function(e) {
					var data = self.dialog_explorer.get_data();
					if (data.path === "" || data.path === "/") {
						alert.show(core.module.localization.msg.alert_deny_make_file_in_workspace_root);
						self.input.val('');
						return false;
					}

					$('.jstree-clicked').click();
				});

				var form_options = {
					target: "#upload_output",
					success: function(data) {
						self.files_upload(data, function() { // jeongmin: overwrite function
							$('#myForm').attr('action', 'file/import?is_overwrite=true');
							self.progress_elements = core.module.loading_bar.start({
								str: core.module.localization.msg.import_in_progress
							});

							$('#myForm').submit();
							$('#myForm').attr('action', 'file/import');
						});
					}
				};

				$('#myForm').ajaxForm(form_options);

				$('#myForm').submit(function() {
					// self.panel.modal('hide');
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
						break;
					} else {
						self.upload_file_name = self.input.val();
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

		$("#g_if_btn_ok").keydown(function(e) {
			if (e.keyCode == 9) {
				$("#file_import_dir_tree").find(".jstree-clicked").click();
			}
			e.preventDefault();
		});

		$(files).on("click", "div.file_item", function() {
			self.filename = $(this).attr("filename");
			self.filetype = $(this).attr("filetype");
			self.filepath = $(this).attr("filepath");
		});
	},

	file_valid_check: function(file_list, where, callback) {
		var self = this;
		var ret_val = false;
		var large_files = [];


		// file name check
		if (file_list.length > 0) {
			for (var i = 0; i < file_list.length; i++) {
				if (core.module.file.test(file_list[i].name)) {
					alert.show(core.module.localization.msg.alert_allow_file_has_valid_name);
					callback(false);
					return;
				}
			}
		}
		ret_val = true;

		// file size check
		if (file_list !== null && file_list !== undefined) {
			for (var i in file_list) {
				if (file_list[i].size !== undefined) {
					if (file_list[i].size > 1024*1024*50) {
						large_files.push(file_list[i].name);
					}
				}
			}
		}
		if (large_files.length > 0) {
			alert.show("[" + large_files.join(", ") + "]<br/>" + core.module.localization.msg.alert_limit_file_size);
			callback(false);
			return;
		} else {
			ret_val = true;
		}

		// file duplication check
		async.mapSeries(file_list, function(__file, async_callback) {
			core._socket.once('/file/exist', function(res) {
				if (res.err_code === 0) {
					if (res.exist) {
						async_callback(null, __file.name);
					} else {
						async_callback(null, '');
					}
				} else {
					var msg = '' || core.module.localization.msg[res.message];
					async_callback(msg);
				}
			});
			var _path = core.status.current_project_path || self.dialog_explorer.get_data().path;
			core._socket.emit('/file/exist', {
				ori_path: _path,
				dst_name: __file.name
			});

		}, function(err, results) {
			var dup_list = [];
			if (err) {
				alert.show(err);
				ret_val = false;
				return;
			}

			for (var i = 0; i < results.length; i++) {
				if (results[i] !== '') {
					dup_list.push(results[i]);
				}
			}
			if (dup_list.length > 0) {
				if (where === 'dialog') {
					ret_val = false;
				} else {
					ret_val = true;
				}
				confirmation.init({
					message: (dup_list.length == 1) ? "[" + dup_list[0] + "] " + core.module.localization.msg.imported_file_exist_single : "[" + dup_list.join(", ") + "] " + core.module.localization.msg.imported_file_exist_multiple,
					yes_text: core.module.localization.msg.yes,
					no_text: core.module.localization.msg.no,
					title: "Confirmation",
					zIndex: 1001,

					yes: function() {
						self.upload_file_name = dup_list; // jeongmin: for reopening windows
						$('#myForm').attr('action', 'file/import?is_overwrite=true');

						if (where === 'dialog') {
							self.progress_elements = core.module.loading_bar.start({
								str: core.module.localization.msg.processing
							});

							$('#myForm').submit();
							$("#g_if_btn_ok").attr("disabled", true);
							$('#myForm').attr('action', 'file/import');

						}
						callback(ret_val);
					},
					no: function() {
						if (where === 'dialog') {
							self.progress_elements = core.module.loading_bar.start({
								str: core.module.localization.msg.processing
							});

							$('#myForm').submit();
							$("#g_if_btn_ok").attr("disabled", true);
						}
						callback(ret_val);
					}
				});
				self.progress_elements && self.progress_elements.stop();
				confirmation.show();
			} else {
				callback(ret_val);
			}
		});
	},

	files_upload: function(data, overwrite) {
		var self = this;
		var layout = core.module.layout;

		this.progress_elements && this.progress_elements.stop();

		if (data.err_code === 0) {
			self.panel.modal('hide');

			if (self.upload_file_name) { // jeongmin: close opened windows and reopen these windows
				var window_manager = layout.workspace.window_manager;
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

				this.upload_file_name = null; // jeongmin: initialize
			}

			notice.show(core.module.localization.msg.notice_file_import_done);

			layout.project_explorer.treeview.open_path(self.upload_file_path); // jeongmin: open uploaded path
			layout.project_explorer.refresh();

		} else {
			switch (data.err_code) {
				case 10: 	// nothing uploaded
					self.panel.modal('hide');
					break;
				case 21:
					confirmation.init({
						message: (data.file.length == 1) ? "[" + data.file[0] + "] " + core.module.localization.msg.imported_file_exist_single : "[" + data.file.join(", ") + "] " + core.module.localization.msg.imported_file_exist_multiple,
						yes_text: core.module.localization.msg.yes,
						no_text: core.module.localization.msg.no,
						title: "Confirmation",
						zIndex: 1001,

						yes: function() {
							self.upload_file_name = data.file; // jeongmin: for reopening windows

							overwrite && overwrite();
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
				case 50:
					var file = data.file.map(function(o) {
						return o.originalname;
					});

					alert.show("[" + file.join(", ") + "]<br/>" + core.module.localization.msg.alert_limit_file_size);
					break;
				default:
					self.panel.modal('hide');

					alert.show(core.module.localization.msg.alert_invalide_query);
					break;
			}
		}
		$("#g_if_btn_ok").removeAttr("disabled");
	},
	upload_file_drag: function(files, path, callback) {
		var self = this;
		var localization_msg = core.module.localization.msg;
		var current_project = path ? path : core.status.current_project_path;

		self.file_valid_check(files, 'dnd', function(res) {
			if (res) {
				var send_url = 'file/import';
				var fd = new FormData();
				for (var i = 0; i < files.length; i++)
					fd.append('file', files[i]);
				fd.append('file_import_location_path', current_project);
				
				self.upload_file_path = current_project + '/'; // jeongmin: for reopening windows
				self.progress_elements = core.module.loading_bar.start({
					str: localization_msg.import_in_progress
				});

				if ($('#myForm').attr('action') == 'file/import?is_overwrite=true') {
					send_url = 'file/import?is_overwrite=true';
				}
				var send = function(url) {
					jQuery.ajax({
						url: url,
						type: 'POST',
						cache: false,
						contentType: false,
						processData: false,
						data: fd,
						xhr: function() {
							var xhr_o = $.ajaxSettings.xhr();

							if (xhr_o.upload) {
								xhr_o.upload.addEventListener('progress', function() {
									var percent = 0;
									var position = event.loaded || event.position;
									var total = event.total;
									if (event.lengthComputable) {
										percent = Math.ceil(position / total * 100);
									}

									core.progressbar.set(percent); // set Progress
								}, false);
							}

							return xhr_o;
						},
						success: function(data) {
							self.files_upload(data, function() { // jeongmin: overwrite function
								self.progress_elements = core.module.loading_bar.start({
									str: core.module.localization.msg.import_in_progress
								});

								send('file/import?is_overwrite=true');
							});
						},
						error: function(e) {
							self.progress_elements.stop();
							if (e.status == 400)
								alert.show(core.module.localization.msg.folder_dnd_error);
							else
								alert.show("Error" + e.status);
						},
						complete: function() {
							if (files.length == 1) {
								var filetype = files[0].name.split(".");
								filetype = filetype[filetype.length - 1];

								switch (filetype) {
									case "c":
									case "cpp":
									case "h":
									case "txt":
									case "html":
									case "py":
									case "js":
									case "java":
									case "rb":
									case "go":
									case "json":
									case "xml":
									case "sh":
									case "css":
									case "php":
										core.module.layout.workspace.window_manager.open(self.upload_file_path, files[0].name, filetype);
										break;
								}
							}

							$('#myForm').attr('action', 'file/import');
							if (jQuery.isFunction(callback))
								callback();
						}
					});
				};

				// already checked duplication in file_valid_check().
				send(send_url);
			}
		});

	}
};
