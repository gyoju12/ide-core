/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE 
 * version: 2.0.0
 **/

goorm.core.debug = function() {
	this.target = "";
	this.layout = null;
	this.table_thread = null;
	this.table_variable = null;
	this.debug_current_project = null;
	this.debug_current_project_type = null;
	this.debug_terminal = null;
	this.debug_prompt = null;
	this.debug_endstr = null;
};

goorm.core.debug.prototype = {

	init: function() {
		var self = this;

		this.init_css();
		this.button_inactive();

		//left
		$('#debug_left').html('<table cellpadding="0" cellspacing="0" border="0" class="display table table-hover table-condensed table-bordered" id="debug_left_table" ></table>');
		this.table_thread = $('#debug_left_table').dataTable({
			"aaData": [],
			"aoColumns": [{
				"sTitle":'<span localization_key="number">No</span>' 
			}, {
				"sTitle": '<span localization_key="thread">Thread</span>'
			}],
			"sDom": '<"H"f>Rrt',
			"bFilter": false,
			"bInfo": false,
			"bAutoWidth": false,
			"bSort": false,
			"oLanguage": {
				"sZeroRecords": "N/A",
				"sEmptyTable": "N/A"
			}

		});

		//center
		$('#debug_tab_center').html('<table cellpadding="0" cellspacing="0" border="0" class="display table table-hover table-condensed table-bordered" id="debug_tab_center_table" ></table>');
		this.table_variable = $('#debug_tab_center_table').dataTable({
			"aaData": [],
			"aoColumns": [{
				"sTitle": '<span localization_key="variable">Variable</span>'
			}, {
				"sTitle": '<span localization_key="value">Value</span>'
			}, {
				"sTitle": '<span localization_key="summary">Summary</span>'
			}],
			"sDom": '<"H"f>Rrt',
			"bFilter": false,
			"bSort": false,
			"bAutoWidth": false,
			"oLanguage": {
				"sZeroRecords": "N/A",
				"sEmptyTable": "N/A"
			}

		});

		$("#debug_left").resizable();

		// click Event
		$('#debug_tab_center_table').on('click', 'tbody td', function() {
			//$(core.module.debug).trigger('table_click_row', this);
		});

		$(core).on("layout_resized", function() {
			self.resize();
		});

		this.resize();

		$(core).one('goorm_login_complete',function(){
			core.module.localization.local_apply('#debug_left span','dict');
			core.module.localization.local_apply('#debug_tab_center span','dict');
		});
	},

	init_css: function(argument) {
		var debug_layout = $("#debug_tab");
		var debug_wrapper = $("#debug_wrapper");

		var layout_bottom_height = $("#goorm_inner_layout_bottom").height();
		var layout_bottom_width = $("#goorm_inner_layout_bottom").width();

		debug_layout.height(parseInt(layout_bottom_height));
		debug_wrapper.height(parseInt(layout_bottom_height));

		debug_layout.parent().css("overflow", "hidden"); // tab-content
	},

	resize: function() {
		// width... - false resizing -- hide 
		// var debug_center_width = $('#debug_wrapper').width() - $('#debug_left').outerWidth();

		// if (debug_center_width > 0) {
		// 	$('#debug_tab_center').width(parseInt(debug_center_width));
		// }

		//height...
		var layout_bottom_height = $("#goorm_inner_layout_bottom").height() - 26;
		layout_bottom_height = parseInt(layout_bottom_height);
		$("#debug_tab").css("height", layout_bottom_height + 'px');
		$('#debug_wrapper').css("height", layout_bottom_height + 'px');
		$('#debug_wrapper').children().css("height", layout_bottom_height + 'px');
	},

	//function for debug
	debug_start: function(is_build_fail) {

		//check whether project is open --heeje
		if(!core.property || !core.status.current_project_type || core.status.current_project_type == "") {
			alert.show(core.module.localization.msg.alert_cannot_project_run);
			return false;
		}

		var project_path = core.status.current_project_path;
		var project_type = core.status.current_project_type;
		var plugin_manager = core.module.plugin_manager.plugins["goorm.plugin." + project_type];
		var self = this;
		var p = core.property.plugins["goorm.plugin." + project_type];
		var build_path = p["plugin." + project_type + ".build_path"];
		var build_main = p["plugin." + core.status.current_project_type + ".main"];
		var latest = core.workspace[core.status.current_project_path].is_latest_build;

		if(project_type && (project_type == "java" || project_type == "java_examples"))
			build_main += ".class";

		switch (project_type) {
			case 'c':
			case 'c_examples': // jeongmin
			case 'cpp':
			case 'java':
			case 'java_examples': // jeongmin
			case 'jsp':
				break;
			default: 
				this.button_active();
				core.module.layout.select('debug');
				core.module.layout.terminal.status = 'debug';
				plugin_manager.debug({
					'path': project_path,
					'property': core.property.plugins["goorm.plugin."+core.status.current_project_type]
				});
				return;
		}
		
		//latest build checking --heeje
		is_build_fail = is_build_fail || false;
		if (plugin_manager && plugin_manager.debug) {
			$.get("project/check_latest_build", {
				"project_path": project_path,
				"run_file_path": core.preference.workspace_path + core.status.current_project_path + '/' + build_path + build_main
			}, function(data) {
				if (data) {
					if (data.result && latest) {
						self.button_active();
						//check history and alter it to current status --heeje
						if(core.module.layout.history.selected_snapshot)
							$("#history .history_header").click();
		
						core.module.layout.select('debug');
						core.module.layout.terminal.status = 'debug';
						plugin_manager.debug({
							'path': project_path,
							'property': core.property.plugins["goorm.plugin."+core.status.current_project_type]
						});
					} else{

						self.button_inactive();
						if(is_build_fail)
							return;
						confirmation.init({
							title: core.module.localization.msg.confirmation_not_latest_build,
							message: core.module.localization.msg.confirmation_not_latest_build_debug,
							yes_text: core.module.localization.msg.confirmation_build_and_debug,
							no_text: core.module.localization.msg.confirmation_cancel, 
							yes: function() {
								goorm.core.project.send_build_cmd(function(){self.debug_start(true);});
							},
							no: function() {}
						});
						confirmation.show();
					}
				}
			});
			
		} else {
			var result = {
				result: false,
				code: 6
			};
			core.module.project.display_error_message(result, 'alert');
		}
	},

	debug_terminate: function() {
		var project_type = this.debug_current_project_type;
		var project_path = this.debug_current_project;
		var plugin_manager = core.module.plugin_manager.plugins["goorm.plugin." + project_type];
		this.button_inactive();

		if (plugin_manager !== undefined && $("#g_window_debug").length != 0) {
			core.module.layout.select('debug');
			var cmd = {
				mode: "terminate",
				project_path: project_path
			};

			plugin_manager.debug_cmd({
				'cmd': cmd,
				'property': core.preference.plugins["goorm.plugin."+project_type]
			}, function() {
				var w = core.module.layout.workspace.window_manager.get_window('/', 'debug');
				
				//prevent error when close debug tab clicking 'X' button on window
				if(w && w.index > -1) {
					var idx = w.index;
					core.module.layout.workspace.window_manager.close_by_index(idx, idx);
				}
				$("#g_window_debug").dialog('destroy').remove();
			});
		} else {
			var result = {
				result: false,
				code: 6
			};
			//core.module.project.display_error_message(result, 'alert');
		}
	},

	debug_continue: function() {
		var plugin_manager = core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type];

		if (plugin_manager !== undefined && $("#g_window_debug").length != 0) {
			core.module.layout.select('debug');
			var cmd = {
				mode: "continue",
				project_path: core.status.current_project_path
			};
			plugin_manager.debug_cmd({
				'cmd': cmd,
				'property': core.property.plugins["goorm.plugin."+core.status.current_project_type]
			});
		} else {
			var result = {
				result: false,
				code: 6
			};
			core.module.project.display_error_message(result, 'alert');
		}
	},

	debug_step_over: function() {
		var plugin_manager = core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type];


		if (plugin_manager !== undefined && $("#g_window_debug").length != 0) {
			core.module.layout.select('debug');
			var cmd = {
				mode: "step_over",
				project_path: core.status.current_project_path
			};
			plugin_manager.debug_cmd({
				'cmd': cmd,
				'property': core.property.plugins["goorm.plugin."+core.status.current_project_type]
			});
		} else {
			var result = {
				result: false,
				code: 6
			};
			core.module.project.display_error_message(result, 'alert');
		}
	},
	debug_step_in: function() {
		var plugin_manager = core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type];


		if (plugin_manager !== undefined && $("#g_window_debug").length != 0) {
			core.module.layout.select('debug');
			var cmd = {
				mode: "step_in",
				project_path: core.status.current_project_path
			};
			plugin_manager.debug_cmd({
				'cmd': cmd,
				'property': core.property.plugins["goorm.plugin."+core.status.current_project_type]
			});
		} else {
			var result = {
				result: false,
				code: 6
			};
			core.module.project.display_error_message(result, 'alert');
		}
	},
	debug_step_out: function() {
		var plugin_manager = core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type];

		if (plugin_manager !== undefined && $("#g_window_debug").length != 0) {
			core.module.layout.select('debug');
			var cmd = {
				mode: "step_out",
				project_path: core.status.current_project_path
			};
			plugin_manager.debug_cmd({
				'cmd': cmd,
				'property': core.property.plugins["goorm.plugin."+core.status.current_project_type]
			});
		} else {
			var result = {
				result: false,
				code: 6
			};
			core.module.project.display_error_message(result, 'alert');
		}
	},

	button_active: function() {
		var debug_state_btn1 = $("#goorm_main_toolbar .toolbar-debug-continue, #goorm_main_toolbar .toolbar-debug-terminate, #goorm_main_toolbar .toolbar-debug-step-over, #goorm_main_toolbar .toolbar-debug-step-in, #goorm_main_toolbar .toolbar-debug-step-out");
		var none_debug_state_btn1 = $("#goorm_main_toolbar .toolbar-debug-start");
		var debug_state_btn2 = $("#goorm-mainmenu .menu-debug-continue, #goorm-mainmenu .menu-debug-terminate, #goorm-mainmenu .menu-debug-step-over, #goorm-mainmenu .menu-debug-step-in, #goorm-mainmenu .menu-debug-step-out");
		var none_debug_state_btn2 = $("#goorm-mainmenu .menu-debug-start");

		debug_state_btn1.removeClass('debug_not_active');
		none_debug_state_btn1.addClass('debug_not_active');
		debug_state_btn2.removeClass('debug_not_active');
		none_debug_state_btn2.addClass('debug_not_active');

		debug_state_btn1.parent().parent().removeAttr("isdisabled");
		none_debug_state_btn1.parent().parent().attr("isdisabled","disabled");
	},

	button_inactive: function() {
		var debug_state_btn1 = $("#goorm_main_toolbar .toolbar-debug-continue, #goorm_main_toolbar .toolbar-debug-terminate, #goorm_main_toolbar .toolbar-debug-step-over, #goorm_main_toolbar .toolbar-debug-step-in, #goorm_main_toolbar .toolbar-debug-step-out");
		var none_debug_state_btn1 = $("#goorm_main_toolbar .toolbar-debug-start");
		var debug_state_btn2 = $("#goorm-mainmenu .menu-debug-continue, #goorm-mainmenu .menu-debug-terminate, #goorm-mainmenu .menu-debug-step-over, #goorm-mainmenu .menu-debug-step-in, #goorm-mainmenu .menu-debug-step-out");
		var none_debug_state_btn2 = $("#goorm-mainmenu .menu-debug-start");

		debug_state_btn1.addClass('debug_not_active');
		none_debug_state_btn1.removeClass('debug_not_active');
		debug_state_btn2.addClass('debug_not_active');
		none_debug_state_btn2.removeClass('debug_not_active');

		debug_state_btn1.parent().parent().attr("isdisabled","disabled");
		none_debug_state_btn1.parent().parent().removeAttr("isdisabled");
	},


	/* Debug Table API */
	debug_terminal_open: function () {
		this.debug_terminal = core.module.layout.workspace.window_manager.open("/", "debug", "terminal", "Terminal").terminal;
	},

	debug_setting: function (options) {
		var prompt = options.prompt;
		var endstr = options.endstr;
		var path = core.status.current_project_path;
		var type = core.status.current_project_type;
		
		if (prompt) {
			this.debug_prompt = prompt;
		}
		if (endstr) {
			this.debug_terminal.debug_endstr = endstr;
		}
		if (path) {
			this.debug_current_project = path;
		}
		if (type) {
			this.debug_current_project_type = type;
		}
	},

	add_data_table: function (variable, value, summary) {
		var t1 = Number(variable.indexOf("key='"))+5;
		var t2 = Number(variable.indexOf("' show="));
		var id=variable.slice(t1,t2);
		var sendData={}, ev={};
		ev.keyDown=13;

		value = '<div id="'+id+'" class="edit_ready" style="width:100%;height:100%;">'+value + '</div>';

		if (this.table_variable) {
			if (variable && value && summary)
			this.table_variable.fnAddData([
				variable,
				value,
				summary
			]);
		}
		var project_type=core.status.current_project_type;
		if(project_type==='c_examples' || project_type === 'cpp') {

			var edit_box=$('#'+id);
			edit_box.parent().click(function() {
				var data=edit_box.html();
				if(edit_box.hasClass('edit_ready')) {
					core.module.terminal.terminal.Terminal.keyDown(ev);
					edit_box.removeClass('edit_ready');
					edit_box.addClass('editing');
					edit_box.html("<input type='text' value='"+data+"' class='edit_box' style='width:100%;height:100%'>");	
					
					core.status.focus_obj = edit_box;
				}			
			});

			$(document).on('click', function(e) {
				var edit_box=$('#'+$('.editing').attr("id"));
				if(!$(e.target).is('.editing') && !$(e.target).is('.edit_box')) {
					var data=edit_box.children().val();
					edit_box.html(data);	
					edit_box.removeClass('editing');
					edit_box.addClass('edit_ready');
					sendData.variable=edit_box.attr("id");
					sendData.value=data;
					if(typeof sendData.value!="undefined") {
						$(core.module.debug).trigger('value_changed', sendData);	
					}
				} else if(edit_box.hasClass('edit_ready')) {
					core.module.terminal.terminal.Terminal.keyDown(ev);
					edit_box.removeClass('edit_ready');
					edit_box.addClass('editing');
					edit_box.html("<input type='text' value='"+data+"' style='width:100%;height:100%'>");	
					core.status.focus_obj = edit_box;
				}	
			});
			edit_box.on('keyup','.edit_box', function(e) {
			    if (e.keyCode == 13) {
			    	var data=$(this).val();
					edit_box.html(data);	
					edit_box.removeClass('editing');
					edit_box.addClass('edit_ready');
					sendData.variable=edit_box.attr("id");
					sendData.value=data;
					if(typeof sendData.value!="undefined") {
						$(core.module.debug).trigger('value_changed', sendData);	
					}
			    }  else {
			    	core.status.focus_obj = $(this);
			    }       
			});
		}
	},

	delete_data_table: function (row) {
		if (this.table_variable) {
			this.table_variable.fnDeleteRow(row);
		}
	},

	clear_table: function() {
		if (this.table_variable)
			this.table_variable.fnClearTable();
	}
};
