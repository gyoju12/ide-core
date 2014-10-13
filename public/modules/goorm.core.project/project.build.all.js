/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.build.all = {
	panel: null,
	dialog: null,
	buttons: null,

	init: function() {
		var self = this;

		this.panel = $('#dlg_build_all');

		var handle_open = function() {
			self.list.table.find('.project_status_guide').each(function(i, e) {
				var st = $(e);
				var $row = st.parents('tr');

				//SAVE ALL
				//SAVE FUNCTION TEMPORARY ADDED
				core.module.layout.workspace.window_manager.save_all();
				
				var project_path = $row.find(".project_list_author").html() +"_"+ $row.find(".project_list_name").html();
				var project_type = $row.find(".project_list_type").html();

				var plugin = core.module.plugin_manager.plugins["goorm.plugin." + project_type];
				if (plugin.build) {
					st.html("<img src='./images/goorm.core.utility/loading.gif' width='16' height='16' align='top'>building");

					core.module.project.load_build({
						'project_path': project_path,
						'project_type': project_type
					}, function() {
						st.html("<img src='./images/goorm.core.dialog/dialog_notice.png' width='16' height='16' align='top'>complete");
					});
				}
			});
		};


		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_build_all",
			// title: "Build All",
			id: 'dlg_build_all',
			handle_ok: handle_open,

			success: null
		});

		// binding enter key to handle_ok. Jeong-Min Im.
		this.panel.keydown(function(e) {
			if (e.keyCode == 13)
				handle_open();

			return false;
		});

		this.list = new goorm.core.project.list();
		this.list.init_datatable('build_all_list');
	},

	show: function() {
		this.project_list();
		this.panel.modal('show');

	},

	project_list: function() {


		var data = [];
		for (var name in core.workspace) {
			
			
			if (core.module.project.build.project.can_build(core.workspace[name].type)) {
			
				core.workspace[name].check = '<span class="project_status_guide">Ready</span>';
				core.workspace[name].is_check = false;	// jeongmin: it means .check is input or not

				data.push(core.workspace[name]);
			}
		}

		this.list.clear_data().add_data(data);
	}
};