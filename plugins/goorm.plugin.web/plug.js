/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


goorm.plugin.web = {
	/*
		Properties
	 */
	name: "web",
	// mainmenu: null,

	/*
		Methods
	 */
	init: function() {
		var self = this;

		core.module.project.add({
			'type': 'web',
			'img': '/goorm.plugin.web/images/web.png',
			'items': [{
				'key': 'web_project',
				'detail_type' : 'web',
				'img': '/goorm.plugin.web/images/web.png'
			}]
		});

		// this.add_project_item();

		// this.mainmenu = core.module.layout.mainmenu;

		//this.debugger = new org.uizard.core.debug();
		//this.debug_message = new org.uizard.core.debug.message();

		// this.cErrorFilter = /[A-Za-z]* error: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.cWarningFilter = /[A-Za-z]* warning: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.lineFilter = /:[0-9]*:/;

		// this.add_mainmenu();

		// this.add_menu_action();

		this.linter = core.module.plugin_linter;
		this.linter.init(this.name); // jeongmin: linter init
	},

/*
	add_project_item: function() {
		$("div[id='project_new']").find(".project_types").append("<a href='#' class='list-group-item project_wizard_first_button' project_type='webp'><img src='/goorm.plugin.web/images/web.png' class='project_icon' /><h4 class='list-group-item-heading' class='project_type_title'>Web Project</h4><p class='list-group-item-text' class='project_type_description'>Web Project (HTML5/Javascript)</p></a>");

		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all webp thumbnail' description='  Create New Project for web' project_type='web' plugin_name='goorm.plugin.web'><img src='/goorm.plugin.web/images/web.png' class='project_item_icon' /><div class='caption'><p>Web Project</p></div></div>");

		$(".project_dialog_type").append("<option value='web'>Web Projects</option>").attr("selected", "");

	},

	add_mainmenu: function() {
		var self = this;

		$("li[id='plugin_new_project']").after("<li class='plugin_project'><a href=\"#\" action=\"new_file_web\">Web Project</a></li>");
		//this.mainmenu.render();
	},

	add_menu_action: function() {
		$("a[action=new_file_web]").unbind("click");
		$("a[action=new_file_web]").click(function() {
			core.dialog.new_project.show(function() {
				$("#project_new").find(".dialog_left_inner").scrollTop($("#project_new").find(".dialog_left_inner").scrollTop() + $(".project_wizard_first_button[project_type=webp]").position().top);
			});
			$(".project_wizard_first_button[project_type=webp]").trigger("click");
		});
	},
*/
	new_project: function(data) {
		/* data = 
		   { 
			project_type,
			project_detailed_type,
			project_author,
			project_name,
			project_desc,
			use_collaboration
		   }
		*/
		var send_data = {
			"plugin": "goorm.plugin.web",
			"data": data
		};

		core.module.project.create( send_data, function(result) {
			// setTimeout(function() {
				var filepath = core.status.current_project_path + '/';
				var filename = 'index.html';
				var filetype = 'html';

				core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});

				core.module.layout.project_explorer.refresh();
				//$(core).trigger("on_project_open");
			// }, 500);

		});
	},

	run: function(options, callback) {
		var self = this;
		var path = options.path;
		var property = options.property;
		var window_manager = core.module.layout.workspace.window_manager;
		var output_manager = core.module.layout.tab_manager.output_manager;

		// lint output
		if ($('#output_tab_web').length === 0) // jeongmin: because of some sync problem, there isn't output tab
			core.module.layout.tab_manager.make_output_tab(this.name); // so we make it before lint

		core.module.project.run({
			'type': 'Web'
		}, function (result) {
			if (result.code === 200) {
				//success 
				if (result.run_path) {
					if (property['plugin.web.webview_type'] === "window") {
						// open web view on new window
						window.open('.' + result.run_path + property['plugin.web.run_index'], 'goormweb');
					} else {
						// open web view on panel
						var main_file_path = property['plugin.web.run_index'];
						var filename = property['plugin.web.run_index'];
						var filepath = result.run_path;
						var filetype = 'WebView';
						var title = filepath + property['plugin.web.run_index']; // jeongmin: core.status.current_project_path -> filepath. If use current project path as title, id attribute is same as original index.html file. So, there are two elements that has same id and it makes bug!

						var index = window_manager.is_opened(filepath, filename);
						if (index == -1) {
							window_manager.open(filepath, filename, filetype, "WebView", {
								title: title
							});
						} else {
							var webview = window_manager.open(filepath, filename, filetype, "WebView", {
								title: title
							});
							var iframe = $(webview.panel).find("iframe");
							//console.log("reload iframe");
							window.iframe = iframe;

							if (iframe.length) iframe[0].contentWindow.location.reload(true);
						}
					}
					
					output_manager.clear();
					callback();

					for (var i=0; i<window_manager.window.length; i++) {
						//escape when contents is not about current project --heeje
						if(window_manager.window[i].project !== core.status.current_project_path) {
							continue;
						} 

						self.linter.lint(window_manager.window[i], function (lint_result) {
							//console.log(lint_result);
							var output_data = null;
							for (var j=0; j<lint_result.length; j++) {
								if (lint_result[j] === "Mixed spaces and tabs.")
									continue;
								output_data = {
									'line': lint_result[j].from.line + 1,
									'content': lint_result[j].severity + ':' + lint_result[j].message,
									'file': window_manager.window[i].title
								};
								output_manager.push(output_data);

								//moving tab fix --heeje
								if(output_data.length > 0) {
									core.module.layout.select("gLayoutOutput_web");
								}
							}
						});
					}
				}
			}
		});
	}
};
