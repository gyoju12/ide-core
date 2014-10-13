/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.build.project = {
	dialog: null,
	buttons: null,
	button_select_all: null,
	button_deselect_all: null,
	is_repeat: null,
	is_onclick: false,
	handle_build_for_run: null,
	flag: false,

	init: function() {

		var self = this;

		this.panel = $("#dlg_build_project");
		this.is_repeat = false;

		var handle_build = function(flag) {
			if (flag == 'run') {

				self.project_list();
				self.is_onclick = false;


				self.list.check_data(core.status.current_project_path, core.status.current_project_name);
			}

			var checked = self.list.get_table_data();

			if (checked.length === 0) {
				var result = {
					result: false,
					code: 3
				};
				core.module.project.display_error_message(result, 'alert');
				return false;
			} else {
				for (var i = 0; i < checked.length; i++) {
					var project = checked[i];
					var window_manager = core.module.layout.workspace.window_manager;

					if (self.is_repeat) {
						confirmation_save.hide();
					}
					//before build save all file open in window manager
					//window_manager.save_all();

					// disable because of duplicated save call
					if (window_manager.window[window_manager.active_window] && window_manager.window[window_manager.active_window].editor) {
						window_manager.window[window_manager.active_window].editor.save(true);
					}

					//and build start
					//for 'build projects' menu.
					if (!self.is_onclick) {
						if (!$.isEmptyObject(core.module.plugin_manager.plugins["goorm.plugin." + project.type])) {
							var project_path = project.path;
							var project_type = project.type;

							core.module.project.load_build({
								'project_path': project_path,
								'project_type': project_type
							}, function(data) {
								self.flag = data;
								if (flag == 'run' && self.flag) {
									core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type].run(core.status.current_project_path);
								}
							});

							self.panel.modal('hide');
						} else {
							self.flag = false;
							alert.show(core.module.localization.msg['alert_plugin_not_found']);
						}
					} else {
						self.is_onclick = false;
					}
				}
			}

			self.is_repeat = false; //by sim
			if (self.flag === true) {
				return true;
			} else if (self.flag === false) {
				return false;
			}

			self.panel.modal('hide');
		};


		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_build_project",
			id: "dlg_build_project",
			handle_ok: handle_build,
			success: function() {
				$("#build_project_select_all").click(function() {
					self.select_all();
				});
				$("#build_project_deselect_all").click(function() {
					self.deselect_all();
				});
			}
		});

		// binding enter key to handle_ok. Jeong-Min Im.
		this.panel.keydown(function(e) {
			if (e.keyCode == 13)
				handle_build();

			return false;
		});

		this.handle_build_for_run = handle_build;

		this.list = new goorm.core.project.list();
		this.list.init_datatable('build_project_list');
	},

	show: function() {
		


			
		this.project_list();
		this.is_onclick = false;

		this.panel.modal('show');
		

		
	},

	select_all: function() {
		var list = $("#build_project_list input[type=checkbox]");
		for (var i = 0; i < list.length; i++) {
			if (!list[i].checked) $(list[i]).click();
		}
	},

	deselect_all: function() {
		$("#build_project_list input[type=checkbox]").attr("checked", false);
	},
	// prevent making project list in build projects and build all. Jeong-Min Im.
	can_build: function(project_type) {
		switch (project_type) {
			case 'python':
			case 'web':
			case 'nodejs':
			case 'php':
			case 'go':
			case 'ruby':
			case 'dev':
				return false;
			default:
				return true;
		}
	},

	project_list: function() {
		var data = [];
		for (var name in core.workspace) {
			
			
			if (this.can_build(core.workspace[name].type)) {
				
				core.workspace[name].is_check = true; // jeongmin: it means .check is input or not

				data.push(core.workspace[name]);
			}
		}

		this.list.clear_data().add_data(data).check_data(core.status.current_project_name, core.status.current_project_path);
	}
};