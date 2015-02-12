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
		/*
		//left
		$('#debug_left').html('<table cellpadding="0" cellspacing="0" border="0" class="display table table-hover table-condensed" id="debug_left_table" ></table>');
		this.table_thread = $('#debug_left_table').dataTable({
			"aaData": [],
			"aoColumns": [{
				"sTitle": '<span localization_key="number">No</span>'
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

		this.table_thread.find("thead th:last").unbind('mousemove.ColReorder');
		*/
		//center
		$('#debug_tab_center').html('<table cellpadding="0" cellspacing="0" border="0" class="display table table-hover table-condensed" id="debug_tab_center_table" ></table>');
		this.table_variable = $('#debug_tab_center_table').dataTable({
			"aaData": [],
			"aoColumns": [{
				"sTitle": '<span localization_key="variable">Variable</span>'
			}, {
				"sTitle": '<span localization_key="value">Value</span>'
			}, {
				"sTitle": '<span localization_key="summary">Summary</span>'
			}],
			"oColReorder": {
				"minWidth": 100
			},
			"sDom": '<"H"f>Rrt',
			"bFilter": false,
			"bSort": false,
			"bAutoWidth": false,
			"oLanguage": {
				"sZeroRecords": "N/A",
				"sEmptyTable": "N/A"
			},
			"iDisplayLength": -1 // jeongmin: no paging
		});

		//		$("#debug_left").resizable();

		// click Event
		$('#debug_tab_center_table').on('click', 'tbody td', function() {
			//$(core.module.debug).trigger('table_click_row', this);
		});

		$(core).on("layout_resized", function() {
			self.resize();
		});

		this.resize();

		$(core).one('goorm_login_complete', function() {
			core.module.localization.local_apply('#debug_left span', 'dict');
			core.module.localization.local_apply('#debug_tab_center span', 'dict');
		});

		// if current project doesn't support debug, hide debug menu and vice versa. Jeong-Min Im.
		$(core).on('on_project_open', function() {
			var plugin_manager = core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type];

			if (plugin_manager && plugin_manager.debug) { // current project supports debug feature
				self.show_menu();
			} else { // current project doesn't support debug feature
				self.hide_menu();
			}
		});

		$(document).on('click', function(e) {
			var edit_box = self.table_variable.find('.editing');
			if (!$(e.target).is('.editing') && !$(e.target).is('.edit_box')) {
				var data = edit_box.children().val();
				var sendData = {};
				edit_box.html(data);
				edit_box.removeClass('editing');
				edit_box.addClass('edit_ready');
				sendData.variable = edit_box.parent().attr("data-tt-id");
				sendData.value = data;
				if (typeof sendData.value != "undefined") {
					$(core.module.debug).trigger('value_changed', sendData);
				}
			}
		});
	},

	init_css: function(argument) {
		var debug_layout = $("#debug_tab");
		var debug_wrapper = $("#debug_wrapper");

		var layout_bottom_height = $("#goorm_inner_layout_bottom .tab-content").height();
		var layout_bottom_width = $("#goorm_inner_layout_bottom .tab-content").width();

		debug_layout.height(layout_bottom_height);
		debug_wrapper.height(layout_bottom_height);

		debug_layout.parent().css("overflow", "hidden"); // tab-content
	},

	resize: function() {
		// width... - false resizing -- hide 
		// var debug_center_width = $('#debug_wrapper').width() - $('#debug_left').outerWidth();

		// if (debug_center_width > 0) {
		// 	$('#debug_tab_center').width(parseInt(debug_center_width));
		// }

		//height...
		var layout_bottom_height = $("#goorm_inner_layout_bottom .tab-content").height();
		$("#debug_tab").css("height", layout_bottom_height + 'px');
		$('#debug_wrapper').css("height", layout_bottom_height + 'px');
		$('#debug_wrapper').children().css("height", layout_bottom_height + 'px');

		// jeongmin: adjust width
		var debug_tab_center_table = $('#debug_tab_center_table');
		var left_column = debug_tab_center_table.find('.sorting_disabled:nth-child(1)');
		var center_column = debug_tab_center_table.find('.sorting_disabled:nth-child(2)');

		debug_tab_center_table.css('table-layout', 'auto');


		//seongho.cha : table automatically be resized. but if did't set width, bug occur when user resize table by theirselves.
		var all = $('#debug_tab_center').innerWidth();
		var left = left_column.width();
		var left_padding = parseInt(left_column.css('padding'), 10); // jeongmin: padding should be subtracted, too
		var right = debug_tab_center_table.find('.sorting_disabled:nth-child(3)').outerWidth;
		var center = all - left - left_padding - right;

		left_column.width(left);
		center_column.width(center);

		debug_tab_center_table.css('table-layout', 'fixed'); // jeongmin: fix width

	},

	//function for debug
	debug_start: function(is_build_fail) {

		//check whether project is open --heeje
		if (!core.property || !core.status.current_project_type || core.status.current_project_type == "") {
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

		if (project_type && (project_type == "java" || project_type == "java_examples"))
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
					'property': core.property.plugins["goorm.plugin." + core.status.current_project_type]
				});
				return;
		}

		//latest build checking --heeje
		is_build_fail = is_build_fail || false;
		// if (plugin_manager && plugin_manager.debug) {	// jeongmin: if debug is undefined, menu will be not shown
		_$.get("project/check_latest_build", {
			"project_path": project_path,
			"run_file_path": project_path + '/' + build_path + build_main
		}, function(data) {
			if (data) {
				if (data.result && latest) {
					self.button_active();
					
					core.module.layout.select('debug');
					core.module.layout.terminal.status = 'debug';
					plugin_manager.debug({
						'path': project_path,
						'property': core.property.plugins["goorm.plugin." + core.status.current_project_type]
					});
				} else {

					self.button_inactive();
					if (is_build_fail)
						return;
					confirmation.init({
						title: core.module.localization.msg.confirmation_not_latest_build,
						message: core.module.localization.msg.confirmation_not_latest_build_debug,
						yes_text: core.module.localization.msg.confirmation_build_and_debug,
						no_text: core.module.localization.msg.confirmation_cancel,
						yes: function() {
							goorm.core.project.send_build_cmd(function() {
								self.debug_start(true);
							});
						},
						no: function() {}
					});
					confirmation.show();
				}
			}
		});

		// } else {
		// 	var result = {
		// 		result: false,
		// 		code: 6
		// 	};
		// 	core.module.project.display_error_message(result, 'alert');
		// }
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
				'property': core.preference.plugins["goorm.plugin." + project_type]
			}, function() {
				var w = core.module.layout.workspace.window_manager.get_window('/', 'debug');
				//prevent error when close debug tab clicking 'X' button on window
				if (w && w.index > -1) {
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
				'property': core.property.plugins["goorm.plugin." + core.status.current_project_type]
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
				'property': core.property.plugins["goorm.plugin." + core.status.current_project_type]
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
				'property': core.property.plugins["goorm.plugin." + core.status.current_project_type]
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
				'property': core.property.plugins["goorm.plugin." + core.status.current_project_type]
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

		var debug_start_btn = $("#main_debug_toolbar button[action='debug']");
		var debug_terminate_btn = $("#main_debug_toolbar button[action='debug_stop']");
		//var debug_state_btn2 = $("#goorm-mainmenu .menu-debug-continue, #goorm-mainmenu .menu-debug-terminate, #goorm-mainmenu .menu-debug-step-over, #goorm-mainmenu .menu-debug-step-in, #goorm-mainmenu .menu-debug-step-out");
		//var none_debug_state_btn2 = $("#goorm-mainmenu .menu-debug-start");
		var debug_state_btn2 = $("#goorm-mainmenu a[action='debug_continue'], #goorm-mainmenu a[action='debug_step_over'], #goorm-mainmenu a[action='debug_step_in'],#goorm-mainmenu a[action='debug_step_out'],#goorm-mainmenu a[action='debug_terminate']");
		var none_debug_state_btn2 = $("#goorm-mainmenu a[action='debug']");


		debug_state_btn1.removeClass('debug_inactive');
		none_debug_state_btn1.addClass('debug_inactive');
		debug_state_btn2.parent().removeClass('disabled');
		none_debug_state_btn2.parent().addClass('disabled');

		debug_state_btn1.parent().parent().removeAttr("isdisabled");
		none_debug_state_btn1.parent().parent().attr("isdisabled", "disabled");

		debug_start_btn.hide();
		debug_terminate_btn.show();
	},

	button_inactive: function() {
		var debug_state_btn1 = $("#goorm_main_toolbar .toolbar-debug-continue, #goorm_main_toolbar .toolbar-debug-terminate, #goorm_main_toolbar .toolbar-debug-step-over, #goorm_main_toolbar .toolbar-debug-step-in, #goorm_main_toolbar .toolbar-debug-step-out");
		var none_debug_state_btn1 = $("#goorm_main_toolbar .toolbar-debug-start");

		var debug_start_btn = $("#main_debug_toolbar button[action='debug']");
		var debug_terminate_btn = $("#main_debug_toolbar button[action='debug_stop']");
		//var debug_state_btn2 = $("#goorm-mainmenu .menu-debug-continue, #goorm-mainmenu .menu-debug-terminate, #goorm-mainmenu .menu-debug-step-over, #goorm-mainmenu .menu-debug-step-in, #goorm-mainmenu .menu-debug-step-out");
		//		var none_debug_state_btn2 = $("#goorm-mainmenu .menu-debug-start");
		var debug_state_btn2 = $("#goorm-mainmenu a[action='debug_continue'], #goorm-mainmenu a[action='debug_step_over'], #goorm-mainmenu a[action='debug_step_in'],#goorm-mainmenu a[action='debug_step_out'],#goorm-mainmenu a[action='debug_terminate']");
		var none_debug_state_btn2 = $("#goorm-mainmenu a[action='debug']");

		debug_state_btn1.addClass('debug_inactive');
		none_debug_state_btn1.removeClass('debug_inactive');
		debug_state_btn2.parent().addClass('disabled');
		none_debug_state_btn2.parent().removeClass('disabled');

		debug_state_btn1.parent().parent().attr("isdisabled", "disabled");
		none_debug_state_btn1.parent().parent().removeAttr("isdisabled");

		debug_start_btn.show();
		debug_terminate_btn.hide();
	},

	show_menu: function() {
		$('#main-menu-debug').show();
		$('#main_debug_toolbar').show();
		$('#main_debug_toolbar').removeClass('disabled'); // for more toolbar
		$('#bubble_debug_toolbar').show();
		$('#bubble_debug_toolbar').removeClass('disabled'); // for more toolbar
		$('[href="#debug_tab"]').show();
	},

	hide_menu: function() {
		$('#main-menu-debug').hide();
		$('#main_debug_toolbar').hide();
		$('#main_debug_toolbar').addClass('disabled'); // for more toolbar
		$('#bubble_debug_toolbar').hide();
		$('#bubble_debug_toolbar').addClass('disabled'); // for more toolbar
		$('[href="#debug_tab"]').hide();
		$('[href="#terminal"]').click();
	},

	/* Debug Table API */
	debug_terminal_open: function() {
		//id patch --heeje
		this.debug_window = core.module.layout.workspace.window_manager.open("/", "debug", "terminal", "Terminal");
		this.debug_terminal = this.debug_window.terminal;
		this.debug_window.panel.attr("id", "g_window_debug");
	},

	debug_setting: function(options) {
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


	add_data_table: function(data, parent, draw) { //parent is this rows' parent (in struct)
		var index;
		data = (typeof(data[0]) !== "object") ? [data] : data; //if it is 1D array, make it 2D array
		draw = (draw === undefined) ? true : draw;


		if (this.table_variable) {
			if (data) {
				index = this.table_variable.fnAddData(data, draw);
				var nodes = this.table_variable.fnSettings().aoData;
				for (var i = 0; i < index.length; i++) {
					var node = nodes[index[i]].nTr;
					node.setAttribute('data-tt-id', data[i][0]);
					if (parent) { // jeongmin: this row has parent(struct)
						node.setAttribute('data-tt-parent-id', parent); // jeongmin: specify its parent, so connect with its parent as tree
					}
				}
			}

		}

		if (draw) {
			var project_type = core.status.current_project_type;
			if (project_type === 'c_examples' || project_type === 'cpp' || project_type === 'java_examples' || project_type === 'java' || project_type === 'ruby') {
				for (var i = 0; i < data.length; i++) {
					var edit_box = this.table_variable.find("tr[data-tt-id='" + data[i][0] + "'] td").eq(1);
					this.bind_edit_box(edit_box);
				}

			}
		}
		return index;
	},

	bind_edit_box: function(edit_boxs) {
		var sendData = {};
		var ev = {};
		ev.keyDown = 13;


		edit_boxs.addClass('edit_ready');
		edit_boxs.click(function(e) {
			var edit_box = $(e.target);
			var data = edit_box.html();
			if (edit_box.hasClass('edit_ready')) {
				core.module.terminal.terminal.Terminal.keyDown(ev);
				edit_box.removeClass('edit_ready');
				edit_box.addClass('editing');
				// edit_box.html("<input type='text' value='" + data + "' class='edit_box' style='width:100%;height:100%'>");
				edit_box.html("<input type='text' class='edit_box' style='width:100%;height:100%'>");
				data = data.replace(/&gt;/g, '>');
				edit_box.find('.edit_box').val(data);

				core.status.focus_obj = edit_box;
			}
		});
		edit_boxs.on('keyup', '.edit_box', function(e) {
			var edit_box = $(e.target).parent();
			if (e.keyCode == 13) {
				var data = $(this).val();
				edit_box.html(data);
				edit_box.removeClass('editing');
				edit_box.addClass('edit_ready');
				sendData.variable = edit_box.parent().attr("data-tt-id");
				sendData.value = data;
				if (typeof sendData.value != "undefined") {
					$(core.module.debug).trigger('value_changed', sendData);
				}
			} else {
				core.status.focus_obj = $(this);
			}
		});

	},

	delete_data_table: function(row) {
		if (this.table_variable) {
			this.table_variable.fnDeleteRow(row);
		}
	},

	clear_table: function() {
		if (this.table_variable) {
			this.table_variable.fnClearTable();
		}
	},

	// add treetable to debug table. Jeong-Min Im.
	refresh_treetable: function() {
		var self = this;

		$('#debug_tab_center_table').treetable({
			expandable: true,
			// resize after expand -> width can be wide after expanding. Jeong-Min Im.
			onNodeExpand: function() {
				// resize after node is completely expanded. Jeong-Min Im.
				var temp = $.debounce(function() {
					self.resize();
				}, 100);

				temp();
			},
			// resize after collapse -> width can be narrowed after collapsing. Jeong-Min Im.
			onNodeCollapse: function() {
				// resize after node is completely collapsed. Jeong-Min Im.
				var temp = $.debounce(function() {
					self.resize();
				}, 100);

				temp();
			}
		}, true); // true: force reinitialize

		this.resize();
	}
};