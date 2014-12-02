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

		this.panel = $("#dlg_export_file");

		this.panel.click(function() {
			$("button[localization_key=common_target]").blur();
		});

		var handle_ok = function() {
			var data = self.dialog_explorer.get_data();

			if (data.path === "" || data.name === "") {
				alert.show(core.module.localization.msg.alert_filename_empty);
				// alert.show("Not Selected.");
				return false;
			}

			// var name = core.user.id;

			var postdata = {
				// user: name,
				path: data.path,
				file: data.name
			};

			core.module.loading_bar.start({
				str: core.module.localization.msg.loading_bar_export
			});
			_$.get("file/export", postdata, function(data) {
				core.module.loading_bar.stop();

				if (data.err_code === 0) {
					self.panel.modal('hide');

					//location.href = "download/?file=" + data.path;
					//var _iframe_download=$('<iframe id="download_frame"/>').attr('src',"download/?file=" + data.path).hide().appendTo
					$("#download_frame").css('display', 'none');

					
					$("#download_frame").attr('src', "download/?file=" + data.path);
					

					
				} else {
					switch (data.err_code) {
						case 10:
							alert.show(core.module.localization.msg.alert_invalide_query);
							break;
						case 20:
							alert.show(core.module.localization.msg.alert_cannot_export_file);
							break;
						case 30:
							alert.show(core.module.localization.msg.alert_cannot_make_directory);
					}
				}
			});
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_export_file",
			id: "dlg_export_file",
			handle_ok: handle_ok,
			success: function() {
				$(document).on("click", "li.open.storage", function() {
					$("button[localization_key=common_target]").blur();
				});
			},
			show: $.proxy(this.after_show, this)
		});


		this.dialog_explorer = new goorm.core.dialog.explorer("#file_export", this);
		this.bind();

		//this.dialog.panel.setBody("AA");
	},

	show: function() {
		this.is_shown = false;
		this.dialog_explorer.init(true, true, false);
		this.panel.modal('show');
	},

	after_show: function() {

		$("#file_export_dir_tree").find(".jstree-clicked").click();

		var files = this.dialog_explorer.files;
		var file_item = $(files).find("div.file_item");


		if (core.status.selected_file) {
			var target = core.status.selected_file;

			file_item.each(function() {
				if ($(this).attr("filepath") == target) {
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
		$("#file_export_dir_tree").keydown(function(e) {
			switch (e.keyCode) {
				case 9: // 'tab' key
					$(files).find("div")[0].click();
					return false;
			}
		});

		// on selecting file view
		$(files).on("click", "div.file_item", function() {
			$(self.dialog_explorer.input_file_name).val($(this).attr("filename"));

			self.filename = $(this).attr("filename");
			self.filetype = $(this).attr("filetype");
			self.filepath = $(this).attr("filepath");
		});
		$(files).on("click", "div.folder_item", function() {
			$(self.dialog_explorer.input_file_name).val("");
			self.filename = "";
			self.filetype = "";
			self.filepath = "";
		});
	}
};