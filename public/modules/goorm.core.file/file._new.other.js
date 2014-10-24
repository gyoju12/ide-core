/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file._new.other = {
	dialog: null,
	buttons: null,

	init: function () {
		var self = this;

		this.panel = $("#dlg_new_other_file");

		var handle_ok = function () {
			var file_type = $("#new_other_file_list .selected_div").attr("value");

			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_deny_make_file_in_workspace_root);
				return;
			}



			var postdata = {
				current_path: core.status.current_project_path,
				file_name: $("#new_other_file_target").val() + "." + file_type
			};
			if(!file_type){
				alert.show(core.module.localization.msg.alert_type_is_empty);
				return false;
			}

			if (postdata.file_name === "") {
				alert.show(core.module.localization.msg.alert_filename_empty);
				// alert.show("File name is empty. Please fill it...");
				return false;
			}

			//$.get("file/new_other", postdata, function (data) {
			core._socket.once("/file/new_other", function(data){
				if (data.err_code === 0) {
					core.module.layout.project_explorer.refresh();
					self.panel.modal('hide');
				} else if (data.err_code == 20) {
					alert.show(core.module.localization.msg[data.message]);

				} else {
					alert.show(data.message);
				}
			});
			core._socket.emit("/file/new_other", postdata);
		};


		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_new_other_file",
			id: "dlg_new_other_file",
			handle_ok: handle_ok,
			success: function () {
				$("#new_other_file_list .select_div").click(function () {
					$(".select_div").removeClass("selected_div");
					$(this).addClass("selected_div");
				});
				$(this).hide();
			}
		});
		

	},

	show: function () {
		var new_other_file_current_path = core.status.current_project_path + "";
		if (new_other_file_current_path.length > 25) {
			new_other_file_current_path = new_other_file_current_path.substring(0, 25) + "...";
		}

		$("#new_other_file_current_path").text(new_other_file_current_path += "/");
		$("#new_other_file_target").val("");

		

		this.panel.modal('show');
	}
};
