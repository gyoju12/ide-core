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

		//  dialog is replaced with confirmation: kyeongwook.jeong
		
	},

	show: function() {
		

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
	}
	
};