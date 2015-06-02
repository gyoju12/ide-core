/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.help.shortcuts = {

	init: function() {
		var self = this;

		this.panel = $('#dlg_help_shortcuts');

		this.dialog = new goorm.core.dialog();

		this.dialog.init({
			id: 'dlg_help_shortcuts',
			success: null
		});

		this.panel.on('shown.bs.modal', function() {
			self.visible = true;
		});

		this.panel.on('hidden.bs.modal', function() {
			self.visible = false;
		});

		this.visible = false;
	},

	show: function() {
		this.panel.modal('show');
	},

	hide: function() {
		this.panel.modal('hide');
	}
};
