/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file.save_as = function() {
	this.dialog = null;
	this.buttons = null;
	this.tabview = null;
	this.treeview = null;
};

goorm.core.file.save_as.prototype = {
	init: function() {
		var self = this;
		this.panel = $('#dlg_save_as_file');

		var handle_save = function(panel) {
			if (typeof(this.hide) !== 'function' && panel) {
				self.panel.modal('hide');
			} else {
				self.panel.modal('hide');
			}
		};

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			id: 'dlg_save_as_file',
			handle_ok: handle_save,
			success: function() {
				//TreeView Init
				self.treeview = new goorm.core.dialog.explorer('#file_import', this);
				self.treeview.render();
			}
		});
	},

	show: function() {
		this.panel.modal('show');
	}
};
