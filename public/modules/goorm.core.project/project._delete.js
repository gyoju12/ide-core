/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project._delete = {
	dialog: null,
	buttons: null,
	chat: null,
	project_list: null,
	processing: false,

	init: function() {

		var self = this;

		this.panel = $("#dlg_delete_project");
		
		this.__handle_delete = function(panel) {
			self.processing = true;
			$(core).trigger('on_project_before_delete');

			var data = self.project_list.get_data();
			var delete_project_path=data.path;

			var postdata = {
				project_path: data.path
			};

			var storage = $("#project_delete_storage").find("span").html().toString();

			if (storage == "goormIDE Storage") {
				core.socket.once("/project/delete", function(data) {
					$("#project_delete_list").empty();
					$("#project_delete_information").empty();
					
					var received_data = data;
					if (received_data.err_code === 0) {
						
						// var window_manager = core.module.layout.workspace.window_manager;
						// $(window_manager.window).each(function (i) {
						// 	if (postdata.project_path == this.project && this.storage == "goormIDE_Storage") {
						// 		window_manager.close_by_index(i, i);
						// 	}
						// });
			
						var wm = core.module.layout.workspace.window_manager;

						for (var i = wm.window.length - 1; i >= 0; i--) {
							var w = wm.window[i];

							if (postdata.project_path == w.project && w.storage == "goormIDE_Storage") {
								w.is_saved = true; // jeongmin: don't ask "save changes confirmation". Because we delete this project!

								wm.close_by_index(i, i);
							}
						}

						$("#goorm_main_toolbar .debug_continue, #goorm_main_toolbar .debug_terminate, #goorm_main_toolbar .debug_step_over, #goorm_main_toolbar .debug_step_in, #goorm_main_toolbar .debug_step_out").addClass('debug_not_active');
						$("#goorm_main_toolbar .debug").removeClass("debug_not_active");
						$("#Debug .menu-debug-continue, #Debug .menu-debug-terminate, #Debug .menu-debug-step-over, #Debug .menu-debug-step-in, #Debug .menu-debug-step-out").addClass('debug_not_active');
						$("#Debug .menu-debug-start").removeClass('debug_not_active');

						notice.show(core.module.localization.msg.notice_project_delete_done);

						// project list focusing is needed for enable key event. Jeong-Min Im.
						// notice.panel.one('hidden.bs.modal', function() {
						// 	$('#project_delete_list').focus();
						// });

						if (postdata.project_path == core.status.current_project_path) {

							

							core.status.current_project_path = "";
							core.status.current_project_name = "";
							core.status.current_project_type = "";
							core.dialog.open_project.open("", "", "");

						}
					} else {
						alert.show(core.module.localization.msg.alert_cannot_project_delete);

						// project list focusing is needed for enable key event. Jeong-Min Im.
						// alert.panel.one('hidden.bs.modal', function() {
						// 	$('#project_delete_list').focus();
						// });
					}

					if (core.status.current_project_path === "" || core.status.current_project_path == data.path) {
						core.module.layout.project_explorer.refresh();
						core.dialog.project_property.refresh_toolbox();
					} else {
						core.module.layout.project_explorer.refresh_project_selectbox();
					}

					core.module.layout.terminal.resize();


					self.project_list = new goorm.core.project.list();
					self.project_list.init("#project_delete", function() {
						self.project_list.init_project(); //let's set first project
						$("#project_delete_list").focus();
						var data = self.project_list.get_data();
						if (data.path == "") $("#project_delete_location").hide();
						else $("#project_delete_location").show();
						self.processing = false;
					});

				}, true, true); // jeongmin: last parameter means hiding lock. True -> Can't hide loading bar.
				core.socket.emit("/project/delete", postdata);
			}
			// else if (storage == "Google Drive") {

			// } else if (storage == "Dropbox") {

			// 	core.socket.once("dropbox_delete_file", function() {
			// 		// var window_manager = core.module.layout.workspace.window_manager;
			// 		// $(window_manager.window).each(function (i) {
			// 		// 	if (data.path == this.project && this.storage == "Dropbox") {
			// 		// 		window_manager.close_by_index(i, i);
			// 		// 	}
			// 		// });
			// 		$("#project_delete_list").empty();
			// 		$("#project_delete_information").empty();
			// 		var wm = core.module.layout.workspace.window_manager;

			// 		for (var i = wm.window.length - 1; i >= 0; i--) {
			// 			var w = wm.window[i];

			// 			if (postdata.project_path == w.project && w.storage == "Dropbox") {
			// 				w.is_saved = true; // jeongmin: don't ask "save changes confirmation". Because we delete this project!

			// 				wm.close_by_index(i, i);
			// 			}
			// 		}

			// 		if (core.status.current_project_path == data.path && core.status.current_project_storage == "Dropbox") {

			// 			core.module.layout.chat.user.leave();

			// 			core.status.current_project_path = "";
			// 			core.status.current_project_name = "";
			// 			core.status.current_project_type = "";
			// 			goorm.core.cloud.dropbox.project.open("", "", "");
			// 		}

			// 		if (core.status.current_project_path === "" || core.status.current_project_path == data.path) {
			// 			goorm.core.cloud.dropbox.project_explorer.refresh();
			// 			//			core.module.layout.project_explorer.refresh();
			// 			//			core.dialog.project_property.refresh_toolbox();
			// 		} else {
			// 			//			core.module.layout.project_explorer.refresh_project_selectbox();
			// 		}
			// 		notice.show(core.module.localization.msg.notice_project_delete_done);

			// 		// project list focusing is needed for enable key event. Jeong-Min Im.
			// 		// notice.panel.one('hidden.bs.modal', function() {
			// 		// 	$('#project_delete_list').focus();
			// 		// });

			// 		self.project_list = new goorm.core.cloud.dropbox.project.list();
			// 		self.project_list.init("#project_delete", function() {
			// 			self.project_list.init_project(); //let's set first project
			// 			$("#project_delete_list").focus();
			// 			var data = self.project_list.get_data();
			// 			if (data.path == "") $("#project_delete_location").hide();
			// 			else $("#project_delete_location").show();
			// 		});
			// 	}, true);
			// 	core.socket.emit("/cloud/dropbox_delete", data.path);
			// }
		};

		this.project_list = new goorm.core.project.list();
		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_delete_project",
			id: "dlg_delete_project",
			handle_ok: function() {
				if(!self.processing) {
					var data = self.project_list.get_data();

					if (data.path == "") {
						alert.show(core.module.localization.msg.alert_project_not_selected);
					} else {
						confirmation.init({
							title: core.module.localization.msg.confirmation_delete_title,
							message: core.module.localization.msg.confirmation_delete_project,
							yes_text: core.module.localization.msg.confirmation_yes,
							no_text: core.module.localization.msg.confirmation_no,
							yes: function() {
								self.processing = true;
								self.__handle_delete();
							},
							no: function() {
								$("#project_delete_list").focus();
							}
						});
						
						confirmation.show();
					}
				}

			},

			success: function() {
				$("#project_delete_storage").find("span").html("goormIDE_Storage");
				$(document).on("click", "li.delete.storage", function() {
					var storage = $(this).find("a").html();
					$("#project_delete_storage").find("span").html(storage);
					$("#project_delete_list").empty();
					$("#project_delete_information").empty();
					if (storage == "goormIDE Storage") {
						self.project_list = new goorm.core.project.list();
					}
					// else if (storage == "Google Drive") {

					// } else if (storage == "Dropbox") {
					// 	self.project_list = new goorm.core.cloud.dropbox.project.list();
					// }
					//self.project_list.init("#project_delete");
				});
			},

			//the modal has been made visible to the user! Jeong-min Im.
			show: function() {
				self.project_list.init_project(); //let's set first project
				$("#project_delete_list").focus();
				var data = self.project_list.get_data();
				if (data.path == "") $("#project_delete_location").hide();
				else $("#project_delete_location").show();
			}
		});
	},

	show: function(list_callback) {
		var self = this;
		this.project_list.init("#project_delete", list_callback);

		this.project_list.set_keydown_event({
			'handler': function() {
				if(!self.processing) {
					var data = self.project_list.get_data();
					if (data.path == "") {
						alert.show(core.module.localization.msg.alert_project_not_selected);
					} else {
						confirmation.init({
							title: core.module.localization.msg.confirmation_delete_title,
							message: core.module.localization.msg.confirmation_delete_project,
							yes_text: core.module.localization.msg.confirmation_yes,
							no_text: core.module.localization.msg.confirmation_no,
							yes: function() {
								self.processing = true;
								self.__handle_delete();
							},
							no: function() {
								$("#project_delete_list").focus();
							}
						});

						confirmation.show();
					}
				}
			}
		});

		this.panel.modal('show');
	},


	all_delete: function() {
		// jeongmin: make all windows saved
		var wm = core.module.layout.workspace.window_manager;
		for (var i = wm.window.length - 1; i >= 0; i--)
			wm.window[i].is_saved = true; // jeongmin: don't ask "save changes confirmation". Because we delete this project!

		//every window close
		wm.close_all();

		//etc
		$("#goorm_main_toolbar .debug_continue, #goorm_main_toolbar .debug_terminate, #goorm_main_toolbar .debug_step_over, #goorm_main_toolbar .debug_step_in, #goorm_main_toolbar .debug_step_out").addClass('debug_not_active');
		$("#goorm_main_toolbar .debug").removeClass("debug_not_active");
		$("#Debug .menu-debug-continue, #Debug .menu-debug-terminate, #Debug .menu-debug-step-over, #Debug .menu-debug-step-in, #Debug .menu-debug-step-out").addClass('debug_not_active');
		$("#Debug .menu-debug-start").removeClass('debug_not_active');

		//go to project list state
		if (core.status.current_project_path !== "") {
			

			core.status.current_project_path = "";
			core.status.current_project_name = "";
			core.status.current_project_type = "";
			core.dialog.open_project.open("", "", "");
		}


		//real delete start

		for (o in core.workspace) {
			if (!o) continue;

			core.socket.once("/project/delete", function(data) {
				core.module.layout.project_explorer.refresh();
			}, true);
			core.socket.emit("/project/delete", {
				project_path: o + ''
			});
		}
	}
};