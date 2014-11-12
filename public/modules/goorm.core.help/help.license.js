goorm.core.help.license = {
	dialog: null,
	buttons: null,
	tabview: null,
	treeview: null,

	init: function() {
		var self = this;

		this.panel = $("#dlg_help_license");

		var handle_ok = function(panel) {
			self.panel.modal('hide');
		};
		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_about_goorm",
			id: "dlg_help_license",
			handle_ok: handle_ok,
			success: null

		});

		$(core).one('goorm_login_complete', function() {
			// get open source license versions. Jeong-Min Im.
			core._socket.once('/help/get_oss_license_ver', function(versions) { // Object that has each versions
				if (versions.node) {
					$('#nodejs_version').html('NodeJS ' + versions.node);
				}
			});
			core._socket.emit('/help/get_oss_license_ver');
		});
	},

	show: function() {
		this.panel.modal('show');
	},

};