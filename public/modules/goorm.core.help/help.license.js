
goorm.core.help.license = {
	dialog: null,
	buttons: null,
	tabview: null,
	treeview: null,

	init: function () {
		var self = this;

		this.panel = $("#dlg_help_license");

		var handle_ok = function (panel) {
			self.panel.modal('hide');
		};
		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_about_goorm",
			id: "dlg_help_license",
			handle_ok: handle_ok,
			success: null

		});
	},

	show: function () {
		this.panel.modal('show');
	},

};
