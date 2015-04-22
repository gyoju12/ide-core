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

	check_form: {
		regular_expression_email: /^([0-9a-zA-Z._-]+)@([0-9a-zA-Z_-]+)(\.[a-zA-Z0-9]+)(\.[a-zA-Z]+)?$/
	},

	init: function () {
		var self = this;

		this.panel = $("#dlg_help_bug_report")

		var handle_ok = function () {
			if ($("#bug_reports_title").val() === "") {
				alert.show(core.module.localization.msg.alert_title_empty);
				return false;
			} else if ($("#bug_reports_email").val() === "") {
				alert.show(core.module.localization.msg.alert_email_empty);
				return false;
			} else if (!self.check_form.regular_expression_email.test($("#bug_reports_email").val())) {
				alert.show(core.module.localization.msg.alert_user_unfit_email);
				return false;
			}

			var postdata = {
				title: $("#bug_reports_title").val(),
				email: $("#bug_reports_email").val(),
				category: $('#bug_reports_category').val(),
				explanation: $("#bug_reports_content").val().split("<").join("").split(">").join("")
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
		var email = core.user.email;

		$("#bug_reports_title").val("");
		$("#bug_reports_email").val(email);
		$("#bug_reports_content").val("");

		this.panel.modal('show');
	}
};
