/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.build.clean = {
	dialog: null,
	buttons: null,
	chat: null,

	init: function() {
		var self = this;

		/*  dialog is replaced with confirmation: kyeongwook.jeong
		this.panel = $("#dlg_build_clean");

		

		var handle_clean = function() {
			// var project_array = [];

			// $("#build_clean_list input[type=checkbox]:checked").each(function () {
			// 	project_array.push($(this).val());
			// 	var plugin = core.module.plugin_manager.plugins["goorm.plugin." + $(this).attr("projectType")];
			// 	plugin && plugin.clean && plugin.clean($(this).attr("name"));
			// });

			var project_array = self.list.get_table_data();

			// not selected, send
			if (project_array.length === 0) {
				var result = {
					result: false,
					code: 4
				};
				core.module.project.display_error_message(result, 'alert');
				return false;
			} else {
				for (var i = 0; i < project_array.length; i++) {
					// plugin.clean() parameter setting : Kim Donguk
					var project = project_array[i];

					console.log("project:",project);

					var plugin = core.module.plugin_manager.plugins["goorm.plugin." + project.type];
					var property = core.workspace[project.path];
					var workspace = core.preference.workspace_path;
					var project_type = core.status.current_project_type;
					var project_name = core.status.current_project_name;
					var current_path = core.status.current_project_path;

					console.log("workspace:", workspace);
					console.log("project_type: ", project_type);
					console.log("project_name:", project_name);
					console.log("project_path: ", project.path);
					console.log("current_path:", current_path);
					console.log("property:",property);


					if (property) {

						// Delete unnecessary Project_data
						delete property.hash;
						delete property.permission;
						delete property.is_check;
						delete property.check;
						
						plugin && plugin.clean && plugin.clean({
							'workspace': workspace,
							'project_type': project_type,
							'project_name': project_name,
							'project_path': project.path,
							'current_path': current_path,
							'property': property
						}, function(){
							property.is_latest_build = false;
							core.module.project.property.save_property(project.path, property);
						});
					}
				}


				self.panel.modal('hide');
			}
		};


		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_build_clean",
			id: "dlg_build_clean",
			handle_ok: handle_clean,
			success: function() {
				$("#build_clean_select_all").click(function() {
					self.select_all();
				});
				$("#build_clean_unselect_all").click(function() {
					self.unselect_all();
				});
			}
		});

		// binding enter key to handle_ok. Jeong-Min Im.
		this.panel.keydown(function(e) {
			if (e.keyCode == 13)
				handle_clean();

			return false;
		});

		this.list = new goorm.core.project.list();
		this.list.init_datatable('build_clean_list');
		*/
	},

	show: function() {
		// this.project_list();

		confirmation.init({
			message: core.module.localization.msg.confirmation_project_clean_message,
			yes_text: core.module.localization.msg.confirmation_yes,
			no_text: core.module.localization.msg.confirmation_no,
			title: core.module.localization.msg.confirmation_project_clean_title,
			zIndes: 1001,

			yes: function() {
				var project_type = core.status.current_project_type;
				var project_path = core.status.current_project_path;
				var plugin = core.module.plugin_manager.plugins["goorm.plugin." + project_type];
				var property = core.workspace[project_path];
				var workspace = core.preference.workspace_path;
				var project_name = core.status.current_project_name;
				var current_path = core.status.current_project_path;

				if (property) {

					// Delete unnecessary Project_data
					delete property.hash;
					delete property.permission;
					delete property.is_check;
					delete property.check;
					
					plugin && plugin.clean && plugin.clean({
						'workspace': workspace,
						'project_type': project_type,
						'project_name': project_name,
						'project_path': project_path,
						'current_path': current_path,
						'property': property
					}, function(){
						property.is_latest_build = false;
						core.module.project.property.save_property(project_path, property);
					});
				}
			},
			no: function() {

			}
		});
		confirmation.show();
		//this.panel.modal('show');
	},
	/*
	select_all: function() {
		var list = $("#build_clean_list input[type=checkbox]");
		for (var i = 0; i < list.length; i++) {
			if (!list[i].checked) $(list[i]).click();
		}
	},

	unselect_all: function() {
		$("#build_clean_list input[type=checkbox]").attr("checked", false);
	},

	project_list: function() {

		var data = [];
		for (var name in core.workspace) {
			if (core.workspace[name].permission && core.workspace[name].permission.writable) {
				core.workspace[name].is_check = true;	// jeongmin: it means .check is input or not

				data.push(core.workspace[name]);
			}
		}

		this.list.clear_data().add_data(data).check_data('name', core.status.current_project_name);
	}
	*/
};