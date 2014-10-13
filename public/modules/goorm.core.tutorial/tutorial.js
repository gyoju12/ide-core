/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.tutorial = {

	restore_layout_state: null,
	custom_steps: [],
	basic: null,
	new_project: null,
	build_project: null,
	debug_project: null,
	

	init: function() {
		var self = this;
		this.basic = introJs();

		this.restore_layout_state = goorm.core.layout.layout.readState();

		// to handle (closed layout open and showing bubble button)
		var previous_step = -1;
		var dir_isNext = null; // true is next, false is prev direction.

		var basic_steps = this.get_basic_step();
		var steps = this.load_custom_step('basic', basic_steps);

		this.basic.onbeforechange(function(targetElement) {
			if (previous_step < self.basic._currentStep) {
				dir_isNext = true;
			} else if (previous_step > self.basic._currentStep) {
				dir_isNext = false;
			}
			if (!$(targetElement).is(":visible")) {
				switch (targetElement.id) {
					// when tutorial starts, show layout that is hidden.
					case "goorm_left":
						$("#goorm_left").show();
						core.module.layout.select('project');
						break;
					
					case "goorm_inner_layout_bottom":
						$("#goorm_inner_layout_bottom").show();
						core.module.layout.select('debug');
						break;
				}
			}
		});

		// to restore layout state (hidden layout, selected tab)
		var layout_restore = function() {
			self.basic.refresh();
			previous_step = -1;

			$("#bubble_toolbar").css("display", "none");
			if (restore_layout_state.west.initClosed) {
				core.module.layout.collapse('west');
			}
			if (restore_layout_state.center.children.layout1.east.initClosed) {
				core.module.layout.collapse('east');
			}
			if (restore_layout_state.center.children.layout1.south.initClosed) {
				core.module.layout.collapse('south');
			}
			$('#west_tab #' + restore_layout_state.west.west_tab).tab('show');
			$('#east_tab #' + restore_layout_state.center.children.layout1.east.east_tab).tab('show');
			$('#south_tab #' + restore_layout_state.center.children.layout1.south.south_tab).tab('show');
		};

		this.basic.onchange(function(targetElement) {});

		this.basic.onafterchange(function(targetElement) {
			if (!$(targetElement).is(":visible")) {
				switch (targetElement.id) {
					// when main toolbar is hidden,
					// show bubble toolbar
					case "main_file_toolbar":
					case "main_edit_toolbar":
					case "main_project_toolbar":
					case "main_debug_toolbar":
					case "main_window_toolbar":
					case "main_help_toolbar":
					case "bubble_file_toolbar":
					case "bubble_edit_toolbar":
					case "bubble_project_toolbar":
					case "bubble_debug_toolbar":
					case "bubble_window_toolbar":
					case "bubble_help_toolbar":
						$("#bubble_toolbar").css("display", "block");
						if (dir_isNext) {
							self.basic.goToStep((self.basic._currentStep + 1) + 6);
						} else {
							self.basic.goToStep((self.basic._currentStep + 1) - 6);
						}
						break;
				}
			}
			previous_step = self.basic._currentStep;
		});

		this.basic.onexit(function() {
			layout_restore();
		});

		this.basic.oncomplete(function() {
			layout_restore();
		});

		this.basic.setOptions({
			steps: steps
		});

		// this.build = introJs();
	},

	get_tutorial_steps: function(tutorial_name) {
		var steps = [];

		switch (tutorial_name) {
			case 'basic':
				steps = this.get_basic_step();
				break;

			case 'new_project':
				steps = this.get_new_project_steps();
				break;
			default:
				break;
		}

		return steps;
	},

	get_step_index: function(tutorial_name, id) { // div id
		var index = -1;
		var steps = this.get_tutorial_steps(tutorial_name);

		if (steps && steps.length > 0) {
			for (var i = steps.length - 1; i >= 0; i--) {
				var step = steps[i];

				if ($(step.element).attr('id') == id) {
					index = i;
					break;
				}
			}
		}

		return index;
	},

	del_custom_step: function(step_name) {
		var target_index = -1;

		for (var i = 0; i < this.custom_steps.length; i++) {
			var custom_step = this.custom_steps[i];

			if (custom_step.step_name == step_name) {
				target_index = i;
				break;
			}
		}

		if (target_index != -1) {
			this.custom_steps.remove(target_index, target_index);
		}
	},

	add_custom_step: function(step_name, tutorial_name, index, step) {
		this.del_custom_step(step_name);
		this.custom_steps.push({
			'step_name': step_name,
			'tutorial_name': tutorial_name,
			'index': index,
			'step': step
		});
	},

	load_custom_step: function(tutorial_name, steps) {
		if (this.custom_steps && this.custom_steps.length > 0) {
			this.custom_steps.map(function(custom_step) {
				if (custom_step.tutorial_name == tutorial_name) {
					steps.splice(custom_step.index + 1, 0, custom_step.step);
				}
			});
		}

		return steps;
	},

	//initialize tutorial for making new project. Jeong-Min Im.
	new_project_init: function() {
		var self = this;
		this.new_project = introJs();

		var new_project_steps = this.get_new_project_steps();
		var steps = this.load_custom_step('new_project', new_project_steps);

		// to handle (closed layout open and showing bubble button)
		var previous_step = -1;
		var dir_isNext = null; // true is next, false is prev direction.
		this.new_project.onbeforechange(function(targetElement) {});

		this.new_project.onexit(function() {});

		this.new_project.oncomplete(function() {});

		this.new_project.setOptions({
			steps: steps
		});
	},

	//initialize tutorial for building project. Jeong-Min Im.
	build_project_init: function() {

	},

	//initialize tutorial for debugging project. Jeong-Min Im.
	debug_project_init: function() {

	},
	
	start: function(chapter) {
		var self = this;
		confirmation.init({
			title: core.module.localization.msg.tutorial,
			message: core.module.localization.msg.tutorial_guide,
			yes_text: core.module.localization.msg.confirmation_yes,
			no_text: core.module.localization.msg.confirmation_no,
			yes: function() {
				if (chapter == "basic") {
					// save current layout state
					this.restore_layout_state = goorm.core.layout.layout.readState();
					this.restore_layout_state.west.west_tab = $("#goorm_left").find("#west_tab .active a").attr("id");
					this.restore_layout_state.center.children.layout1.east.east_tab = $("#goorm_inner_layout_right").find("#east_tab .active a").attr("id");
					this.restore_layout_state.center.children.layout1.south.south_tab = $("#goorm_inner_layout_bottom").find("#south_tab .active a").attr("id");

					self.init();
					self.basic.start();
				} else if (chapter == "build_project") {
					self.build_project_init();
					self.build_project.start();
				} else if (chapter == "new_project") {
					self.new_project_init();
					self.new_project.start();
				} else if (chapter == "debug_project") {
					self.debug_project_init();
					self.debug_project.start();
				}
				
			},
			no: function() {}
		});
		confirmation.show();
	},

	get_basic_step: function() {
		return [{
				element: document.querySelector('#goorm-mainmenu'),
				intro: core.module.localization.tutorial.goorm_main_menu
			}, {
				element: document.querySelector('#goorm_main_toolbar'),
				intro: core.module.localization.tutorial.goorm_main_toolbar
			}, {
				element: document.querySelector('#main_file_toolbar'),
				intro: core.module.localization.tutorial.main_file_toolbar
			}, {
				element: document.querySelector('#main_edit_toolbar'),
				intro: core.module.localization.tutorial.main_edit_toolbar
			}, {
				element: document.querySelector('#main_project_toolbar'),
				intro: core.module.localization.tutorial.main_project_toolbar
			}, {
				element: document.querySelector('#main_debug_toolbar'),
				intro: core.module.localization.tutorial.main_debug_toolbar
			}, {
				element: document.querySelector('#main_window_toolbar'),
				intro: core.module.localization.tutorial.main_window_toolbar
			}, {
				element: document.querySelector('#main_help_toolbar'),
				intro: core.module.localization.tutorial.main_help_toolbar
			}, {
				element: document.querySelector('#bubble_file_toolbar'),
				intro: core.module.localization.tutorial.bubble_file_toolbar
			}, {
				element: document.querySelector('#bubble_edit_toolbar'),
				intro: core.module.localization.tutorial.bubble_edit_toolbar
			}, {
				element: document.querySelector('#bubble_project_toolbar'),
				intro: core.module.localization.tutorial.bubble_project_toolbar
			}, {
				element: document.querySelector('#bubble_debug_toolbar'),
				intro: core.module.localization.tutorial.bubble_debug_toolbar
			}, {
				element: document.querySelector('#bubble_window_toolbar'),
				intro: core.module.localization.tutorial.bubble_window_toolbar,
				position: 'left'
			}, {
				element: document.querySelector('#bubble_help_toolbar'),
				intro: core.module.localization.tutorial.bubble_help_toolbar,
				position: 'left'
			}, {
				element: document.querySelector('#goorm_left'),
				intro: core.module.localization.tutorial.project_table,
				position: 'right',
				callback: function() {
					core.module.layout.expand('west');
					$('#west_tab #gLayoutTab_project').tab('show');
				}
			}, {
				element: document.querySelector('#goorm_left'),
				intro: core.module.localization.tutorial.pacakage_tree,
				position: 'right',
				callback: function() {
					$('#west_tab #gLayoutTab_Packages').tab('show');
				}
			}, {
				element: document.querySelector('#goorm_left'),
				intro: core.module.localization.tutorial.cloud_viewer,
				position: 'right',
				callback: function() {
					$('#west_tab #gLayoutTab_Cloud').tab('show');
				}
			}, {
				element: document.querySelector('#goorm_inner_layout_center'),
				intro: core.module.localization.tutorial.workspace
			},
			
			{
				element: document.querySelector('#goorm_inner_layout_right'),
				intro: core.module.localization.tutorial.outline_tab,
				position: 'left',
				callback: function() {
					$('#east_tab #gLayoutTab_Outline').tab('show');
				}
			}, {
				element: document.querySelector('#goorm_inner_layout_bottom'),
				intro: core.module.localization.tutorial.debug_tab,
				position: 'top',
				callback: function() {
					core.module.layout.expand('south');
					$('#south_tab #gLayoutTab_Debug').tab('show');
				}
			}, {
				element: document.querySelector('#goorm_inner_layout_bottom'),
				intro: core.module.localization.tutorial.terminal_tab,
				position: 'top',
				callback: function() {
					$('#south_tab #gLayoutTab_Terminal').tab('show');
				}
			}, {
				element: document.querySelector('#goorm_inner_layout_bottom'),
				intro: core.module.localization.tutorial.search_tab,
				position: 'top',
				callback: function() {
					$('#south_tab #gLayoutTab_Search').tab('show');
				}
			}
		];
	},

	get_new_project_steps: function() {
		return [{
			element: document.querySelector('button[action=new_project]'),
			intro: core.module.localization.tutorial.newproject,
			position: "right"
		}, {
			element: document.querySelector('#dlg_new_project .modal-content'),
			intro: core.module.localization.tutorial.newproject_wizard
		}, {
			element: document.querySelector('#new_project_template .dialog_left_inner'),
			intro: core.module.localization.tutorial.project_type
		}, {
			element: document.querySelector('#new_project_template .dialog_center'),
			intro: core.module.localization.tutorial.project_dtype
		}, {
			element: document.querySelector('#new_project_template .dialog_center'),
			intro: core.module.localization.tutorial.c_example,
			callback: function() {
				$('#new_project_template .dialog_center .c_examples').click();
			}
		}, {
			element: document.querySelector('#g_np_btn_next'),
			intro: core.module.localization.tutorial.nextbutton,
			position: "top"
		}, {
			element: document.querySelector('#new_project_storage_field'),
			intro: core.module.localization.tutorial.storage_field
		}, {
			element: document.querySelector('#new_project_information'),
			intro: core.module.localization.tutorial.new_project_infomation
		}, {
			element: document.querySelector('#input_project_name'),
			intro: core.module.localization.tutorial.input_project_name,
			callback: function() {
				// setTimeout(function () {
				$('#input_project_name').val("test");
				// }, 1000);
			}
		}, {
			element: document.querySelector('#g_np_btn_ok_template'),
			intro: core.module.localization.tutorial.c_finish_newproject,
			position: "top"
		}];
	}
};

