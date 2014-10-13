/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.build.configuration = {
	dialog: null,
	panel: null,

	init: function () {
		$(core).trigger("goorm_loading");

		// depreciated option - save and build --heeje
		// $(core).on('on_property_confirmed', function () {
		// 	if (core.property.building_after_save_option) {
		// 		$('#save_and_build_checker').css('visibility', 'visible');
		// 	}
		// 	else {
		// 		$('#save_and_build_checker').css('visibility', 'hidden');
		// 	}
		// });
	},

	show: function () {
		if (!this.panel) this.panel = core.dialog.project_property;

		var plugin_data = this.panel.manager.plugin_data;
		var plugin = null;

		if (core.status.current_project_path !== "") {

			// find plugin_data...
			//
			plugin_data.map(function (o) {
				if (o.text.toLowerCase() == core.property.type.toLowerCase()) {
					plugin = o;
				} 
			});

			// check treeview...
			//
			if (plugin && $('#property_tabview .tab-content > div[plugin="goorm.plugin.'+core.property.type+'"]').length > 0) {
				$('#property_treeview').find("li[path='Plugin/"+plugin.text+"'] > a").first().click();
			}

			this.panel.show();
		} else {
			var result = {
				result: false,
				code: 5
			};
			core.module.project.display_error_message(result, 'alert');
		}
	},

	// depreciated option - save and build --heeje
	// set_building_after_save_option: function (value) {
	// 	if (value) {
	// 		core.property.building_after_save_option = true;
	// 		$('#save_and_build_checker').css('visibility', 'visible');
	// 	}
	// 	else {
	// 		core.property.building_after_save_option = false;
	// 		$('#save_and_build_checker').css('visibility', 'hidden');
	// 	}

	// 	core.dialog.project_property.fill_dialog(core.property);
	// 	core.dialog.project_property.save();
	// }
};
