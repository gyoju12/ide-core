/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.layout.workspace = {
	window_manager: null,
	collaboration: null,

	context: '#goorm_inner_layout_center',
	ready_files: [],
	files: [],

	init: function(target) {

		

		//attaching window manager
		this.attach_window_manager('workspace');
		this.attach_event();
	},

	attach_window_manager: function(target) {
		//attaching window manager
		this.window_manager = goorm.core.window.manager;
		this.window_manager.init(target);
	},

	attach_event: function() {
		var self = this;

		// Drag & Drop --> Upload
		//
		var ws = $(this.context);
		ws.on('dragenter', function(e) {
			e.stopPropagation();
			e.preventDefault();
		});

		ws.on('dragover', function(e) {
			ws.css('border', '2px dashed ##007ee5');
			self.window_manager.tab_resize_window_relocation();

			e.stopPropagation();
			e.preventDefault();
		});

		ws.on('drop', function(e) {
			ws.css('border', 'none');
			self.window_manager.tab_resize_window_relocation();

			var files = e.originalEvent.dataTransfer.files;
			e.stopPropagation();
			e.preventDefault();

			// Make File Description
			//
			goorm.core.file._import.upload_file_drag(files);
		});

		ws.on('dragleave', $.debounce(function(e) {
			ws.css('border', 'none');
			self.window_manager.tab_resize_window_relocation();

			e.stopPropagation();
			e.preventDefault();
			return false; // added by ryu
		}, 100));

		ws.on('dragend', function(e) {
			e.stopPropagation();
			e.preventDefault();
			return false; // added by ryu
		});

		ws.click(function(e) {
			$('#editor_status').hide();
			$(core).trigger('contextmenu_all_hide');
			return false;
		});
	}
};