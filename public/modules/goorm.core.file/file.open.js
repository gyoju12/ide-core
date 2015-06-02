/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file.open = {
	dialog: null,
	buttons: null,
	filename: null,
	filetype: null,
	filepath: null,
	dialog_explorer: null,

	init: function() {

		var self = this;

		this.panel = $('#dlg_open_file');

		// this.panel.click(function() {	// hidden: storage is deprecated
		// 	$("button[localization_key=common_target]").blur();
		// });

		// $(document).on("click", "li.open.storage", function() {	// hidden: storage is deprecated
		// 	$("button[localization_key=common_target]").blur();
		// });

		var handle_ok = function(panel) {
			console.log('handle_ok');
			var data = self.dialog_explorer.get_data();

			if (data.path === '' || $('#file_open_target_name').val() === '') {
				alert.show(core.module.localization.msg.alert_filename_empty);
				return false;
			}

			if ($('#file_open_target_name').val().indexOf('..') != -1) {
				alert.show(core.module.localization.msg.alert_file_name_illegal);
				return false;
			}

			core.module.layout.workspace.window_manager.open(data.path, data.name, data.type);

			if (typeof(this.hide) !== 'function' && panel) {
				self.panel.modal('hide');
			} else {
				self.panel.modal('hide');
			}
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			id: 'dlg_open_file',
			handle_ok: handle_ok,
			show: $.proxy(this.after_show, this),
			success: null
		});

		this.dialog_explorer = new goorm.core.dialog.explorer('#file_open', this);
		this.bind();
	},

	show: function() {
		this.dialog_explorer.init(true, true, false);

		this.panel.modal('show');
	},

	after_show: function() {
		// var files = this.dialog_explorer.files;
		// $(files).click();
		$('#file_open_dir_tree').find('.jstree-clicked').click();
	},

	down: function(filepath, filename) {
		var target = core.status.selected_file;
		if (target) {
			confirmation.init({
				title: core.module.localization.msg.alert_error,
				message: core.module.localization.msg.confirmation_down_file,
				yes_text: core.module.localization.msg.yes,
				no_text: core.module.localization.msg.no,
				yes: function() {
					var query = {
						filepath: filepath,
						filename: filename
					};
					_$.get('file/get_file', query, function() {
						
						
					});
				},
				no: null
			});
			confirmation.show();
		} else {
			alert.show(core.module.localization.msg.alert_select_file);
		}
	},

	bind: function() {
		var self = this;
		var files = this.dialog_explorer.files;
		var $ok_button = $('#g_of_btn_ok');

		// when enter 'enter' key, dialog OK.
		this.panel.keydown(function(e) {
			if (e.keyCode === 13) { // '13: enter key'
				if ($ok_button.attr('disabled') === undefined) {
					$ok_button.click();
				}
			}
		});

		// when enter 'tab' key, move from left tree to right file view
		$('#file_open_dir_tree').keydown(function(e) {
			switch (e.keyCode) {
				case 9: // 'tab' key
					$(files).find('div')[0].click();
					return false;
			}
		});

		$ok_button.keydown(function(e) {
			if (e.keyCode == 9) {
				$('#file_open_dir_tree').find('.jstree-clicked').click();
			}
			e.preventDefault();
		});

		// on selecting file view
		$(files).on('click', 'div.file_item', function() {
			$ok_button.removeAttr('disabled');
			$(self.dialog_explorer.input_file_name).val($(this).attr('filename'));

			self.filename = $(this).attr('filename');
			self.filetype = $(this).attr('filetype');
			self.filepath = $(this).attr('filepath');
		}).on('dblclick', 'div.file_item', function() {
			core.module.layout.workspace.window_manager.open(self.filepath.replace(self.filename, ''), self.filename, self.filetype);
			core.dialog.open_file.panel.modal('hide');
		});
		$(files).on('click', 'div.folder_item', function() {
			$ok_button.attr('disabled', 'disabled');
			$(self.dialog_explorer.input_file_name).val('');
			self.filename = '';
			self.filetype = '';
			self.filepath = '';
		});
	}
};
