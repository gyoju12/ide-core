/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.preference = {
	dialog: null,
	tabview: null,
	treeview: null,
	buttons: null,
	manager: null,
	ini: null,
	plugin: null,
	preference: null,
	firstShow: true,
	grid_opacity_slider: null,
	preference_default: null,
	is_saved: false,

	init: function() {
		var self = this;

		this.panel = $("#dlg_preference");

		this.manager = goorm.core.preference.manager;
		this.manager.init();

		this.dialog = new goorm.core.dialog();

		this.load_default();

	},

	load_default: function() {
		var self = this;
		// read default preference file
		// if (core.is_optimization) {
		var json = this.parse_json();

		self.preference = json;
		core.preference = json;
		self.preference_default = $.extend(true, {}, json);
		self.load();

		// $.get('/preference/workspace_path', function (data) {
		// 	self.preference.workspace_path = data.path;
		// });

		// init for editor option
		//
		var v = core.preference['preference.editor.line_wrapping'];

		if (v === true || v === 'true') {
			v = true;
		} else {
			v = false;
		}

		if (v) {
			$('#use_line_wrapping').css('visibility', 'visible');
		} else {
			$('#use_line_wrapping').css('visibility', 'hidden');
		}

		var v = core.preference['preference.editor.rulers'];

		if (v === true || v === 'true') {
			v = true;
		} else {
			v = false;
		}

		if (v) {
			$('#use_rulers').css('visibility', 'visible');
		} else {
			$('#use_rulers').css('visibility', 'hidden');
		}
		// } else {
		// this.manager.get_default_file("configs/preferences/default.json", function (json) {
		// 	self.preference = json;
		// 	core.preference = json;
		// 	self.preference_default = $.extend(true, {}, json);
		// 	self.load();

		// 	$.get('/preference/workspace_path', function (data) {
		// 		self.preference.workspace_path = data.path;
		// 	});
		// });
		// }
	},

	load_preference: function(path) {
		this.manager.get_default_file(path, function(json) {
			$.extend(true, core.preference, json);
		});
	},

	parse_json: function() {
		var os = goorm.core.shortcut.manager.getOStype();
		var json = JSON.parse(external_json['public']['configs']['preferences']['default.json']);

		if (!json) json = {};

		if (os == "mac") {
			$.each(json, function(key, value) {
				if (/^preference.shortcut/.test(key)) {
					json[key] = json[key].replace(/Ctrl/g, 'Meta');
				}
			});
		}

		return json;
	},

	// load from localStorage
	load: function() {
		var shortcut = null;

		$.each(core.preference, function(key, value) {
			if (!$.isEmptyObject(localStorage[key])) {
				if (key != "plugins") {
					core.preference[key] = localStorage[key];
				} else {
					// load plugin information
					var plugins = JSON.parse(localStorage[key]);
					$.each(plugins, function(name, plugin) {
						core.preference[key][name] = plugin;
					});
				}
			} else if (/^preference.shortcut/.test(key)) { //jeongmin: get shortcut from preference
				if (localStorage.shortcut) { //jeongmin: if only shortcut property is in the localStorage
					if (!shortcut && typeof(localStorage.shortcut) == 'string') //jeongmin: if shortcut is valid
						shortcut = JSON.parse(localStorage.shortcut); //jeongmin: get shortcut object -> now shortcut variable is not null

					if (shortcut[key]) { //jeongmin: if shortcut.key is valid
						core.preference[key] = shortcut[key]; //jeongmin: set shortcut on preference
					}
				}
			}
		});
		localStorage.workspace && (core.preference.workspace = JSON.parse(localStorage.workspace));
	},

	//jeongmin: merge with apply function
	// save current preferences(core.preference) to localStorage or share.json
	// save: function () {
	// 	$.each(core.preference, function (key, value) {
	// 		if (key == "share") {

	// 		} else {
	// 			if (typeof value == "object") {
	// 				localStorage[key] = JSON.stringify(value);
	// 			} else {
	// 				localStorage[key] = value;
	// 			}
	// 		}
	// 	});
	// },

	save_to_database: function() {
		var current_project = localStorage.getItem('current_project');
		var language = localStorage.getItem('language');
		var shortcut = localStorage.getItem('shortcut'); //jeongmin: get shortcut object from localStorage
		
		var postdata = {
			'preference': {}
		};

		current_project && (current_project != "null") && (postdata.preference.current_project = current_project);
		language && (postdata.preference.language = language);
		shortcut && (shortcut.length > 2) && (postdata.preference.shortcut = shortcut); //jeongmin: save shortcut at postdata
		
		postdata.preference = JSON.stringify(postdata.preference);

		$.ajax({
			'type': 'POST',
			'url': '/user/preference/save',
			'data': postdata,
			'async': false,
			'success': function(result) {
				if (result) {
					console.log('user preference saved');
				}
			}
		});

	},
	update_ui: function() {
		$.each(core.preference, function(key, value) { //jeongmin: make apply button can save preference to localStorage(originally save function)

			if (key === "share") {

			} else {
				if (key === "preference.editor.rulers") {
					if (value === true || value === 'true')
						$('#use_rulers').css('visibility', 'visible');
					else $('#use_rulers').css('visibility', 'hidden');
				}

				if (key === "preference.editor.line_wrapping") {
					if (value == true || value === 'true')
						$('#use_line_wrapping').css('visibility', 'visible');
					else $('#use_line_wrapping').css('visibility', 'hidden');
				}

				if (typeof value === "object") {
					localStorage[key] = JSON.stringify(value);
				} else {
					localStorage[key] = value;
				}
			}
		});

	},
	apply: function(id) {
		// core.module.theme.load_css();
		this.read_dialog(core.preference);
		switch (id) {
			case 'line_wrapping':
			case 'rulers':
				$(core).trigger("on_global_preference_confirmed");
				break;
			default:
				$(core).trigger("on_preference_confirmed");
				break;
		}

		this.update_ui();
		$(core).trigger('renew_stack');
		core.module.layout.workspace.window_manager.resize_all();
	},

	restore_default: function(tabName) {
		this.fill_dialog(this.preference_default, tabName);
		$(core).trigger("on_preference_restored"); //jeongmin: for shortcut -> empty temporary modified shortcut
	},

	read_dialog: function(preference) {
		var target = "#preference_tabview";

		var targets = $(target).children('div.tab-content').children();

		var key = null;
		$.each(targets, function(index, div) {
			if ($(targets[index]).attr('plugin') == 'null') {
				key = preference;
			} else {
				key = preference.plugins[$(targets[index]).attr('plugin')];
			}
			if (key) {
				$(targets[index]).find("input").each(function() {
					var value;

					if ($(this).attr("type") === "checkbox") {
						value = $(this).prop("checked");
					} else if ($(this).attr("type") === "radio") {
						if ($(this).prop("checked") === true) {
							value = $(this).val();
						} else return;
					} else {
						value = $(this).val();
					}
					if ($(this).attr("name")) {
						key[$(this).attr("name")] = value;
					}
				});

				$(targets[index]).find("textarea").each(function() {
					key[$(this).attr("name")] = $(this).val();
				});

				$(targets[index]).find("select.form-control").each(function() {
					key[$(this).attr("name")] = $(this).children("option:selected").val();
				});
			}

		});
	},

	fill_dialog: function(preference, tabName) {
		var targets = tabName ? $('#' + tabName) : $('#preference_tabview').children('div.tab-content').children();
		var key = null;
		$.each(targets, function(index, div) {
			var target_index = $(targets[index]);

			var plugin_name = target_index.attr('plugin');
			if (target_index.attr('plugin') == 'null') {
				key = preference;
			} else {
				key = preference.plugins[plugin_name];
				if (key === undefined) return;
			}

			if (key[$(this).attr("name")] !== "undefined" || key[$(this).attr("name")] !== undefined) {
				$(targets[index]).find("input.form-control").each(function() {
					var name = $(this).attr("name");
					var type = $(this).attr("type");
					
					if (key[name] !== "undefined") {
						if (type == "checkbox") {
							
							if (key[name] == "true" || key[name] === true) {
								$(this).iCheck("check"); //jeongmin: change to iCheck
							} else {
								$(this).iCheck("uncheck"); //jeongmin: change to iCheck
							}
						} else if (type == "radio") {
							if (key[name] == $(this).val()) {
								$(this).iCheck("check"); //jeongmin: change to iCheck
							} else {
								$(this).iCheck("uncheck"); //jeongmin: change to iCheck
							}
						} else {
							$(this).val(key[name]);
						}
					} else { //jeongmin: if there isn't right value
						$(this).val(""); //jeongmin: just set blank
					}
				});
				$(target_index).find("textarea").each(function() {
					if (key[$(this).attr("name")]) {
						$(this).val(key[$(this).attr("name")]);
					}
				});
				$(target_index).find("select.form-control").each(function() {
					if ($(this).attr("name") && $(this).attr("name") !== 'undefined' && key[$(this).attr("name")]) {
						$(this).children("option[value='" + key[$(this).attr("name")] + "']").attr("selected", "true");
						$(this).val(key[$(this).attr("name")]);
					}
				});
			}
		});
	},

	show: function() {
		this.set_before();
		if (this.firstShow) {
			// $("#preference_tabview #System").show();
			this.firstShow = false;
		}
		core.module.localization.before_language = localStorage.getItem("language");

		this.panel.modal('show');
	},

	set_before: function() {
		// this.load();
		this.fill_dialog(core.preference);
	},

	init_dialog: function() {
		var self = this;
		var handle_ok = function(panel) {
			var check_input_string = check_input();
			if (check_input_string.length == 0) {
				self.apply();
				// self.save();	//jeongmin: this function is merged with apply function 

				self.is_saved = true;
				self.panel.modal('hide');
			} else {
				alert.show("[" + check_input_string.join(", ") + "]<br/>" + core.module.localization.msg.alert_positive_value_only);
			}
		};

		var handle_cancel = function() {

			if (!self.is_saved) {
				if (core.module.localization.before_language != localStorage.getItem("language")) {
					core.module.localization.change_language(core.module.localization.before_language, true);
				}
			}

			self.is_saved = false;
			self.set_before();

			self.panel.modal('hide');
		};

		var check_input = function() {
			var return_string = [];

			if (!/^[0-9]*$/.test($("#preference\\.editor\\.indent_unit").val())) {
				return_string.push($("label[for=preference\\.editor\\.indent_unit]").text());
			} else {
				if ($("#preference\\.editor\\.indent_unit").val() < 1) {
					return_string.push($("label[for=preference\\.editor\\.indent_unit]").text());
				}
			}
			if (!/^[0-9]*$/.test($("#preference\\.editor\\.undo_depth").val())) {
				return_string.push($("label[for=preference\\.editor\\.undo_depth]").text());
			} else {
				if ($("#preference\\.editor\\.undo_depth").val() < 1) {
					return_string.push($("label[for=preference\\.editor\\.undo_depth]").text());
				}
			}

			return return_string;

		};

		var set_dialog_button = function() {
			// set Apply, restore_default Button
			$("#preference_tabview").find(".apply").click(function() {
				self.apply();
			}).each(function(i) {
				$(this).attr("id", "preference_applyBt_" + i);
			});

			$("#preference_tabview").find(".restore_default").click(function(e) {
				var tabName = $(this).parents(".tab-pane").attr("id");
				self.restore_default(tabName);
			}).each(function(i) {
				$(this).attr("id", "preference_restore_defaultBt_" + i);
			});


		};

		var load_plugin_tree = function() {
			var plugin_node = null,
				plugin_list = core.module.plugin_manager.list,
				plugin_count = plugin_list.length,
				tree_data = [];

			var get_plugin_data = function(plugin_name) {
				// if (core.is_optimization) {
				var json = JSON.parse(external_json.plugins[plugin_name]['tree.json']);
				if (json.preference) {
					var data = self.manager.convert_json_to_tree("Plugin", json.preference);
					return data;
				} else return [];
				// }
			};

			// load plugin tree.json
			$.each(core.module.plugin_manager.list, function(index, plugin) {
				var plugin_name = plugin.name;
				tree_data = $.merge(tree_data, get_plugin_data(plugin_name));
			});

			self.manager.plugin_data = tree_data;
			set_dialog_button();
		};

		this.load();

		this.dialog.init({
			// localization_key: "title_preference",
			id: "dlg_preference",
			handle_ok: handle_ok,
			handle_cancel: handle_cancel,
			success: function() {
				// create default dialog tree and tabview
				var json = JSON.parse(external_json['public']['configs']['dialogs']['goorm.core.preference']['tree.json']);

				// load plugin tree
				load_plugin_tree();

				// construct basic tree structure
				// self.manager.create_treeview(json[core.module.localization.language]);

				// if (/FileType/.test(label)) {
				// 	$(".filetype_list").find("div").first().trigger('click');
				// }

				// 	window.setTimeout(function () {
				// 		$($("#preference_tabview #" + label).find('input[readonly!=readonly][type=text]')[0]).focus();
				// 	}, 200);
				// });

				var info = goorm.core.preference.info;
				info.init();

				var filetype = goorm.core.preference.filetype;
				filetype.init();

				var language = goorm.core.preference.language;
				language.init();

				$.get('/preference/workspace_path', function(data) {
					self.preference.workspace_path = data.path;
				});
				$(core).on("language_loaded", function(event, change) {
					self.manager.create_treeview(json[core.module.localization.language], change);
				});
				$(core).trigger("preference_load_complete");
			}
		});


	}

};