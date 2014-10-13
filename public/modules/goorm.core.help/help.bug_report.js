/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.help.bug_report = {
	dialog: null,
	buttons: null,
	tabview: null,
	treeview: null,

	init: function () {
		var self = this;

		this.panel = $("#dlg_help_bug_report")

		var handle_ok = function () {
			if ($("#bug_reports_title").val() === "") {
				alert.show(core.module.localization.msg.alert_title_empty);
				return false;
			} else if ($("#bug_reports_author").val() === "") {
				alert.show(core.module.localization.msg.alert_author_empty);
				return false;
			} else if ($("#bug_reports_email").val() === "") {
				alert.show(core.module.localization.msg.alert_email_empty);
				return false;
			} else if ($("#bug_reports_version").val() === "") {
				alert.show(core.module.localization.msg.alert_version_empty);
				return false;
			} else if ($("#bug_reports_module").val() === "") {
				alert.show(core.module.localization.msg.alert_module_empty);
				return false;
			} else if ($("#bug_reports_content").val() === "") {
				alert.show(core.module.localization.msg.alert_contents_empty);
				return false;
			}

			var postdata = {
				title: $("#bug_reports_title").val(),
				explanation: $("#bug_reports_content").val(),
				author: $("#bug_reports_author").val(),
				email: $("#bug_reports_email").val(),
				version: $("#bug_reports_version").val(),
				module: $("#bug_reports_module").val()
			};

			$.get("/help/send_to_bug_report", postdata, function (data) {
				if (data.err_code === 0) {
					notice.show(core.module.localization.msg.notice_write_done);

					self.panel.modal('hide');
				} else {
					alert.show(core.module.localization.msg.alert_cannot_write);
					self.panel.modal('hide');
				}
			});
		};

		this.dialog = new goorm.core.dialog();

		this.dialog.init({
			// localization_key: "title_send_bug_report",
			id: "dlg_help_bug_report",
			handle_ok: handle_ok,
			success: null
		});
		
	},

	show: function () {
		var name = core.user.name;

		$("#bug_reports_author").val(name);
		$("#bug_reports_author").attr('readonly', 'readonly');
		$("#bug_reports_author").addClass('readonly');
		$("#bug_reports_title").val("");
		$("#bug_reports_email").val("");
		$("#bug_reports_version").val(core.env.version);
		$("#bug_reports_module").val("");
		$("#bug_reports_content").val("");

		this.panel.modal('show');
	}
};
