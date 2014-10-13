/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project._export = {
	dialog: null,
	buttons: null,
	tabview: null,
	project_list: null,
	dialog_explorer: null,

	init: function() {

		var self = this;

		this.panel = $("#dlg_export_project");

		var handle_ok = $.debounce(function() { // jeongmin: prevent multiple export
			var data = self.project_list.get_data();
			var type = $("#dlg_export_project label.active").text().trim();

			if (data.path === "" || data.name === "" || !type) {
				alert.show(core.module.localization.msg.alert_filename_empty);
				return false;
			}

			// var name = core.user.id;

			var postdata = {
				// user: name,
				project_path: data.path,
				project_name: data.name,
				export_type: type.toLowerCase()
			};

			core.module.loading_bar.start("Export processing...");
			$.get("project/export", postdata, function(data) {
				core.module.loading_bar.stop();

				if (data.err_code === 0) {
					self.panel.modal('hide');

					$("#download_frame").css('display', 'none');
					$("#download_frame").attr('src', "download/?file=" + data.path);
				} else {
					alert.show(data.message);
				}
			});
		}, 200, true); // jeongmin: true means invokeAsap

		this.project_list = new goorm.core.project.list();
		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_export_project",
			id: "dlg_export_project",
			handle_ok: handle_ok,
			success: function() {
				$('#project_export_datatype1').iCheck('check'); // jeongmin: default

				////// jeongmin: manually change button's active state //////
				$('[name=project_export_datatype]').on('ifChecked', function() {
					$('#export_project_type .active').removeClass('active'); // remove old active button
					$(this).parent().parent().addClass('active'); // set active this button (hierarchy: label > iCheck > input)
				});
			},

			//the modal has been made visible to the user! Jeong-min Im.
			show: function() {
				self.project_list.init_project(); //let's set initial project
				$("#project_export_list").focus();
			}
		});

		this.dialog_explorer = new goorm.core.dialog.explorer("file_export", this);
	},

	show: function() {
		var self = this;
		this.dialog_explorer.init(true, true);
		this.project_list.init("#project_export");
		this.project_list.set_keydown_event({
			'handler': function() {
				$("#g_ep_btn_ok").click();
			}
		});

		this.panel.modal('show');
	}
};