/*
 *
 *
 *
 *
 *
 */

goorm.core.tutorial_tour = {
	restore_layout_state: null,
	tutorial: null,
	basic: null,
	new_project: null,
	build_project: null,
	debug_project: null,
	
	tab_steps: {}, // handle output tab 
	custom_steps: {
		name: null,
		tutorial: null,
		steps: [],
	},

	// tour._options.storage is localStorage
	init: function() {
		var self = this;
		var default_template = "";
		default_template += "<div class='popover' style='z-index: 10000'>";
		default_template += "	<div class='arrow'></div>";
		default_template += "	<h3 class='popover-title'></h3>";
		default_template += "	<div class='popover-content'></div>";
		default_template += "	<div class='popover-navigation'>";
		default_template += "		<div class='btn-group' id='tutorial_button_set'>";
		default_template += "			<button class='btn btn-sm btn-primary' data-role='prev' localization_key='tutorial_prev'>" + core.module.localization.msg.tutorial_prev + "</button>";
		default_template += "			<button class='btn btn-sm btn-primary' data-role='next' localization_key='tutorial_next'>" + core.module.localization.msg.tutorial_next + "</button>";
		default_template += "			<button class='btn btn-sm btn-primary' data-role='end' localization_key='tutorial_end'>" + core.module.localization.msg.tutorial_end + "</button>";
		default_template += "		</div>";
		default_template += "	</div>";
		default_template += "</div>";

		this.tutorial = new Tour({
			name: "basic",
			//debug: true,
			keyboard: true,
			reflex: false,
			template: default_template,
			backdrop: true,
			afterGetState: function(key, value) {},
			afterSetState: function(key, value) {},
			afterRemoveState: function(key, value) {},
			onStart: function(tour) {
				console.log("#" + tour._options.name + " tutorial start...");
				if (tour._options.backdrop) {
					self.tutorial._onResize(function() {
						self.rearrange_tutorial_backdrop();
					}, 350);
				}
			},
			onEnd: function(tour) {
				tour.setCurrentStep(0);
			},
			onShow: function(tour) {},
			onShown: function(tour) {},
			onHide: function(tour) {},
			onHidden: function(tour) {},
			onNext: function(tour) {},
			onPrev: function(tour) {},
			onPause: function(tour, duration) {},
			onResume: function(tour, duration) {},
		});
		$(window).one('beforeunload', function() {
			// bootstrap tour save step, isend in localStorage.
			// we customize bootstrap tour to unsave the information.
			self.tutorial._removeState("current_step");
			self.tutorial._removeState("end");
		});
	},

	start: function(chapter) {
		var self = this;

		confirmation.init({
			title: core.module.localization.msg.tutorial,
			message: core.module.localization.msg.tutorial_guide,
			yes_text: core.module.localization.msg.confirmation_yes,
			no_text: core.module.localization.msg.confirmation_no,
			yes: function() {
				// before tutorial start, remember layout state.
				self.save_layout();
				goorm.core.layout.reposition_bubble_toolbar();

				if (core.module.layout.layout.north.state.layoutHeight < 70) {
					core.module.layout.layout.sizePane('north', 81);
					core.module.layout.layout.open('north');
					$('#goorm_main_toolbar')[0].style.visibility = "visible";
				}
				if (chapter == "basic") {
					// "basic" option setting...
					self.init();
					self.basic = self.tutorial;
					self.basic._options.name = "basic";
					self.basic._options.orphan = false;
					self.basic._options.onEnd = function(tour) {
						tour.setCurrentStep(0);
						self.restore_layout();
						$("#bubble_toolbar").css("display", "none");
						self.clear_tutorial_element(self.basic._options.name);
					};
					self.basic.addSteps(self.get_basic_steps());

					// if current project has output tab,
					// add output step
					var output_step = self.get_output_step();
					if (output_step)
						self.basic.addStep(output_step);

					// "basic" tutorial start
					self.basic.init();
					if (self.basic.ended())
						self.basic.restart();
					else {
						self.basic.start();
					}
				} else if (chapter == "new_project") {
					// "new_project" option setting...
					self.init();
					self.new_project = self.tutorial;
					self.new_project._options.name = "new_project";
					self.new_project._options.orphan = true;
					self.new_project._options.onEnd = function(tour) {
						tour.setCurrentStep(0);
						self.restore_layout();
						$("#dlg_new_project").modal("hide");
						$("#dlg_new_project").addClass("fade"); //revert modal animation
						self.clear_tutorial_element(self.new_project._options.name);
					};
					self.new_project.addSteps(self.get_new_project_steps());

					// remove modal animation
					$("#dlg_new_project").removeClass("fade");

					// "new_project" tutorial start
					self.new_project.init();
					if (self.new_project.ended())
						self.new_project.restart();
					else {
						self.new_project.start();
					}
				} else if (chapter == "build_project") {
					if ($('#main_project_toolbar button[action="build_project"]').css('display') == "none") {
						// alert
						alert.show(core.module.localization.tutorial.alert_select_project_can_build);
						return;
					}

					// "build_project" option setting...
					self.init();
					self.build_project = self.tutorial;
					self.build_project._options.name = "build_project";
					self.build_project._options.orphan = true;
					self.build_project._options.onEnd = function(tour) {
						tour.setCurrentStep(0);
						self.restore_layout();
						$("#dlg_build_project").modal("hide");
						$("#dlg_build_project").addClass("fade"); //revert modal animation
						$("#bubble_toolbar").css("display", "none");
						self.clear_tutorial_element(self.build_project._options.name);
					};
					self.build_project.addSteps(self.get_build_project_steps());

					// remove modal animation
					$("#dlg_build_project").removeClass("fade");

					// "build_project" tutorial start
					self.build_project.init();
					if (self.build_project.ended())
						self.build_project.restart();
					else {
						self.build_project.start();
					}
				} else if (chapter == "debug_project") {
					// "debug_project" option setting...
					self.init();
					self.debug_project = self.tutorial;
					self.debug_project._options.name = "debug_project";
					self.debug_project._options.orphan = true;
					self.debug_project._options.onEnd = function(tour) {
						tour.setCurrentStep(0);
						self.restore_layout();
						$("#bubble_toolbar").css("display", "none");
						self.clear_tutorial_element(self.debug_project._options.name);
					};
					self.debug_project.addSteps(self.get_debug_project_steps());

					// "debug_project" tutorial start
					self.debug_project.init();
					if (self.debug_project.ended())
						self.debug_project.restart();
					else {
						self.debug_project.start();
					}
				}
				
			},
			no: function() {}
		});
		confirmation.show();
	},

	custom_steps_start: function(options) {
		var self = this;
		this.custom_steps = {
			'name': options.name,
			'tutorial': null,
			'steps': options.steps
		};
		this.init();
		this.custom_steps.tutorial = this.tutorial;
		this.custom_steps.tutorial._options.name = "custom_tutorial_" + this.custom_steps.name;
		this.custom_steps.tutorial._options.backdrop = false;
		this.custom_steps.tutorial._options.debug = false;
		this.custom_steps.tutorial._options.orphan = true;

		var elem = null;
		this.custom_steps.tutorial._options.onNext = function(tour) {
			elem = self.custom_steps.tutorial.getStep(self.custom_steps.tutorial.getCurrentStep() + 1).element;
			$(options.content_container).scrollTop($(elem).position().top);
			$(options.content_container).find('.edu-highlight').removeClass('edu-highlight-yellow');
		};

		this.custom_steps.tutorial._options.onPrev = function(tour) {
			elem = self.custom_steps.tutorial.getStep(self.custom_steps.tutorial.getCurrentStep() - 1).element;
			$(options.content_container).scrollTop($(elem).position().top);
			$(options.content_container).find('.edu-highlight').removeClass('edu-highlight-yellow');
		};

		this.custom_steps.tutorial._options.onShown = function(tour) {
			elem = self.custom_steps.tutorial.getStep(self.custom_steps.tutorial.getCurrentStep()).element;
			// $(options.content_container).scrollTop($(elem).position().top);
			$(elem).find('.edu-highlight').addClass('edu-highlight-yellow')
		};

		this.custom_steps.tutorial._options.onEnd = function(tour) {
			tour.setCurrentStep(0);
			$(options.content_container).find('.edu-highlight').removeClass('edu-highlight-yellow');
		};

		this.custom_steps.tutorial.addSteps(this.custom_steps.steps);

		this.custom_steps.tutorial.init();
		if (this.custom_steps.tutorial.ended()) {
			this.custom_steps.tutorial.restart();
		} else {
			this.custom_steps.tutorial.start();
		}

	},

	// tutorial chapter "basic" step setting...
	get_basic_steps: function() {
		return [
			// layout top (menu...)
			{
				element: "#goorm-mainmenu",
				title: core.module.localization.tutorial.title_basic,
				content: core.module.localization.tutorial.goorm_main_menu,
				placement: "bottom",
			}, {
				element: "#goorm_main_toolbar",
				title: "",
				content: core.module.localization.tutorial.goorm_main_toolbar,
				placement: "bottom",
			}, {
				element: "#main_file_toolbar",
				title: "",
				content: core.module.localization.tutorial.main_file_toolbar,
				placement: "bottom",
			}, {
				element: "#main_edit_toolbar",
				title: "",
				content: core.module.localization.tutorial.main_edit_toolbar,
				placement: "bottom",
			}, {
				element: "#main_project_toolbar",
				title: "",
				content: core.module.localization.tutorial.main_project_toolbar,
				placement: "bottom",
			}, {
				element: "#main_debug_toolbar",
				title: "",
				content: core.module.localization.tutorial.main_debug_toolbar,
				placement: "bottom",
			}, {
				element: "#main_window_toolbar",
				title: "",
				content: core.module.localization.tutorial.main_window_toolbar,
				placement: "bottom",
			}, {
				element: "#main_help_toolbar",
				title: "",
				content: core.module.localization.tutorial.main_help_toolbar,
				placement: "bottom",
			}, {
				element: "#bubble_file_toolbar",
				title: "",
				content: core.module.localization.tutorial.bubble_file_toolbar,
				placement: "bottom",
				onShow: function() {
					$("#bubble_toolbar").css("display", "block");
				},
			}, {
				element: "#bubble_edit_toolbar",
				title: "",
				content: core.module.localization.tutorial.bubble_edit_toolbar,
				placement: "bottom",
				onShow: function() {
					$("#bubble_toolbar").css("display", "block");
				},
			}, {
				element: "#bubble_project_toolbar",
				title: "",
				content: core.module.localization.tutorial.bubble_project_toolbar,
				placement: "bottom",
				onShow: function() {
					$("#bubble_toolbar").css("display", "block");
				},
			}, {
				element: "#bubble_debug_toolbar",
				title: "",
				content: core.module.localization.tutorial.bubble_debug_toolbar,
				placement: "bottom",
				onShow: function() {
					$("#bubble_toolbar").css("display", "block");
				},
			}, {
				element: "#bubble_window_toolbar",
				title: "",
				content: core.module.localization.tutorial.bubble_window_toolbar,
				placement: "bottom",
				onShow: function() {
					$("#bubble_toolbar").css("display", "block");
				},
			}, {
				element: "#bubble_help_toolbar",
				title: "",
				content: core.module.localization.tutorial.bubble_help_toolbar,
				placement: "bottom",
				onShow: function() {
					$("#bubble_toolbar").css("display", "block");
				},
			},
			// layout left (project, packages, cloud tab)
			{
				element: "#goorm_left",
				title: "",
				content: core.module.localization.tutorial.project_table_tut,
				placement: "right",
				onShow: function(tour) {
					$("#bubble_toolbar").css("display", "none");
					core.module.layout.expand('west');
					$('#west_tab #gLayoutTab_project').tab('show');
				},
				onShown: function(tour) {},
			},
			// {
			// 	element: "#goorm_left",
			// 	title: "",
			// 	content: core.module.localization.tutorial.cloud_viewer,
			// 	placement: "right",
			// 	onShow: function (tour) {
			// 		$('#west_tab #gLayoutTab_Cloud').tab('show');
			// 	},
			// },
			{
				element: "#goorm_inner_layout_center",
				title: "",
				placement: "left",
				content: core.module.localization.tutorial.workspace
			},
			// layout right (chat, docs, history, outline tab)
			 
			{
				element: "#goorm_inner_layout_right",
				title: "",
				content: core.module.localization.tutorial.outline_tab,
				placement: "left",
				onShown: function(tour) {
					$('#east_tab #gLayoutTab_Outline').tab('show');
				},
			},
			
			// layout bottom (debug, terminal, search tab);
			{
				element: "#goorm_inner_layout_bottom",
				title: "",
				content: core.module.localization.tutorial.debug_tab,
				placement: "top",
				onShow: function(tour) {
					core.module.layout.expand('south');
				},
				onShown: function(tour) {
					$('#south_tab #gLayoutTab_Debug').tab('show');
				},
			}, {
				element: "#goorm_inner_layout_bottom",
				title: "",
				content: core.module.localization.tutorial.terminal_tab,
				placement: "top",
				onShown: function(tour) {
					$('#south_tab #gLayoutTab_Terminal').tab('show');
				},
			}, {
				element: "#goorm_inner_layout_bottom",
				title: "",
				content: core.module.localization.tutorial.search_tab,
				placement: "top",
				onShown: function(tour) {
					$('#south_tab #gLayoutTab_Search').tab('show');
				},
			},
			// need to append output tab...
		];
	},
	// tutorial chapter "new_project" step setting...
	get_new_project_steps: function() {
		return [
			// new project wizard step 1
			{
				element: "#main_file_toolbar button[action=new_project]",
				title: core.module.localization.tutorial.title_new_project,
				content: core.module.localization.tutorial.new_project,
				placement: "bottom",
				onNext: function(tour) {
					$("#main_toolbar button[action=new_project]").click();
				}
			}, {
				element: "#dlg_new_project .modal-content",
				title: "",
				content: core.module.localization.tutorial.new_project_wizard,
				placement: "top",
				onPrev: function(tour) {
					$("#dlg_new_project").modal("hide");
				},
				onShown: function(tour) {
					// setTimeout(function () {
					// 	core.module.tutorial.rearrange_tutorial_backdrop();
					// }, 150);
					// project type 'All' focusing...
					$("#project_new .dialog_left_inner").scrollTop(0);
					$("#project_new .project_types a[project_type=all]").click();
				},
			}, {
				element: "#project_new .dialog_left_inner",
				title: "",
				content: core.module.localization.tutorial.project_type,
				placement: "right",
			}, {
				element: "#project_new .dialog_center",
				title: "",
				content: core.module.localization.tutorial.project_dtype,
				placement: "left",
			}, {
				element: "#project_new .dialog_center",
				title: "",
				content: core.module.localization.tutorial.c_example,
				placement: "top",
				onPrev: function(tour) {
					// remove selected_button C Basic Example
					$("#new_project_template .dialog_center .c_examples").removeClass("selected_button");
				},
				onShown: function(tour) {
					// select C Basic Example
					$("#new_project_template .dialog_center .c_examples")[0].click();
				},
			}, {
				element: "#g_np_btn_next",
				title: "",
				content: core.module.localization.tutorial.nextbutton,
				placement: "top",
				onNext: function(tour) {
					$("#g_np_btn_next").click();
				}
			},
			// new project wizard step 2
			{
				element: "#project_new #new_project_storage",
				title: "",
				content: core.module.localization.tutorial.storage_field,
				placement: "top",
				onPrev: function(tour) {
					$("#g_np_btn_previous").click();
				}
			}, {
				element: "#project_new #input_project_name",
				title: "",
				content: core.module.localization.tutorial.input_project_name,
				placement: "top",
			}, {
				element: "#project_new #input_project_desc",
				title: "",
				content: core.module.localization.tutorial.new_project_infomation,
				placement: "top",
			}, {
				element: "#g_np_btn_ok_template",
				title: "",
				content: core.module.localization.tutorial.new_project_finish,
				placement: "top"
			}
		];
	},
	// tutorial chapter "build_project" step setting...
	get_build_project_steps: function() {
		var tutorial_build_step = [];

		if ($('#main_project_toolbar').css('display') === 'none') {
			// when show bubble toolbar
			tutorial_build_step.push({
				element: "#bubble_toolbar button[action=build_project]",
				title: core.module.localization.tutorial.title_build_project,
				content: core.module.localization.tutorial.build_project_start,
				placement: "bottom",
				onShow: function(tour) {
					$("#bubble_toolbar").css("display", "block");
				},
			});
		} else {
			// when show main toolbar
			tutorial_build_step.push({
				element: "#main_toolbar button[action=build_project]",
				title: core.module.localization.tutorial.title_build_project,
				content: core.module.localization.tutorial.build_project_start,
				placement: "bottom",
			});
		}

		tutorial_build_step.push(
			// select many project build in dropdown.
			{
				element: "#goorm-mainmenu a[action=build_dialog]",
				title: "",
				content: core.module.localization.tutorial.build_project_select_many,
				placement: "right",
				onShow: function(tour) {
					// 'project' dropdown
					$($("#goorm-mainmenu .dropdown-toggle")[2]).click();
				},
				onPrev: function(tour) {
					// 'project' dropdown
					$($("#goorm-mainmenu .dropdown-toggle")[2]).click();
				},
				onNext: function(tour) {
					// 'project' dropdown
					$("#goorm-mainmenu a[action=build_dialog]").click();
				}
			}, {
				element: "#dlg_build_project .modal-content",
				title: "",
				content: core.module.localization.tutorial.build_project_dialog,
				placement: "left",
				onPrev: function(tour) {
					// hide dialog
					$("#dlg_build_project").modal("hide");
				},
				onShown: function(tour) {
					// setTimeout(function () {
					// 	core.module.tutorial.rearrange_tutorial_backdrop();
					// }, 150);
				}
			}, {
				element: "#dlg_build_project #build_project_list",
				title: "",
				content: core.module.localization.tutorial.build_project_list,
				placement: "left",
				onShow: function(tour) {
					// setTimeout(function () {
					// 	core.module.tutorial.rearrange_tutorial_backdrop();
					// }, 150);
				},
				onNext: function(tour) {
					// hide dialog
					$("#dlg_build_project").modal("hide");
				}
			}, {
				element: "#goorm_inner_layout_bottom #terminal",
				title: "",
				content: core.module.localization.tutorial.build_project_result,
				placement: "top",
				onPrev: function(tour) {
					// 'project' dropdown
					$("#goorm-mainmenu a[action=build_dialog]").click();
					// setTimeout(function () {
					// 	core.module.tutorial.rearrange_tutorial_backdrop();
					// }, 150);
				},
				onShow: function(tour) {
					$("#south_tab #gLayoutTab_Terminal").tab("show");
				},
			}, {
				element: "#main_toolbar button[action=run]",
				title: "",
				content: core.module.localization.tutorial.run_project,
				placement: "bottom",
			}
		);

		return tutorial_build_step;
	},
	// tutorial chapter "debug_project" step setting...
	get_debug_project_steps: function() {
		var tutorial_debug_step = [];

		if ($('#main_debug_toolbar').css('display') === 'none') {
			// when show bubble toolbar
			tutorial_debug_step.push({
				element: "#bubble_debug_toolbar button[action='debug']",
				title: core.module.localization.tutorial.title_debug_project,
				content: core.module.localization.tutorial.debug_project_start,
				placement: "bottom",
				onShow: function(tour) {
					$("#bubble_toolbar").css("display", "block");
				}
			});
			tutorial_debug_step.push({
				element: "#bubble_debug_toolbar button[action='debug_continue']",
				title: "asdfsadf",
				content: core.module.localization.tutorial.debug_project_continue,
				placement: "bottom",
			}, {
				element: "#bubble_debug_toolbar button[action='debug_terminate']",
				title: "asdfsa",
				content: core.module.localization.tutorial.debug_project_terminate,
				placement: "bottom",
			}, {
				element: "#bubble_debug_toolbar button[action='debug_step_over']",
				title: "sadfsadf",
				content: core.module.localization.tutorial.debug_project_step_over,
				placement: "bottom",
			}, {
				element: "#bubble_debug_toolbar button[action='debug_step_in']",
				title: "asdf",
				content: core.module.localization.tutorial.debug_project_step_in,
				placement: "bottom",
			}, {
				element: "#bubble_debug_toolbar button[action='debug_step_out']",
				title: "asdfsd",
				content: core.module.localization.tutorial.debug_project_step_out,
				placement: "bottom",
			});
		} else {
			// when show main toolbar...
			tutorial_debug_step.push({
				element: "#main_debug_toolbar button[action='debug']",
				title: core.module.localization.tutorial.title_debug_project,
				content: core.module.localization.tutorial.debug_project_start,
				placement: "bottom"
			});
			tutorial_debug_step.push({
				element: "#main_debug_toolbar button[action='debug_continue']",
				title: "sadasd",
				content: core.module.localization.tutorial.debug_project_continue,
				placement: "bottom"
			}, {
				element: "#main_debug_toolbar button[action='debug_terminate']",
				title: "asd",
				content: core.module.localization.tutorial.debug_project_terminate,
				placement: "bottom"
			}, {
				element: "#main_debug_toolbar button[action='debug_step_over']",
				title: "asdsad",
				content: core.module.localization.tutorial.debug_project_step_over,
				placement: "bottom"
			}, {
				element: "#main_debug_toolbar button[action='debug_step_in']",
				title: "asdasd",
				content: core.module.localization.tutorial.debug_project_step_in,
				placement: "bottom"
			}, {
				element: "#main_debug_toolbar button[action='debug_step_out']",
				title: "asdsad",
				content: core.module.localization.tutorial.debug_project_step_out,
				placement: "bottom"
			});

		}

		return tutorial_debug_step;
	},
	
	get_output_step: function() {
		var self = this;
		var output_step = this.tab_steps.output_step;
		// if current project has output tab
		// return output tab step.
		if (output_step) {
			for (var i = 0; i < output_step.length; i++) {
				if (core.status.current_project_type === output_step[i].plugin) {
					output_step[i].step.content = core.module.localization.tutorial.output_tab;
					return output_step[i].step;
				}
			}
		}
	},

	save_layout: function() {
		// already saved layout state whether it closed or not.
		var current_layout = core.module.layout.layout;
		this.restore_layout_state = current_layout.readState();
		this.restore_layout_state.north.size = current_layout.north.state.layoutHeight;
		this.restore_layout_state.west.west_tab = {
			tab: $("#goorm_left #west_tab").find("li.active a").attr('id'),
			detail_tab: $("#goorm_left").find(".tab-pane.active li.active a").attr('id')
		};
		this.restore_layout_state.center.children.layout1.east.east_tab = {
			tab: $("#goorm_inner_layout_right #east_tab").find(".active a").attr("id"),
			detail_tab: $("#goorm_inner_layout_right").find(".tab-pane.active li.active a").attr('id')
		};
		this.restore_layout_state.center.children.layout1.south.south_tab = $("#goorm_inner_layout_bottom").find("#south_tab .active a").attr("id");
	},

	// restore layout state before tutorial start
	// hidden layout, selected tab
	restore_layout: function() {
		$("#bubble_toolbar").css("display", "none");

		// activated tab reactive...
		$('#west_tab #' + this.restore_layout_state.west.west_tab.tab).tab('show');
		$('#' + this.restore_layout_state.west.west_tab.detail_tab).click();
		$('#east_tab #' + this.restore_layout_state.center.children.layout1.east.tab).tab('show');
		$('#' + this.restore_layout_state.center.children.layout1.east.east_tab.detail_tab).click();
		$('#south_tab #' + this.restore_layout_state.center.children.layout1.south.south_tab).tab('show');

		if (!this.restore_layout_state.north.initClosed) {
			if (this.restore_layout_state.north.size < 70) {
				core.module.layout.north_layout_toggle(2);
			}
		} else {
			core.module.layout.north_layout_toggle(1);
		}

		// closed layout open...
		if (this.restore_layout_state.west.initClosed) {
			core.module.layout.collapse('west');
		}
		if (this.restore_layout_state.center.children.layout1.east.initClosed) {
			core.module.layout.collapse('east');
		}
		if (this.restore_layout_state.center.children.layout1.south.initClosed) {
			core.module.layout.collapse('south');
		}
	},

	// when resize window layout or show dialog,
	// tutorial highlighting layout doesn't match the element layout.
	rearrange_tutorial_backdrop: function() {
		var self = this;
		var current_step = this.tutorial._current;
		var current_element = $(this.tutorial._options.steps[current_step].element);
		var backdrop = $('.tour-step-background');
		backdrop.width(current_element.width()).height(current_element.height());
		backdrop.offset({
			top: current_element.offset().top,
			left: current_element.offset().left
		});
	},

	clear_tutorial_element: function(tutorial_name) {
		// setTimeout(function () {
		var temp = $.debounce(function() {
			$(".tour-" + tutorial_name).remove();
			$(".tour-step-background").remove();
		}, 500);
		temp();
	}
};