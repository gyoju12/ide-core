/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project._new = {
	dialog: null,
	buttons: null,
	tabview: null,
	panel: null,
	callback: null,

	init: function() {
		var self = this;

		this.panel = $("#dlg_new_project");
		this.panel.draggable();
		this.dialog = new goorm.core.dialog.wizard();
		this.dialog.init({
			//localization_key: "title_new_project",
			id: "dlg_new_project",
			// handle_ok: handle_ok,	//jeongmin: there are three ok buttons for each tab, so can't assign one handler
			success: function() {
				var $next_btn = $("#g_np_btn_next"),
					$ok_btn = $(".g_np_btn_ok"),
					_import = core.module.project._import;

				$ok_btn.hide();
				////// show/hide buttons for each tab. Jeong-Min Im. //////
				$("a[href='#new_project_template']").click(function() {

					$next_btn.show();
					$ok_btn.hide();

					// $('.project_types.list-group').children(':first').click();
				});
				
				$("a[href='#new_project_import']").click(function() {
					$next_btn.hide();
					$ok_btn.hide();

					$("#g_np_btn_ok_import").show();

					if ($("#new_project_import.active.in").length > 0) {
						// clear user input
						$("#new_project_import .input_import_project_name").val("");
						$("#new_project_import .input_import_project_desc").val("");
						$("#new_project_import .project_import_file").val("");
					} else {
						////// after shown import tab, make project type list. Jeong-Min Im. //////
						$(this).one('shown.bs.tab', function() {
							_import.show(self.panel);
							// $(".input_import_project_name.form-control").click();
						});
					}

				});

				//three tabs' common works. Value validation check and communication with server. Jeong-Min Im.
				var handle_ok = function(data, callback) {
					/* TODO : make new function or module for validation */

					////// value validation check //////
					var input_name = $("#input_project_name").val();

					if (input_name === "") {
						alert.show(core.module.localization.msg.alert_project_name);
						return false;
					} else if (data.detailed_type !== 'django') {
						if (!/^[\w-_]*$/.test(input_name)) {
							alert.show(core.module.localization.title.project_info_name + core.module.localization.msg.alert_allow_character);
							return false;
						}
					} else if (data.detailed_type === 'django') {
						if (!/^[\w_]*$/.test(input_name)) {
							alert.show(core.module.localization.title.project_info_name + core.module.localization.msg.alert_allow_character2);
							return false;
						} else if (input_name === 'django' || input_name === 'test') {
							alert.show(core.module.localization.title.project_info_name + core.module.localization.msg.alert_allow_django);
							return false;
						}
					}


					////// make basic project information //////
					var project_desc = $("#input_project_desc").val();
					project_desc = project_desc.replace(/&(lt|gt);/g, function(strMatch, p1) {
						return (p1 == "lt") ? "<" : ">";
					});
					project_desc = project_desc.replace(/<\/?[^>]+(>|$)/g, "");

					var senddata = {
						project_type: data.type,
						project_detailed_type: data.detailed_type,
						// project_author: $("#input_project_author").val(),
						// project_author_name: $("#input_project_author_name").val(),
						project_name: $("#input_project_name").val(),
						project_desc: project_desc,
						plugins: data.plugins
					};


					////// communicate with server //////
					var cb = function(data) {
						if (data.err_code === 0) {
							senddata.project_dir = data.project_dir;

							core.dialog.open_project.open(data.project_dir, data.project_name, data.project_type);

							$(core).trigger('project_is_created');

							callback(senddata); // jeongmin: do template or scm callback

							core.module.layout.terminal.resize();
						} else {
							alert.show(data.message);
							$ok_btn.prop('disabled', false);

							return false;
						}

						$ok_btn.prop('disabled', false); // jeongmin: making directory is done
						self.panel.modal('hide');
					};

					core._socket.once("/project/valid", function(valid) {
						if (valid.result) {
							core._socket.once("/project/new", cb, true);
							core._socket.emit("/project/new", senddata);
						} else {
							switch (valid.err_code) {
								// Over Limit...
								//
								case 1:
									alert.show(core.module.localization.msg.alert_project_over_limit + valid.limit);
									break;

									// Project Exist...
									//
								case 2:
									alert.show(core.module.localization.msg.alert_project_exist);
									break;

									// Duplicated Name Exists...
									//
								case 3:
									confirmation.init({
										title: core.module.localization.msg.project_duplicate,
										message: core.module.localization.msg.confirmation_do_you_want_to_project_update,
										yes_text: core.module.localization.msg.yes,
										no_text: core.module.localization.msg.no,
										title: core.module.localization.msg.confirmation_title,
										yes: function() {
											core._socket.once("/project/new", cb, true);
											core._socket.emit("/project/new", senddata);
										},
										no: null
									});
									confirmation.show();
									break;
							}

							$ok_btn.prop('disabled', false); // jeongmin: making directory is done
						}
					});
					$ok_btn.prop('disabled', true); // jeongmin: prevent click during making directory
					core._socket.emit("/project/valid", senddata);

					return true; //normally ended		
				};

				////// ok button handlers for each tab. Jeong-Min Im. //////
				$("#g_np_btn_ok_template").click(function() {
					////// value validation check //////
					if ($("#input_project_type").attr("value") === "") {
						alert.show(core.module.localization.msg.alert_project_detailed_type);
						return false;
					} else if ($("#input_project_detailed_type").attr("value") === "") {
						alert.show(core.module.localization.msg.alert_project_detailed_type);
						return false;
					}

					////// make project information //////
					var plugin_name = $("#input_project_plugin").val();
					var plugin = {};

					core.preference.plugins[plugin_name] && (plugin[plugin_name] = core.preference.plugins[plugin_name]);

					var project_info = {
						type: $("#input_project_type").attr("value"),
						detailed_type: $("#input_project_detailed_type").attr("value"),
						plugins: plugin
					};

					// var selected_storage = $("#new_project_storage").val().toString();	// hidden: storage is deprecated

					// if (selected_storage == "goormIDE_Storage") {
					var callback = function(senddata) {
						core.module.plugin_manager.new_project(senddata);
					};

					////// communicate with server //////
					if (!handle_ok(project_info, callback))
						return false;
				});
				
				$("#g_np_btn_ok_import").click(function() {
					_import.handle_ok(self.panel);
				});

				////// jeongmin: import initializtion //////
				_import.success(self.panel);

				// $("#check_project_new_import").click(function () {	//jeongmin: import is changed to tab page
				// 	if ($(this).is(":checked")) {
				// 		$("#project_new_import_div").show();
				// 	} else {
				// 		$("#project_new_import_div").hide();
				// 	}
				// });

				// ////// jeongmin: decide next step contents //////
				// $("#new_project_storage").change(function () {
				// 	var selected_storage = $(this).val();

				// 	if(selected_storage == "goormIDE_Storage") {
				// 		$(".new_project_step_3").hide();	//empty contents
				// 		$("#new_project_scm").show();	//show content we want
				// 		$("#g_np_btn_next").show();
				// 	} else if(selected_storage == "Dropbox") {
				// 		$(".new_project_step_3").hide();	//empty contents
				// 		$("#g_np_btn_next").hide();	//we don't have any contents for this, so no need to show next button
				// 	} else {
				// 		$(".new_project_step_3").hide();	//empty contents
				// 		$("#g_np_btn_next").hide();	//we don't have any contents for this, so no need to show next button
				// 	}
				// });
			},
			// kind: "new_project",
			previous: function() {
				if ($("a[href='#new_project_template']").parent().hasClass("active")) {
					$("#g_np_btn_ok_template").hide();
				}
			},
			next: function() {
				
				//useonly(mode=goorm-oss)
				if ($("#project_new .project_items .selected_button").length != 1) {
					alert.show(core.module.localization.msg.alert_project_detailed_type);
					return false;
				} else {
					$(".next_wizard_step .project_type").hide(); //template doesn't need project_type input
					$("#g_np_btn_ok_template").show();
					// window.setTimeout(function() {
					var temp = $.debounce(function() {
						$('#input_project_name').focus();
					}, 200);
					temp();
					return true;
				}
				
			},

			show: function() { //jeongmin: the modal has been made visible to the user!
				if (typeof(self.callback) == "function") //jeongmin: check if callback is not null
					self.callback.call(); //jeongmin: let's go to the plug.js to calculate scrollTop
				//$("a[href='#new_project_template']").click(); // hidden by jeongmin: menu.action.js will do
				$("#dlg_new_project").focus();
			}
		});

		// Add click event on dialog select item
		$(document).on('click', '#dlg_new_project .project_wizard_first_button', function() {
			$(".project_wizard_second_button").removeClass("selected_button");

			$("#input_project_type").attr("value", "");
			$("#input_project_detailed_type").attr("value", "");
			$("#input_project_plugin").attr("value", "");

			$("#text_project_description").empty();

			$(".project_wizard_first_button").removeClass("active");
			$(this).addClass("active");
			$(this).focus();

			$(".all").hide();

			var project_template = $("." + $(this).attr("project_type"));
			var project_category = $(this).attr('category');

			if (project_category) {
				project_template = project_template.filter('[category="' + project_category + '"]');
			}

			project_template.show();
		});

		$(document).on('click', '#dlg_new_project .project_wizard_second_button', function() {
			$(".project_wizard_second_button").removeClass("selected_button");
			$(this).addClass("selected_button");
			$("#project_new").find(".project_items").focus();

			$("#input_project_type").attr("value", "");
			$("#input_project_detailed_type").attr("value", "");
			$("#input_project_plugin").attr("value", "");

			$("#input_project_type").attr("value", $(this).attr("project_type"));
			$("#input_project_detailed_type").attr("value", $(this).attr("detail_type"));
			$("#input_project_plugin").attr("value", $(this).attr("plugin_name"));

			$("#text_project_description").empty();

			var description = $(this).attr('description');
			$("#text_project_description").append(description);
		});



		$(document).on('dblclick', '#dlg_new_project .project_wizard_second_button', function() {
			var goorm_dialog_container = $("#" + self.dialog.id);
			var handle_next = function() {
				if (!self.dialog.next()) {
					return false;
				}

				if (self.dialog.step < self.dialog.total_step) {
					self.dialog.show_previous_button(true);

					goorm_dialog_container.find(".wizard_step[step='" + self.dialog.step + "']").hide();
					if (goorm_dialog_container.find(".wizard_step[step='" + self.dialog.step + "']")) {
						self.dialog.step++;
						goorm_dialog_container.find(".wizard_step[step='" + self.dialog.step + "']").show();
						if (self.dialog.step == self.dialog.total_step) {
							self.dialog.show_next_button(false);
						}
					}
				}
			};
			handle_next();
		});
	},

	show: function(option, callback) { //jeongmin: this callback is setting scrollTop
		var self = this;
		//for init
		this.callback = callback; //jeongmin: update callback variable

		//count the total step of wizard dialog
		this.dialog.total_step = $("#project_new").find(".wizard_step").size();

		$(".project_wizard_second_button").removeClass("selected_button");
		$("#input_project_type").attr("value", "");
		$("#input_project_detailed_type").val("");
		$("#input_project_plugin").val("");
		$("#input_project_author_name").attr('readonly', 'readonly');
		$("#input_project_author_name").addClass('readonly');
		$("#input_project_author_name").val(core.user.name.replace(/ /g, "_"));
		$("#input_project_name").val("");
		$("#input_project_desc").val("");
		// $("#project_new_import_upload_output").empty();	//jeongmin: gonna use project._import.js
		// $("#project_new_import_file").val("");
		// $("#check_project_new_import").attr('checked', false);
		$("#check_use_collaboration").attr('checked', false);
		$("#g_np_btn_ok_template").hide();
		// $("#project_new_import_div").hide();

		this.dialog.set_start(option);

		$("#dlg_new_project").modal('show');

		this.set_keydown_event();
	},

	set_keydown_event: function() {
		var project_types = $("#project_new").find("div[class='wizard_step'] .project_types");
		var project_items = $("#project_new").find("div[class='wizard_step'] .project_items");

		$("#dlg_new_project").on('shown.bs.modal', function(e) {
			$("#project_new").find("div[class='wizard_step'] .project_types").find(".active").click().trigger('focus');
		});


		$("#project_new").find(".nav").off("keydown");
		$("#project_new").find(".nav").keydown(function(e) {
			var current_selected_tab_anchor = $(":focus");
			var project_last_tab_anchor = $('#project_new div[class="wizard_step"] .dialog_tabview .nav-tabs li:last a[data-toggle=tab]');
			var current_selected_types = project_types.find(".active");

			if (current_selected_tab_anchor == null) return;

			switch (e.which) {
				case 9: // tab key
					// when press tab key, focusing move to project types										
					if (current_selected_tab_anchor.is(project_last_tab_anchor)) {
						current_selected_types.click();
						e.preventDefault();
					}
					break;
			}
		});

		// $(".next_wizard_step").off("keydown");
		// $(".next_wizard_step").bind("keydown", function(e) {
		// 	switch(e.which) {
		// 		case 9: // tab key
		// 			// when press tab key, focusing move to project items
		// 			console.log(e);
		// 			break;
		// 	}
		// 	e.preventDefault();
		// });

		//$("#project_new").find(".dialog_left_inner").bind("click mousedown", function(e){
		// $(project_types).bind("click", function(e){
		// 	console.log("---", e);
		// 	$(e).focus();
		// });

		// project type list key down event
		$("#project_new").find(".dialog_left_inner").off("keydown");
		$("#project_new").find(".dialog_left_inner").bind("keydown", function(e) {
			var current_selected_types = project_types.find(".active");
			var current_selected_item = project_items.find(".selected_button");
			switch (e.which) {

				case 9: // tab key
					// when press tab key, focusing move to project items
					var project_type_name_class = "." + current_selected_types.attr("project_type");
					if (current_selected_item.is(project_type_name_class)) {
						current_selected_item.click();
					} else {
						// if (current_selected_types.next().length) {
						// 	current_selected_types.next().click().focus();
						// } else{
						// 	$(".project_types").children().first().click().focus();
						// }
						// } else {
						project_items.find(project_type_name_class)[0].click();
						$("#project_new").find(".project_items").focus();
						// }				

					}
					break;
				case 38: // up key
					if (current_selected_types.length) {
						if (current_selected_types.prev().length) {
							current_selected_types.prev().click().focus();
							//current_selected_types.prev().focus();
						}
					}
					break;
				case 40: // down key
					if (current_selected_types.length) {
						if (current_selected_types.next().length) {
							current_selected_types.next().click().focus();
							//current_selected_types.next().focus();
						}
					}
					break;
			}
			e.preventDefault();
		});

		// project type items key down event
		$("#project_new").find(".dialog_center").off("keydown");
		$("#project_new").find(".dialog_center").keydown(function(e) {
			var current_selected_types = project_types.find(".active")[0];
			var project_type = $(current_selected_types).attr("project_type"); // project_type (string)
			var current_selected_item = project_items.find(".selected_button");
			var next_selected = null;
			switch (e.which) {
				case 37: // left key
					if (current_selected_item.length) {
						next_selected = current_selected_item.prev();
						if (next_selected.length && next_selected.attr("class").search(project_type) != -1) next_selected.click();

					}
					break;
				case 38: // up key
					if (current_selected_item.length) {
						next_selected = current_selected_item.prev().prev().prev().prev();
						if (next_selected.length && next_selected.attr("class").search(project_type) != -1) next_selected.click();
					}
					break;
				case 39: // right key
					if (current_selected_item.length) {
						next_selected = current_selected_item.next();
						if (next_selected.length && next_selected.attr("class").search(project_type) != -1) next_selected.click();
					}
					break;
				case 40: // down key
					if (current_selected_item.length) {
						next_selected = current_selected_item.next().next().next().next();
						if (next_selected.length && next_selected.attr("class").search(project_type) != -1) next_selected.click();
					}
					break;
				case 13: // enter key
					if (current_selected_item.length) {
						$('#g_np_btn_next').trigger('click');
					}
			}
			if (next_selected == null) return;

			// scroll setting
			if (next_selected.length) {
				// 253.09090912342072 value is heigth (layout showing type items)
				if (next_selected.position().top > 253.09090912342072) {
					// item above the layout
					project_items.scrollTop(project_items.scrollTop() + 136.5); // item size 127 + margin 10
				} else if (next_selected.position().top < 0) {
					// item below the layout
					project_items.scrollTop(project_items.scrollTop() - 136.5);
				}
			}
			e.preventDefault();
		});

		$("#input_project_name").off("keydown");
		$("#input_project_name").on("keydown", function(e) {
			if (e.which === 13) {
				if ($("#g_np_btn_ok_template").css("display") != "none" && !$("#g_np_btn_ok_template").prop('disabled'))
					$("#g_np_btn_ok_template").click();
				
			} else if (e.which === 27) {
				$("#g_np_btn_cancel").click();
			}
		});

		$("#g_np_btn_cancel").off("keydown");
		$("#g_np_btn_cancel").on("keydown", function(e) {
			if (e.which === 9) {
				var flag = true,
					temp_value;
				$.each($("#dlg_new_project").find(".btn-primary.g_np_btn_ok"), function(index, value) {
					if ($(value).css("display") !== "none") {
						flag = false;
						temp_value = value;
					}
				});

				if (flag) {
					$('#project_new div[class="wizard_step"] .nav-tabs li:first a').focus();
				} else {
					$(temp_value).focus();
				}
			}
			e.preventDefault();
		});
		$("#dlg_new_project").find(".btn-primary.g_np_btn_ok").off("keydown");
		$("#dlg_new_project").find(".btn-primary.g_np_btn_ok").on("keydown", function(e) {
			if (e.which === 9) {
				if (e.target.id === 'g_np_btn_ok_import') {
					$('#project_new div[class="wizard_step"] .nav-tabs li:first a').focus();
				} else {
					$(".next_wizard_step").find("#input_project_name").focus();
				}
			} else if (e.which === 13) {
				$("#" + e.target.id).click();
			}
			e.preventDefault();
		});

		$("#project_new [name=input_import_project_name]").off("keydown");
		$("#project_new [name=input_import_project_name]").on("keydown", function(e) {
			if (e.which === 13 && !$("#g_np_btn_ok_import").prop('disabled'))
				$("#g_np_btn_ok_import").click();
		});
	}

};