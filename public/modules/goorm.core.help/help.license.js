goorm.core.help.license = {
	dialog: null,
	buttons: null,
	tabview: null,
	treeview: null,

	init: function() {
		var self = this;

		this.panel = $('#dlg_help_license');

		var handle_ok = function(panel) {
			self.panel.modal('hide');
		};
		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: 'title_about_goorm',
			id: 'dlg_help_license',
			handle_ok: handle_ok,
			success: null

		});
	},

	show: function() {
		this.panel.modal('show');
	},

	set_version: function(_lib) {
		if (typeof _lib == 'string') {
			$('#node_oss_version').html('NodeJS ' + _lib.split('v')[1]); // jeongmin: help - open source license
		} else if (typeof _lib == 'object') {
			$.each(_lib, function(index, lib) {
				switch (lib.name) {
					case 'jQuery':
						$('#jquery_oss_version').html('jQuery ' + lib.version);
						break;
					case 'Bootstrap':
						$('#bootstrap_oss_version').html('Bootstrap ' + lib.version);
						break;
					case 'CodeMirror':
						$('#codemirror_oss_version').html('CodeMirror ' + lib.version);
						break;
					case 'Bootstrap-tour':
						$('#bootstrap_tour_oss_version').html('Bootstrap-tour ' + lib.version);
						break;
					case 'Bootstrap-formhelpers':
						$('#bootstrap_form_oss_version').html('Bootstrap-formhelpers ' + lib.version);
						break;
					case 'pdf.js':
						$('#pdf_oss_version').html('pdf.js ' + lib.version);
						break;
					case 'iCheck':
						$('#icheck_oss_version').html('iCheck ' + lib.version);
						break;
					case 'OT.js':
						$('#ot_oss_version').html('OT.js ' + lib.version);
				}
			});
		}
	}
};
