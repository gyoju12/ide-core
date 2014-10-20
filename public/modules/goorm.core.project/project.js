/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project = {
	treeview: null,
	is_building: false,
	is_running: false,

	load_build: function(options, callback) {

		if (this.is_building) return;
		else {
			this.is_building = true;
		}

		var self = this;
		var project_path = options.project_path;
		var project_type = options.project_type;
		var project_data = core.workspace[project_path];
		var property = project_data.plugins;
		var check = options.check;
		var socket = io.connect();

		// Delete unnecessary Project_data
		delete project_data.hash;
		delete project_data.permission;
		delete project_data.is_check;
		delete project_data.check;

		if (!callback) callback = null;
		if (!check) check = null;

		//define is_latest_build if not being --heeje
		if (typeof(project_data.is_latest_build) === "undefined")
			project_data.is_latest_build = false;

		if (check) {
			if (core.module.plugin_manager.plugins["goorm.plugin." + project_type] !== undefined) {
				
				
				var build = null;
				var query = null;

				if (property) {
					if (project_type != 'edu') {
						property = property["goorm.plugin." + project_type];

						//query: project_path, project_type, class_name, source_path --heeje
						query = {
							project_path: options.project_path,
							project_type: options.project_type,
							class_name: property["plugin." + options.project_type + ".main"],
							source_path: property["plugin." + options.project_type + ".source_path"],
							sid: core.socket.socket.sessionid
						};
					} else {
						query = {
							project_path: options.project_path,
							project_type: options.project_type,
							sid: core.socket.socket.sessionid
						};
					}
					//build
					build = function() {
						if (core.module.plugin_manager.plugins["goorm.plugin." + project_type].build) {
							core.module.plugin_manager.plugins["goorm.plugin." + project_type].build({
								'project_path': project_path,
								'property': property,
								'detailed_type': project_data.detailedtype
							}, function(build_result) {
								$.get('project/set_bin', { // jeongmin: change bin's group permission
									project_path: project_path
								}, function(build_result) {
									if (build_result) {
										//save latest build status on the goorm.manifest --heeje
										project_data.is_latest_build = true;
										core.module.project.property.save_property(project_path, project_data, callback);

									} else {
										if (callback && typeof(callback) == "function")
											callback();
									}

									self.is_building = false;
								});
							});
						}
					};

					switch (options.project_type) {
						case "java":
						case "java_examples":
						case "c_examples":
						case "cpp":
							// $.get("project/check_valid_property", query, function(data){
							// 	if(data && data.result) {
							// 		build();
							// 	} else {
							// 		//error
							// 		if (data.code == 1) {
							// 			alert.show(core.module.localization.msg.check_property_source);
							// 		} else if (data.code == 2) {
							// 			alert.show(core.module.localization.msg.check_property_main);
							// 		}
							// 	}
							// });
							socket.once('/project/check_valid_property', function(data) {
								if (data && data.result) {
									build();
								} else {
									//error
									if (data.code == 1) {
										alert.show(core.module.localization.msg.check_property_source);
									} else if (data.code == 2) {
										alert.show(core.module.localization.msg.check_property_main);
									}

									self.is_building = false;
								}
							});
							socket.emit('/project/check_valid_property', query);

							break;
						default:
							build();
							break;
					}
				}
				
			}
		} else {

			if (property) {
				property = property["goorm.plugin." + project_type];

				//build
				if (core.module.plugin_manager.plugins["goorm.plugin." + project_type].build) {
					core.module.plugin_manager.plugins["goorm.plugin." + project_type].build({
						'project_path': project_path,
						'property': property,
						'detailed_type': project_data.detailedtype
					}, function(data) {
						$.get('project/set_bin', { // jeongmin: change bin's group permission
							project_path: project_path
						}, function(build_result) {
							if (build_result) {
								//save latest build status on the goorm.manifest --heeje
								project_data.is_latest_build = true;
								core.module.project.property.save_property(project_path, project_data, callback);
								self.is_building = false;
							} else {
								if (callback && typeof(callback) == "function") {
									callback();
									self.is_building = false;
								}
							}
						});
					});
				}
			}
		}
	},

	display_error_message: function(result, type) {

		function display_message(message) {
			if (type == 'toast') {
				core.module.toast.show(message);
			} else if (type == 'alert') {
				alert.show(message);
			}
		}

		switch (result.code) {
			case 0:
				display_message(core.module.localization.msg.alert_cannot_project_run);
				break;
			case 1:
				display_message(core.module.localization.msg.alert_cannot_project_remote_run);
				break;
			case 2:
				display_message(core.module.localization.msg.alert_cannot_project_generate);
				break;
			case 3:
				display_message(core.module.localization.msg.alert_cannot_project_build);
				break;
			case 4:
				display_message(core.module.localization.msg.alert_select_project_item);
				break;
			case 5:
				display_message(core.module.localization.msg.alert_project_not_opened);
				break;
			case 6:
				display_message(core.module.localization.msg.alert_cannot_project_debug);
				break;
			case 7:
				display_message(core.module.localization.msg.alert_plugin_not_while_running);
				break;
			default:
				break;
		}
	},

	run: function(options, callback) {
		var self = this;

		if (!options) {
			if (core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type] !== undefined) {
				core.status.current_project_absolute_path = core.preference.workspace_path + core.status.current_project_path + "/";

					
				self.send_run_cmd();
				

				
			} else if (core.status.current_project_type == 'edu') {
				self.send_run_cmd();
			} else {
				var result = {
					result: false,
					code: 0
				};
				core.module.project.display_error_message(result, 'alert');
			}
		} else if (options.type == 'Native') {
			if (Boolean(options.cmd)) {
				core.module.layout.terminal.send_command(options.cmd + '\r', null, function() {
					if (callback && typeof(callback)) {
						callback(true);
					}
				});
			} else {
				if (callback && typeof(callback)) {
					callback(false);
				}
			}

		} else if (options.type == 'Web') {
			options.project_path = core.status.current_project_path;
			options.project_dir = core.status.current_project_path;
			$.post('/plugin/do_web_run', options, function(result) {
				if (result.code == 200) {
					if (callback && typeof(callback)) {
						callback(result);
					}
				} else {
					if (callback && typeof(callback)) {
						callback(false);
					}
				}
			});

		} else if (options.cmd) {
			core.module.layout.terminal.send_command(options.cmd + '\r', function(result) {
				if (callback && typeof(callback)) {
					callback(result);
				}
			});
		}

		// if (!options) {
		// 	if (core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type] !== undefined) {
		// 		core.status.current_project_absolute_path = core.preference.workspace_path + core.status.current_project_path + "/";
		// 		// core.module.layout.select('terminal');	// jeongmin: move to plugin
		// 		//core.module.layout.inner_layout.getUnitByPosition("bottom").expand();

		// 			
		// 		self.send_run_cmd();
		// 		

		// 		

		// 	} else {
		// 		var result = {
		// 			result: false,
		// 			code: 0
		// 		};
		// 		core.module.project.display_error_message(result, 'alert');

		// 	}
		// }
		// else {
		// 	var type = options.type;

		// 	if (type === 'Web') {
		// 		$.post('/plugin/do_web_run', options, function(result) {
		// 			if (result.code == 200) {
		// 				if (callback && typeof(callback)) {
		// 					callback(result);
		// 				}
		// 			}
		// 			else {
		// 				if (callback && typeof(callback)) {
		// 					callback(false);
		// 				}
		// 			}
		// 		});
		// 	}
		// }
	},

	run_latest_bin: function(is_build_fail, type) {
		var self = this;
		var property = core.workspace[core.status.current_project_path];
		var p = property.plugins["goorm.plugin." + core.status.current_project_type];
		var latest = property.is_latest_build;
		var build_path = p["plugin." + core.status.current_project_type + ".build_path"];
		var build_main = p["plugin." + core.status.current_project_type + ".main"];

		//language fix -- java -will have to be changed to switch-case if languages using this function are bigger --heeje
		if (type && (type == "java" || type == "java_examples"))
			build_main += ".class";

		is_build_fail = is_build_fail || false;

		$.get("project/check_latest_build", {
			"project_path": core.status.current_project_path,
			"run_file_path": core.preference.workspace_path + core.status.current_project_path + '/' + build_path + build_main
		}, function(data) {
			if (data) {
				//depreciated function --heeje
				//if (data.result && (latest || (data.path.indexOf(build_path + p["plugin." + core.status.current_project_type + ".main"]) > -1))) {
				if (data.result && latest) {
					self.send_run_cmd();
				} else {
					if (is_build_fail)
						return;
					confirmation.init({
						title: core.module.localization.msg.confirmation_not_latest_build,
						message: core.module.localization.msg.confirmation_not_latest_build_run_msg,
						yes_text: core.module.localization.msg.confirmation_build_and_run,
						no_text: core.module.localization.msg.confirmation_cancel, // jeongmin
						//yes_localization: "confirmation_build_and_run",

						yes: function() {
							self.send_build_cmd(function() {
								self.run_latest_bin(true, type);
							});
						},
						no: function() {
							// self.send_run_cmd();	// jeongmin: cancel. Nothing to do.
						}
					});
					confirmation.show();
				}
			} else {
				// if check_lastest_build failed...
				self.send_run_cmd();
			}
		});
	},

	send_run_cmd: function() {
		//for stop button
		this.is_running = true;
		$('button[action="stop"]').removeClass('debug_not_active');
		$('button[action="stop"]').removeAttr('isdisabled', 'disabled');
		$('a[action="stop"]').parent().removeClass('disabled');
		
		core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type].run({
			path: core.status.current_project_path,
			property: core.property.plugins["goorm.plugin." + core.status.current_project_type]
		}, function() {

		});
	},

	send_build_cmd: function(callback) {
		var project_path = core.status.current_project_path;
		var project_type = core.status.current_project_type;

		this.load_build({
			'project_path': project_path,
			'project_type': project_type
		}, callback);
	},

	// 2.0버전 API (정경욱)
	create: function(options, callback) {
		$.post('/plugin/create', options, function(result) {
			

			
			callback(result);
			
		});
	},

	clean: function(options, callback) {
		var path = options.path;
		var target = options.target;
		core.module.layout.terminal.send_command("cd " + path + "; find . -type f -iname \\" + target + " -delete; clear\r", function() {
			if ($.isFunction(callback))
				callback();
		});
	},

	add: function(options) {
		// items --> name이 같은 것이 았으면 안되고, type(require)도 이미 있는지 검사,
		/*
		core.module.project.add({
			'name': 'Coffeescript Project', // require 
			'type': 'coffeescript' // require
			'description': 'goormIDE Coffeescript Project' // require
			'img': '/'+this.load_path+'goorm.plugin.coffeescript/images/coffeescript.png',
			'items': [{
				'name': 'Coffeescript Project' // require
				'description': 'Create New Project for Coffeescript Plugin'
				'img': '/'+this.load_path+'goorm.plugin.coffeescript/images/coffeescript_console.png'
			}]
		});
		core.module.project.add({
			'name': '',
			'type': '',
			'description': '',
			'img': '',
			'items': [{
				'name': '',
				'description': '',
				'img': ''
			}]
		}); */
		options.name = options.name || "";
		options.description = options.description || "";
		//CSS import
		var localization = "plugin." + options.type + ".";
		// Project New 왼쪽에 Project Type 버튼 추가
		if (!$(".project_wizard_first_button[project_type='" + options.type + "']").length) {
			$("div[id='project_new']").find(".project_types").append("<a href='#' class='list-group-item project_wizard_first_button' project_type='" + options.type + "'><img src='" + options.img + "' class='project_icon' /><h4 class='list-group-item-heading' class='project_type_title' localization_key='" + localization + "name'>" + options.name + "</h4><p class='list-group-item-text' class='project_type_description' localization_key='" + localization + "description'>" + options.description + "</p></a>");

			// Project New 오른쪽에 새 Project Button 추가
			for (var i = 0; i < options.items.length; i++) {
				options.items[i].name = options.items[i].name || "";
				options.items[i].description = options.items[i].description || "";
				$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all " + options.type + " thumbnail' description='" + options.items[i].description + "' localization_key='" + localization + options.items[i].key + ".description'  project_type='" + options.type + "' plugin_name='goorm.plugin." + options.type + "' detail_type='" + options.items[i].detail_type + "'><img src='" + options.items[i].img + "' class='project_item_icon'><div class='caption'><p localization_key='" + localization + options.items[i].key + ".name'>" + options.items[i].name + "</p></div></div>");
			}
		}

		// Project Open/Import/Export/Delete에 Project Type Option 추가
		// if (!$("option [value='" + options.type + "']").length)
		// 	$(".project_dialog_type").append("<option value='" + options.type + "'>" + options.name + "s</option>").attr("selected", "");

		// add main menu
		if (!$("li .plugin_project a[action='new_file_" + options.type + "']").length)
			$("li[id='plugin_new_project']").after("<li class='plugin_project'><a href='#' action='new_file_" + options.type + "' localization_key='" + localization + "name'>" + options.name + "</a></li>");

		// add menu action
		$("a[action=new_file_" + options.type + "]").unbind("click");
		$("a[action=new_file_" + options.type + "]").click(function() {
			core.dialog.new_project.show(function() {
				$("#project_new").find(".dialog_left_inner").scrollTop($("#project_new").find(".dialog_left_inner").scrollTop() + $(".project_wizard_first_button[project_type=" + options.type + "]").position().top);
			});
			$("#project_new a[href='#new_project_template']").trigger("click");
			$(".project_wizard_first_button[project_type=" + options.type + "]").trigger("click").trigger("focus");
		});
	},

	// save - part of build function -- heeje
	// __save: function(project) {
	// 	console.log("save function run");

	// 	var wm = core.module.layout.workspace.window_manager;
	// 	var current = core.status.current_project_path;
	// 	if(project) current = project.path;

	// 	for(var i=0; i<wm.window.length; i++) {
	// 		if(wm.window[i].project == current) {
	// 			if (wm.window[i].alive) {

	// 				if (wm.window[i].editor) {
	// 					wm.window[i].editor.save();
	// 				}

	// 				wm.window[i].set_saved();
	// 				wm.tab[i].set_saved();
	// 			}
	// 		}
	// 	}

	// 	//save done -- heeje
	// }
};