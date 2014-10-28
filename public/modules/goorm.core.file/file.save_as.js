/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file.save_as = {
	dialog: null,
	buttons: null,
	tabview: null,
	dialog_explorer: null,
	is_save_anyway: false,
	contents_data: null,

	init: function() {
		var self = this;

		this.panel = $("#dlg_save_as_file");

		self.handle_save = function() {
			var file_data = self.dialog_explorer.get_data();
			if (file_data.path === "" || file_data.name === "") {
				alert.show(core.module.localization.msg.alert_filename_empty);
				// alert.show("File name is empty. Please fill it...");
				return false;
			}

			var postdata = {
				save_anyway: self.is_save_anyway,
				path: file_data.path + '/' + file_data.name,
				
				type: file_data.type,
				data: self.contents_data
			};

			//$.get("file/save_as", postdata, function (data) {
			core._socket.once("/file/save_as", function(data) {
				var w_save = core.module.layout.workspace.window_manager.find_by_filename(file_data.path + '/', file_data.name);

				if (data.err_code == 99) {
					confirmation.init({
						message: core.module.localization.msg.confirmation_new_message,
						yes_text: core.module.localization.msg.confirmation_yes,
						no_text: core.module.localization.msg.confirmation_no,
						title: "Confirmation",
						yes: function() {
							self.is_save_anyway = true;
							self.handle_save();
						},
						no: null
					});

					confirmation.show();
				} else if (data.err_code === 0) {

					if (w_save) {
						w_save.close();
						w_save.tab.close();
					}

					self.panel.modal('hide');

					core.module.layout.project_explorer.refresh();

					var filepath = file_data.path + '/';
					var filename = file_data.name;
					var filetype = file_data.name.split('.').pop();

					core.module.layout.workspace.window_manager.open(filepath, filename, filetype);
				} else {
					alert.show(data.message);
				}
			});
			core._socket.emit("/file/save_as", postdata);
		};


		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_save_as",
			id: "dlg_save_as_file",
			handle_ok: self.handle_save,
			success: null,
			show: $.proxy(this.after_show, this)
		});


		this.dialog_explorer = new goorm.core.dialog.explorer("#file_save_as", this);
		this.bind();
	},

	show: function() {
		this.contents_data = "";
		this.is_save_anyway = false;

		var window_manager = core.module.layout.workspace.window_manager;

		if (window_manager.active_window < 0) {
			alert.show(core.module.localization.msg.alert_file_not_opened);
			return false;
		} else {
			if (window_manager.window[window_manager.active_window].editor) {
				this.contents_data = window_manager.window[window_manager.active_window].editor.get_contents();
			}
		}

		this.dialog_explorer.init(true, true);
		this.panel.modal('show');
		$("#file_save_as_target_name").val(window_manager.window[window_manager.active_window].filename);
	},

	after_show: function() {

		//fix of duplicating problem --heeje
		var window_manager = core.module.layout.workspace.window_manager;
		var path_arr = window_manager.window[window_manager.active_window].title.split("/");
		path_arr.pop();
		console.log($('#file_save_as_dir_tree li[path="' + path_arr.join("/").trim() + '"]').attr('id'));
		$('#file_save_as_dir_tree').jstree("select_node", $('#file_save_as_dir_tree li[path="' + path_arr.join("/").trim() + '"]').attr('id'));
	},

	bind: function() {
		var self = this;
		var files = this.dialog_explorer.files;

		// when enter 'enter' key, dialog OK.
		this.panel.keydown(function(e) {
			switch (e.keyCode) {
				case 13: // 'enter' key
					$("#g_saf_btn_ok").click();
					break;
			}
		});

		// when enter 'tab' key, move from left tree to right file view 
		$("#file_save_as_dir_tree").keydown(function(e) {
			switch (e.keyCode) {
				case 9: // 'tab' key
					$(files).find("div")[0].click();
					return false;
			}
		});

		$(files).on("click", "div.file_item", function() {
			$("#file_save_as_target_name").val($(this).attr("filename"));
			self.filename = $(this).attr("filename");
			self.filetype = $(this).attr("filetype");
			self.filepath = $(this).attr("filepath");
		}).on("dblclick", "div.file_item", function() {
			self.handle_save();
			core.dialog.open_file.panel.modal('hide');
		});;

		$(files).on("click", "div.folder_item", function() {
			$("#file_save_as_target_name").val("");
			self.filename = "";
			self.filetype = "";
			self.filepath = "";
		});
	}
};