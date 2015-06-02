/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.help.about = {
	dialog: null,
	buttons: null,
	tabview: null,
	treeview: null,

	init: function() {
		var self = this;

		this.panel = $('#dlg_help_about');

		var handle_ok = function(panel) {
			self.panel.modal('hide');
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: 'title_about_goorm',
			id: 'dlg_help_about',
			handle_ok: handle_ok,
			success: null

		});

	},

	show: function() {
		this.panel.modal('show');
	},

};
