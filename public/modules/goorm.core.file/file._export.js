/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file._export = {
	dialog: null,
	buttons: null,
	tabview: null,
	dialog_explorer: null,

	init: function() {
		var self = this;

		this.panel = $('#dlg_export_file');

		// export selected file. Jeong-Min Im.
		// context (Bool) : from context menu or not
		this.handle_ok = function(context) {
			var localization_msg = core.module.localization.msg;
			var data = null;

			if (context === true) {
				data = core.module.layout.project_explorer.get_tree_selected_path();
				data = data.files;
			} else {
				data = self.dialog_explorer.get_data();
				data = [data.path + '/' + data.name];
			}

			if (data && data.length) {
				var progress_elements = core.module.loading_bar.start({
					str: localization_msg.loading_bar_export
				});
				_$.get('file/export', {
					'path': data
				}, function(result) {
					progress_elements.stop();

					var path = result.path;

					if (path) {
						var download_frame = $('#download_frame');
						var download_func = [];
						

						if (context !== true) {
							self.panel.modal('hide');
						}

						download_frame.css('display', 'none');

						for (var i = path.length - 1; 0 <= i; i--) {
							download_func.push(function(callback) {
								//useonly(mode=goorm-standalone,goorm-oss)
								download_frame.attr('src', 'download/?file=' + path[++i]);
								
								

								$.debounce(callback, 100)();
							});
						}

						async.series(download_func);
					}

					if (result.err_code) {
						switch (result.err_code) {
							case 1:
								alert.show(localization_msg.alert_invalide_query);
								break;
							case 2:
								alert.show(localization_msg.alert_permission_denied);
								break;
							case 3:
								alert.show(localization_msg.alert_cannot_make_directory);
								break;
							case 4:
								var msg = localization_msg.alert_cannot_export_file;

								if (result.err_file) {
									msg += '\n' + result.err_file.join(', ');
								}

								alert.show(msg);
								break;
							default:
								alert.show(localization_msg.alert_unknown_error);
						}
					}
				});
			} else {
				alert.show(localization_msg.alert_filename_empty);
				return false;
			}
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			id: 'dlg_export_file',
			handle_ok: this.handle_ok,
			help_url: 'http://help.goorm.io/ide#help_file_manage_export',
			show: $.proxy(this.after_show, this)
		});

		this.dialog_explorer = new goorm.core.dialog.explorer('#file_export', this);
		this.bind();
	},

	// choose which dialog will be shown. Jeong-Min Im.
	// context (Bool) : from context menu or not
	show: function(context) {
		var self = this;

		if (context === true) {
			this.after_show();
			confirmation.init({
				'title': core.module.localization.title.title_export_file,
				'message': core.module.localization.msg.confirm_file_export,
				'yes': function() {
					self.handle_ok(true);
				}
			}).show();
		} else {
			this.dialog_explorer.init(true, true, false);
			this.panel.modal('show');
		}
	},

	after_show: function() {
		$('#file_export_dir_tree .jstree-clicked').click();

		var files = this.dialog_explorer.files;
		var file_item = $(files).find('div.file_item');
		var target = core.status.selected_file;

		if (target) {
			file_item.each(function() {
				if ($(this).attr('filepath') === target) {
					$(this).click();
				}
			});
		}
	},

	bind: function() {
		var self = this;
		var files = this.dialog_explorer.files;

		// when enter 'enter' key, dialog OK.
		// this.panel.keydown(function (e) {
		// 	switch (e.keyCode) {
		// 		case 13: 	// 'enter' key
		// 			$("#g_ef_btn_ok").click();
		// 			break;
		// 	}
		// });

		// when enter 'tab' key, move from left tree to right file view
		$('#file_export_dir_tree').keydown(function(e) {
			switch (e.keyCode) {
				case 9: // 'tab' key
					$(files).find('div')[0].click();
					return false;
			}
		});

		$('#g_ef_btn_ok').keydown(function(e) {
			if (e.keyCode == 9) {
				$('#file_export_dir_tree').find('.jstree-clicked').click();
			}
			e.preventDefault();
		});

		// on selecting file view
		$(files).on('click', 'div.file_item', function() {
			$(self.dialog_explorer.input_file_name).val($(this).attr('filename'));

			self.filename = $(this).attr('filename');
			self.filetype = $(this).attr('filetype');
			self.filepath = $(this).attr('filepath');
		});
		
		$(files).on('click', 'div.folder_item', function() {
			$(self.dialog_explorer.input_file_name).val('');
			self.filename = '';
			self.filetype = '';
			self.filepath = '';
		});
	}
};
