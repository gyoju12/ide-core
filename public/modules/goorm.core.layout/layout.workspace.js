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
			ws.css('border', '3px dashed #aaa');
			self.window_manager.tab_resize_window_relocation();

			e.stopPropagation();
			e.preventDefault();
		});

		ws.on('drop', function(e) {
			ws.css('border', '1px solid #aaa');
			self.window_manager.tab_resize_window_relocation();

			var files = e.originalEvent.dataTransfer.files;
			e.stopPropagation();
			e.preventDefault();

			// Make File Description
			//
			if (files && files.length > 0) {
				for (var i = 0; i < files.length; i++) {
					self.upload_to_project(files[i]);
				}
			}
		});

		ws.on('dragleave', $.debounce(function(e) {
			ws.css('border', '1px solid #aaa');
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
	},

	upload_to_project: function(file, force) {
		var self = this;
		var localization_msg = core.module.localization.msg;

		var current_project = core.status.current_project_path;

		if (/[^.0-9A-Za-z_-]/g.test(file.name)) {
			alert.show(localization_msg.alert_allow_character + "\n" + file.name);
			return false;
		}

		if (!current_project) {
			alert.show(localization_msg.alert_select_project);
			return false;
		}
		if (!force) force = false;

		var fd = new FormData();

		file.name += 'gangseok';
		fd.append('file', file);
		fd.append('project_path', current_project);
		fd.append('force', force);

		var jq_xhr = $.ajax({
			xhr: function() {
				var xhr_o = $.ajaxSettings.xhr();

				if (xhr_o.upload) {
					xhr_o.upload.addEventListener('progress', function() {
						var percent = 0;
						var position = event.loaded || event.position;
						var total = event.total;
						if (event.lengthComputable) {
							percent = Math.ceil(position / total * 100);
						}

						core.progressbar.set(percent); // set Progress
					}, false);
				}

				return xhr_o;
			},
			url: '/upload/file/dd',
			type: 'POST',
			contentType: false,
			processData: false,
			cache: false,
			data: fd,
			success: function(data) {
				if (data.result) {
					self.files.push(data.path);

					confirmation.init({
						title: localization_msg.title_open_file,
						message: localization_msg.confirmation_open_file,
						yes_text: localization_msg.confirmation_yes,
						no_text: localization_msg.confirmation_no,
						yes: function() {
							confirmation.set('reculsive', false);

							if (self.files && self.files.length > 0) {
								for (var i = 0; i < self.files.length; i++) {
									var path = self.files[i];

									var filepath = current_project + '/';
									var filename = path;
									var filetype = path.split('.').pop();

									core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});
								}
							}


							self.files = [];
						},
						no: function() {
							self.files = [];
						}
					});
					confirmation.show();

					core.module.layout.project_explorer.refresh();
				} else {
					switch (data.err_code) {
						case 1:
							alert.show(localization_msg.alert_upload_fail);
							break;
						case 2:
							self.ready_files.push(file);

							var m = self.ready_files.map(function(obj) {
								return obj.name
							}).join(', ');

							confirmation.init({
								title: localization_msg.upload_folder,
								message: m + '<br />' + localization_msg.confirmation_upload_message,
								yes_text: localization_msg.confirmation_yes,
								no_text: localization_msg.confirmation_no,
								yes: function() {
									confirmation.set('reculsive', true);

									for (var i = 0; i < self.ready_files.length; i++) {
										self.upload_to_project(self.ready_files[i], true);
									}

									self.ready_files = [];
								},
								no: function() {
									self.ready_files = [];
								}
							});
							confirmation.show();
							break;
						case 3:
							alert.show(localization_msg.alert_upload_fail);
							break;
					}
				}

			}
		});
	}
};