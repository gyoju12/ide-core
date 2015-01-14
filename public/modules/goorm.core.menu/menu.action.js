/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.menu.action = {
	prevent: function(menu) { // if menu is disabled --> prevent click
		var pv = false;

		if ($(menu).parent().hasClass('disabled') || $(menu).hasClass('disabled')) {
			pv = true;
		}

		return pv;
	},

	init: function() {
		var self = this;
		$("[action=chat_button]").hover(function() {
			$("[action=chat_button]").tooltip();
		});

		$("[action=new_project]").off("click").tooltip();
		$("[action=new_project]").click(function() {
			$("a[href='#new_project_template']").click();

			core.dialog.new_project.show();
			//$(".project_wizard_first_button[project-type=all]").trigger("click").tooltip();

		});
		
		$("[action=new_project_import]").off("click").tooltip();
		$("[action=new_project_import]").click(function() {
			$("a[href='#new_project_import']").click();

			core.dialog.new_project.show({
				next_button: false
			});
			//$(".project_wizard_first_button[project-type=all]").trigger("click").tooltip();

		});

		$("[action=new_file_goorm_project]").off("click").tooltip();
		$("[action=new_file_goorm_project]").click(function() {
			core.dialog.new_project.show();
			$(".project_wizard_first_button[project-type=goormp]").trigger("click").tooltip();
		});

		$("[action=new_file_file]").off("click").tooltip();
		$("[action=new_file_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.new_file.show("");
		});

		$("[action=new_file_folder]").off("click").tooltip();
		$("[action=new_file_folder]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.new_folder.show("");
		});

		$("[action=new_file_textfile]").off("click").tooltip();
		$("[action=new_file_textfile]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.new_untitled_textfile.show("");
		});

		$("[action=new_file_other]").off("click").tooltip();
		$("[action=new_file_other]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.new_other_file.show("");
		});

		$("[action=open_project]").off("click").tooltip();
		$("[action=open_project]").click(function() {
			core.dialog.open_project.show();
		});

		$("[action=open_file]").off("click").tooltip();
		$("[action=open_file]").click(function() {
			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.open_file.show();
		});
		

		

		

		$("[action=exit]").off("click").tooltip();
		$("[action=exit]").click(function() {
			
			//useonly(mode=goorm-oss)
			window.open('', '_self');
			window.close();
			
		});
		
		$("[action=close_file]").off("click").tooltip();
		$("[action=close_file]").click(function() {
			var window_manager = core.module.layout.workspace.window_manager;

			// when clicking file close, editor panel (state is active) remove
			if (window_manager.window[window_manager.active_window]) {
				var active_window_title = window_manager.window[window_manager.active_window].title;
				window_manager.close_by_title(active_window_title);
				console.log(active_window_title + " close...");
			}
		});

		$("[action=close_all]").off("click").tooltip();
		$("[action=close_all]").click(function() {
			core.module.layout.workspace.window_manager.close_all();
		});

		$("[action=save_file]").off("click").tooltip();
		$("[action=save_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			var window_manager = core.module.layout.workspace.window_manager;

			if (window_manager.active_window < 0) {
				alert.show(core.module.localization.msg.alert_file_not_opened);
			} else if (window_manager.window[window_manager.active_window]) {
				if (window_manager.window[window_manager.active_window].editor) {
					window_manager.window[window_manager.active_window].editor.save();
				}
				
			}
		});

		$("[action=save_all_file]").off("click").tooltip();
		$("[action=save_all_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			core.module.layout.workspace.window_manager.save_all();
		});

		$("[action=save_as_file]").off("click").tooltip();
		$("[action=save_as_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			core.dialog.save_as_file.show();
		});

		$("[action=move_file]").off("click").tooltip();
		$("[action=move_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			core.dialog.move_file.show("");
		});

		$("[action=rename_file]").off("click").tooltip();
		$("[action=rename_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			// jeongmin: get real selected file
			var selected_path = core.module.layout.project_explorer.get_tree_selected_path();

			if (selected_path.files.length == 0 && selected_path.directorys.length == 0) {
				if (core.module.layout.workspace.window_manager.active_window > -1) {
					core.dialog.rename_file.show();
				} else {
					alert.show(core.module.localization.msg.alert_select_file);
				}
			} else {
				core.dialog.rename_file.show('context');
			}
		});



		$("[action=delete_file]").off("click").tooltip();
		$("[action=delete_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			if (core.status.current_project_storage == "goormIDE_Storage") {
				// jeongmin: get real selected file
				var selected_path = core.module.layout.project_explorer.get_tree_selected_path();

				if (selected_path.files.length == 0 && selected_path.directorys.length == 0) {
					alert.show(core.module.localization.msg.alert_select_file);
				} else {
					if (core.status.current_project_path === "") { //case select project
						var tmp = core.status.selected_file.substring(1); //and select project root
						if (tmp.indexOf('/') == -1) {
							core.dialog.delete_project.show(function() {
								$("#project_delete_list #selector_" + tmp.replace(core.user.id + "_", "")).click();
							});
							return;
						}
					}

					if (core.status.current_project_path === core.status.selected_file) { //each root
						core.dialog.delete_project.show(function() {
							$("#project_delete_list #selector_" + core.status.current_project_name).click();
						});
						return;
					}

					var localization = core.module.localization.msg;

					var window_manager = core.module.layout.workspace.window_manager;
					var window_list = window_manager.window;
					var opened_window = false; // jeongmin: selected file is opened or not

					// jeongmin: check if selected file is opened or in collaboration
					for (var i = window_list.length - 1; 0 <= i; i--) {
						if ((window_list[i].title).indexOf(core.status.selected_file) > -1) { // jeongmin: selected file is opened
							opened_window = i;

							
						}
					}

					function close_window() {
						if (opened_window) {
							window_list[opened_window].is_saved = true;
							window_list[opened_window].tab.is_saved = true;
							// window_list[i].close();

							window_manager.close_by_index(opened_window, opened_window);

							// jeongmin: these are should be done after deleting selected file
							core.status.selected_file = "";
							core.status.selected_file_type = "";
						}
					}

					confirmation.init({
						title: core.module.localization.msg.confirmation_delete_title,
						message: core.module.localization.msg.confirmation_delete_file,
						yes_text: core.module.localization.msg.confirmation_yes,
						no_text: core.module.localization.msg.confirmation_no,
						yes: function() {
							var postdata = {
								filename: core.status.selected_file
							};
							// console.log(postdata);

							// if (core.module.terminal.terminal) {
							// 	core.module.terminal.fs_rm(core.status.selected_file, function on_delete_file() {

							// 		core.module.layout.project_explorer.refresh();

							// 		close_window();
							// 	});
							// } else {
							core._socket.once("/file/delete", function(data) {
								// m.s("delete: " + core.status.selected_file);
								if (data.err_code == 20) {
									alert.show(data.message);
								}

								core.module.layout.project_explorer.refresh();

								close_window();
							}, true);
							core._socket.emit("/file/delete", postdata);
							// }
						},
						no: null
					});

					confirmation.show();
				}
			}
			// else if ("Dropbox") {
			// if (core.status.selected_file) {
			// 	if ("/" + core.status.current_project_path == core.status.selected_file) {
			// 		alert.show("Cannot Delete!");
			// 		return;
			// 	}
			// 	confirmation.init({
			// 		title: core.module.localization.msg.confirmation_delete_title,
			// 		message: core.module.localization.msg.confirmation_delete_file,
			// 		yes_text: core.module.localization.msg.confirmation_yes,
			// 		no_text: core.module.localization.msg.confirmation_no,
			// 		yes: function() {
			// 			var postdata = {
			// 				filename: core.status.selected_file
			// 			};
			// 			//$.get("file/delete", postdata, function (data) {
			// 			core.socket.once("dropbox_remove_file", function(data) {
			// 				//m.s("delete: " + core.status.selected_file);
			// 				goorm.core.cloud.dropbox.project_explorer.refresh();

			// 				var window_manager = core.module.layout.workspace.window_manager;
			// 				var window_list = window_manager.window;

			// 				for (var i = window_list.length - 1; i >= 0; i--) {
			// 					if ((window_list[i].title).indexOf(core.status.selected_file) > -1) {
			// 						window_list[i].is_saved = true;
			// 						window_list[i].tab.is_saved = true;
			// 						// window_list[i].close(i);
			// 						window_manager.close_by_index(i, i);
			// 					}
			// 				}
			// 			});
			// 			core.socket.emit("/cloud/dropbox_remove", postdata.filename);
			// 		},
			// 		no: null
			// 	});

			// 	confirmation.show();
			// } else {
			// 	alert.show(core.module.localization.msg.alert_select_file);
			// }
			// }
		});

		$("[action=refresh_project_directory]").off("click").tooltip();
		$("[action=refresh_project_directory]").click(function() {
			core.module.layout.project_explorer.refresh();
		});
		
		$("[action=import_file]").off("click").tooltip();
		$("[action=import_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.import_file.show();
		});
		

		$("[action=export_file]").off("click").tooltip();
		$("[action=export_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.export_file.show();
		});
		
		$("[action=do_undo]").off("click").tooltip();
		$("[action=do_undo]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			var window_manager = core.module.layout.workspace.window_manager;
			var active_window_obj = window_manager.window[window_manager.active_window];

			if (active_window_obj) {
				if (active_window_obj.editor || active_window_obj.merge) {
					var editor = active_window_obj.editor ? active_window_obj.editor : active_window_obj.merge.edit;

					editor.undo();
					//window_manager.window[window_manager.active_window].set_modified();
					$(core).trigger('undo_redo_pressed', { // make event --heeje
						undo: true,
						redo: false
					});
				}
			}
		});

		$("[action=do_redo]").off("click").tooltip();
		$("[action=do_redo]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			var window_manager = core.module.layout.workspace.window_manager;
			var active_window_obj = window_manager.window[window_manager.active_window];

			if (active_window_obj) {
				if (active_window_obj.editor || active_window_obj.merge) {
					var editor = active_window_obj.editor ? active_window_obj.editor : active_window_obj.merge.edit;

					editor.redo();
					$(core).trigger('undo_redo_pressed', { // make event --heeje
						undo: false,
						redo: true
					});
					//window_manager.window[window_manager.active_window].set_modified();
				}
			}
		});

		// $("[action=do_cut]").off("click").tooltip();
		// $("[action=do_cut]").click(function() {
		// 	if (self.prevent(this)) {
		// 		return false;
		// 	}

		// 	var window_manager = core.module.layout.workspace.window_manager;

		// 	if (window_manager.window[window_manager.active_window]) {
		// 		if (window_manager.window[window_manager.active_window].editor) {
		// 			window_manager.window[window_manager.active_window].editor.cut();
		// 		}
		// 	}
		// });

		// $("[action=do_copy]").off("click").tooltip();
		// $("[action=do_copy]").click(function() {
		// 	if (self.prevent(this)) {
		// 		return false;
		// 	}

		// 	var window_manager = core.module.layout.workspace.window_manager;

		// 	if (window_manager.window[window_manager.active_window]) {
		// 		if (window_manager.window[window_manager.active_window].editor) {
		// 			window_manager.window[window_manager.active_window].editor.copy();
		// 		}
		// 	}
		// });

		// $("[action=do_paste]").off("click").tooltip();
		// $("[action=do_paste]").click(function() {
		// 	if (self.prevent(this)) {
		// 		return false;
		// 	}

		// 	var window_manager = core.module.layout.workspace.window_manager;

		// 	if (window_manager.window[window_manager.active_window]) {
		// 		if (window_manager.window[window_manager.active_window].editor) {
		// 			if (core.env.os == "darwin") {
		// 				alert.show(core.module.localization.msg.alert_cannot_paste_in_darwin);
		// 			} else {
		// 				alert.show(core.module.localization.msg.alert_cannot_paste_in_not_darwin);
		// 			}
		// 			return;
		// 		}
		// 	}
		// });

		$("[action=do_delete]").off("click").tooltip();
		$("[action=do_delete]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			var window_manager = core.module.layout.workspace.window_manager;

			if (window_manager.window[window_manager.active_window]) {
				if (window_manager.window[window_manager.active_window].editor) {
					window_manager.window[window_manager.active_window].editor.do_delete();
				}
			}
		});

		$("[action=preference]").off("click").tooltip();
		$("[action=preference]").click(function() {
			core.dialog.preference.show();
		});

		$("[action=do_find]").off("click").tooltip();
		$("[action=do_find]").click(function() {
			core.dialog.find_and_replace.show();
		});
		
		$("[action=toggle_use_line_wrapping]").off("click").tooltip();
		$("[action=toggle_use_line_wrapping]").click(function() {
			var v = !core.preference['preference.editor.line_wrapping'];

			$('#use_line_wrapping').css('visibility', v ? 'visible' : 'hidden');

			core.preference['preference.editor.line_wrapping'] = v.toString(); // true or false --> "true" / "false"
			core.dialog.preference.fill_dialog(core.preference);
			core.dialog.preference.apply('line_wrapping');

			// core.module.layout.workspace.window_manager.refresh_all();
		});
		
		$("[action=do_go_to_line]").off("click").tooltip();
		$("[action=do_go_to_line]").click(function() {
			core.module.layout.edit_toolbar.option("go_to_line"); //jeongmin: show go to line edit toolbar
		});

		$("[action=toggle_bookmark]").off("click").tooltip(); //jeongmin: add toggle bookmark menu action
		$("[action=toggle_bookmark]").click(function() {
			var editor = core.module.bookmark_list.get_active_editor();
			if (editor != null) {
				editor.bookmark.toggle();
			}
		});

		$("[action=next_bookmark]").off("click").tooltip(); //jeongmin: add next bookmark menu action
		$("[action=next_bookmark]").click(function() {
			var editor = core.module.bookmark_list.get_active_editor();
			if (editor != null) {
				editor.bookmark.next();
			}
		});

		$("[action=prev_bookmark]").off("click").tooltip(); //jeongmin: add prev bookmark menu action
		$("[action=prev_bookmark]").click(function() {
			var editor = core.module.bookmark_list.get_active_editor();
			if (editor != null) {
				editor.bookmark.prev();
			}
		});

		$("[action=clear_bookmark]").off("click").tooltip(); //jeongmin: add clear bookmark menu action
		$("[action=clear_bookmark]").click(function() {
			var editor = core.module.bookmark_list.get_active_editor();
			if (editor != null) {
				editor.bookmark.clear();
			}
		});

		$("[action=do_find_next]").off("click").tooltip();
		$("[action=do_find_next]").click(function() {
			var window_manager = core.module.layout.workspace.window_manager;

			if (window_manager.window[window_manager.active_window]) {
				if (window_manager.window[window_manager.active_window].editor) {
					core.dialog.find_and_replace.find();
				}
			}
		});

		$("[action=do_find_previous]").off("click").tooltip();
		$("[action=do_find_previous]").click(function() {
			var window_manager = core.module.layout.workspace.window_manager;

			if (window_manager.window[window_manager.active_window]) {
				if (window_manager.window[window_manager.active_window].editor) {
					core.dialog.find_and_replace.find_prev();
				}
			}
		});
		
		$("[action=select_all]").off("click").tooltip();
		$("[action=select_all]").click(function() {
			var window_manager = core.module.layout.workspace.window_manager;

			if (window_manager.window[window_manager.active_window]) {
				if (window_manager.window[window_manager.active_window].editor) {
					window_manager.window[window_manager.active_window].editor.select_all();
				}
			}
		});

		$("[action=search]").off("click").tooltip();
		$("[action=search]").click(function() {
			core.dialog.search.show();
		});

		

		// Sublime keymap
		$("[action=delete_line_left]").off("click").tooltip();
		$("[action=delete_line_left]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.delLineLeft(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=delete_line_right]").off("click").tooltip();
		$("[action=delete_line_right]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.delLineRight(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=insert_line_before]").off("click").tooltip();
		$("[action=insert_line_before]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.insertLineBefore(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=insert_line_after]").off("click").tooltip();
		$("[action=insert_line_after]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.insertLineAfter(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_downcase_cursor]").off("click").tooltip();
		$("[action=do_downcase_cursor]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.downcaseAtCursor(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_upcase_cursor]").off("click").tooltip();
		$("[action=do_upcase_cursor]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.upcaseAtCursor(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_transpose]").off("click").tooltip();
		$("[action=do_transpose]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.transposeChars(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_join_lines]").off("click").tooltip();
		$("[action=do_join_lines]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.joinLines(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_duplicate_line]").off("click").tooltip();
		$("[action=do_duplicate_line]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.duplicateLine(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_delete_line]").off("click").tooltip();
		$("[action=do_delete_line]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.deleteLine(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=swap_line_down]").off("click").tooltip();
		$("[action=swap_line_down]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.swapLineDown(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=swap_line_up]").off("click").tooltip();
		$("[action=swap_line_up]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.swapLineUp(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=select_word]").off("click").tooltip();
		$("[action=select_word]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.selectNextOccurrence(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=select_line]").off("click").tooltip();
		$("[action=select_line]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.selectLine(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=select_scope]").off("click").tooltip();
		$("[action=select_scope]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.selectScope(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=select_between_brackets]").off("click").tooltip();
		$("[action=select_between_brackets]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.selectBetweenBrackets(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=add_previous_line]").off("click").tooltip();
		$("[action=add_previous_line]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.selectLinesUpward(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=add_next_line]").off("click").tooltip();
		$("[action=add_next_line]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.selectLinesDownward(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_single_selection]").off("click").tooltip();
		$("[action=do_single_selection]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.singleSelectionTop(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_split_into_lines]").off("click").tooltip();
		$("[action=do_split_into_lines]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.splitSelectionByLine(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_fold]").off("click").tooltip();
		$("[action=do_fold]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.fold(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_unfold]").off("click").tooltip();
		$("[action=do_unfold]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.unfold(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=do_unfold_all]").off("click").tooltip();
		$("[action=do_unfold_all]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.unfoldAll(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=go_to_bracket]").off("click").tooltip();
		$("[action=go_to_bracket]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.goToBracket(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=go_subword_left]").off("click").tooltip();
		$("[action=go_subword_left]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.goSubwordLeft(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=go_subword_right]").off("click").tooltip();
		$("[action=go_subword_right]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.goSubwordRight(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=scroll_line_up]").off("click").tooltip();
		$("[action=scroll_line_up]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.scrollLineUp(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=scroll_line_down]").off("click").tooltip();
		$("[action=scroll_line_down]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.scrollLineDown(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=show_in_center]").off("click").tooltip();
		$("[action=show_in_center]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.showInCenter(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=sort_lines]").off("click").tooltip();
		$("[action=sort_lines]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.sortLines(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		$("[action=sort_lines_case]").off("click").tooltip();
		$("[action=sort_lines_case]").click(function() {
			if (self.prevent(this)) {
				return false;
			}
			var window_manager = core.module.layout.workspace.window_manager;
			var active_window = window_manager.active_window;
			if (active_window > -1) {
				CodeMirror.commands.sortLinesInsensitive(window_manager.window[active_window].editor.editor);
				window_manager.window[active_window].editor.focus();
			}
		});

		//Main Menu : window
		

		// $("a[action=open_recent_file]").off("click").tooltip();
		// $("a[action=open_recent_file]").click(function () {
		// 	var recent_window = core.module.layout.workspace.window_manager.recent_window;

		// 	if(recent_window && recent_window.length > 0) {
		// 		var recent_file = recent_window[recent_window.length-1];

		// 		core.module.layout.workspace.window_manager.open(recent_file.filepath, recent_file.filename, recent_file.filetype);
		// 	}
		// });

		$("[action=previous_window]").off("click").tooltip();
		$("[action=previous_window]").click(function() {
			core.module.layout.workspace.window_manager.previous_window();
		});

		$("[action=next_window]").off("click").tooltip();
		$("[action=next_window]").click(function() {
			core.module.layout.workspace.window_manager.next_window();
		});

		

		$("[action=layout_default]").off("click").tooltip();
		$("[action=layout_default]").click(function() {
			var window_width = $(window).width();
			var window_height = $(window).height();
			core.module.layout.expand('south');
			core.module.layout.expand('east');
			core.module.layout.expand('west');
			core.module.layout.set_size('west', window_width * 0.18);
			core.module.layout.set_size('east', window_width * 0.25);
			core.module.layout.set_size('south', window_height * 0.25);
		});

		$("[action=toggle_full_workspace]").off("click").tooltip();
		$("[action=toggle_full_workspace]").click(function() {
			var __pane = ['west', 'east', 'south'];

			$.each(__pane, function(i, o) {
				core.module.layout.toggle(o);
			});
		});

		

		$("[action=cascade]").off("click").tooltip();
		$("[action=cascade]").click(function() {
			core.module.layout.workspace.window_manager.cascade();
		});

		$("[action=tile_vertically]").off("click").tooltip();
		$("[action=tile_vertically]").click(function() {
			core.module.layout.workspace.window_manager.tile_vertically();
		});

		$("[action=tile_horizontally]").off("click").tooltip();
		$("[action=tile_horizontally]").click(function() {
			core.module.layout.workspace.window_manager.tile_horizontally();
		});

		

		//Main Menu : Help
		$("[action=help_contents]").off("click").tooltip();
		$("[action=help_contents]").click(function() {
			core.dialog.help_contents.show();
		});

		$("[action=view_all_shortcuts]").off("click").tooltip();
		$("[action=view_all_shortcuts]").click(function() {
			core.dialog.help_shortcuts.show();
		});

		$("[action=help_tutorial_basic_tour]").off("click").tooltip();
		$("[action=help_tutorial_basic_tour]").click(function() {
			core.module.tutorial.start('basic');
		});

		$("[action=help_tutorial_new_project]").off("click").tooltip();
		$("[action=help_tutorial_new_project]").click(function() {
			core.module.tutorial.start('new_project');
		});

		$("[action=help_tutorial_build_project]").off("click").tooltip();
		$("[action=help_tutorial_build_project]").click(function() {
			core.module.tutorial.start('build_project');
		});

		$("[action=help_tutorial_debug_project]").off("click").tooltip();
		$("[action=help_tutorial_debug_project]").click(function() {
			core.module.tutorial.start('debug_project');
		});

		
		$("[action=help_about]").off("click").tooltip();
		$("[action=help_about]").click(function() {
			core.dialog.help_about.show();
		});

		$("[action=help_license]").off("click").tooltip();
		$("[action=help_license]").click(function() {
			core.dialog.help_license.show();
		})

		$("[action=help_bug_report]").off("click").tooltip();
		$("[action=help_bug_report]").click(function() {
			core.dialog.help_bug_report.show();
		});
		$("[action=help_facebook]").off("click").tooltip();
		$("[action=help_facebook]").click(function() {
			window.open("https://www.facebook.com/goormIDE");
		});

		$("a[action=help_about_private_url]").off("click");
		$("a[action=help_about_private_url]").click(function() {
			core.dialog.help_about_private_url.show();
		});

		//Context Menu : File
		$("[action=open_text_editor]").off("click").tooltip();
		$("[action=open_text_editor]").click(function() {
			var filename = (core.status.selected_file.split("/")).pop();
			var filetype = null;
			if (filename.indexOf(".") != -1)
				filetype = (filename.split(".")).pop();
			var filepath = core.status.selected_file.replace(filename, "");

			core.module.layout.workspace.window_manager.open(filepath, filename, filetype, "Editor");
		});

		$("[action=delete_bookmark_comment]").off("click").tooltip();
		$("[action=delete_bookmark_comment]").click(function(e) {
			var editor = core.module.bookmark_list.get_active_editor();
			if (editor != null) {
				editor.bookmark.delete_comment();
			}
		});

		

		$("a[action=account_logout]").off("click").tooltip();
		$("a[action=account_logout]").click(function(e) {
			var msg = "";
			var modified = [];
			$(goorm.core.window.manager.window).each(function(i) {
				if (!this.is_saved) {
					modified.push(this);
					msg = msg + "\"" + this.filename + "\",";
				}
			});

			if (msg.length > 0) {
				msg = msg.slice(0, -1);
			}

			function logout() {
				
				//useonly(mode=goorm-oss)
				core.unload();
				core.logout = true;
				location.href = '/';
				
			}

			if (modified.length > 0) {
				confirmation_save.init({
					message: msg + " " + core.module.localization.msg.confirmation_save_message,
					yes_text: core.module.localization.msg.confirmation_logout_save,
					no_text: core.module.localization.msg.confirmation_logout,
					cancel_text: core.module.localization.msg.confirmation_cancel,
					title: core.module.localization.msg.confirmation_title,

					cancel: function() {},
					yes: function() {
						var save_counter = 0;
						$(modified).each(function(i) {
							this.editor.save('logout', function() {
								save_counter++;
								if (save_counter >= modified.length) {
									logout();
								}
							});
						});
					},
					no: function() {
						logout();
					}
				});

				confirmation_save.show();
				return false;
			}
			confirmation.init({
				message: core.module.localization.msg.alert_confirm_logout,
				yes_text: core.module.localization.msg.confirmation_yes,
				no_text: core.module.localization.msg.confirmation_no,
				title: core.module.localization.msg.confirmation_title,
				yes: function() {
					
					//useonly(mode=goorm-oss)
					core.unload();
					core.logout = true;
					location.href = '/';
					
				},
				no: function() {}
			});

			confirmation.show();
		});

		$("a[action=do_terminal_clear]").off('click');
		$("a[action=do_terminal_clear]").click(function() {
			core.module.layout.terminal.Terminal.handler('\x0C');
		});

		// NPM ACTION
		//
		

		this.project_event();
		this.debug_event();

		
		this.editor_context_menu_init();
		this.window_tab_context_menu_init();
		
		this.project_explorer_context_menu_init();

		$(core).trigger('goorm_menu_load_complete');
	},

	project_event: function() {
		var self = this;

		//Main Menu : Project
		$("[action=run]").off("click").tooltip();
		$("[action=run]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			var run_lock = $(this);
			if (run_lock.data('disable') === true) {
				return false;
			}

			if (goorm.core.project.is_building === true) {
				setTimeout(function() {
					$("[action=run]").click();
				}, 300);
				return false;
			}

			run_lock.data('disable', true);
			// window.setTimeout(function() {
			var temp = $.debounce(function() {
				run_lock.data('disable', false);
			}, 500);
			temp();

			core.module.project.run();
		});

		$("[action=stop]").off("click").tooltip();
		$("[action=stop]").click(function() {
			var cmd = "";
			var terminal = null;

			if (core.module.project.process_name) {
				cmd = "ps -ef | grep " + core.module.project.process_name + " | grep -v 'grep ' | awk '{print $2}' | xargs -I @@ kill -9 @@\n";
				terminal = core.module.terminal.terminal;
			} else {
				cmd = "\x03\n";
				terminal = core.module.layout.terminal;
			}

			if (core.module.project.is_running && !$('button[action="stop"]').hasClass('debug_inactive')) {
				terminal.command_ready = true;
				terminal.send_command(cmd);
				core.module.project.is_running = false;
				$('button[action="stop"]').addClass('debug_inactive');
				$('button[action="stop"]').attr('isdisabled', 'disabled');
				$('a[action="stop"]').parent().addClass('disabled')
			}
		});

		$("[action=build_dialog]").off("click").tooltip();
		$("[action=build_dialog]").click(function() {

			var build_lock = $(this);
			if (build_lock.data('disable') === true) {
				return false;
			}
			build_lock.data('disable', true);
			// window.setTimeout(function() {
			var temp = $.debounce(function() {
				build_lock.data('disable', false);
			}, 500);
			temp();

			core.module.layout.select('terminal');
			core.dialog.build_project.show();
		});

		$("[action=build_project]").off("click").tooltip();
		$("[action=build_project]").click(function() {
			var project_path = core.status.current_project_path;
			var project_type = core.status.current_project_type;
			core.module.project.load_build({
				'project_path': project_path,
				'project_type': project_type,
				'check': true
			});
		});

		$("[action=build_all]").off("click").tooltip();
		$("[action=build_all]").click(function() {
			core.module.layout.select('terminal');
			core.dialog.build_all.show();
		});

		$("[action=build_clean]").off("click").tooltip();
		$("[action=build_clean]").click(function() {
			core.module.layout.select('terminal');
			core.dialog.build_clean.show();
		});

		$("[action=build_configuration]").off("click").tooltip();
		$("[action=build_configuration]").click(function() {
			core.dialog.build_configuration.show();
		});

		$("[action=import_project]").off("click").tooltip();
		$("[action=import_project]").click(function() {
			core.dialog.import_project.show($("#dlg_import_project")); //jeongmin: let function know that this is for import project
			$(".project_wizard_first_button[project-type=all]").trigger("click").tooltip();
		});

		$("[action=export_project]").off("click").tooltip();
		$("[action=export_project]").click(function() {
			core.dialog.export_project.show();
		});

		$("[action=delete_project]").off("click").tooltip();
		$("[action=delete_project]").click(function() {
			core.dialog.delete_project.show();
		});

		

		$("a[action=show_properties]").off("click").tooltip();
		$("a[action=show_properties]").click(function() {
			core.dialog.project_property.show();
		});
	},

	debug_event: function() {
		var self = this;

		//Main Menu : Debug
		$("[action=debug]").off("click").tooltip();
		$("[action=debug]").click(function() {
			if (self.prevent(this) || $(this).find(".debug_inactive").length || $(this).attr("isdisabled")) {
				return false;
			}

			core.module.debug.debug_start();
		});

		$("[action=debug_continue]").off("click").tooltip();
		$("[action=debug_continue]").click(function() {
			if (self.prevent(this) || $(this).find(".debug_inactive").length || $(this).attr("isdisabled")) {
				return false;
			}

			core.module.debug.debug_continue();
		});

		$("[action=debug_terminate]").off("click").tooltip();
		$("[action=debug_terminate]").click(function(event, is_closed) {
			if (self.prevent(this) || $(this).find(".debug_inactive").length || $(this).attr("isdisabled")) {
				return false;
			}

			core.module.debug.debug_terminate();
		});

		$("[action=debug_step_over]").off("click").tooltip();
		$("[action=debug_step_over]").click(function() {
			if (self.prevent(this) || $(this).find(".debug_inactive").length || $(this).attr("isdisabled")) {
				return false;
			}

			core.module.debug.debug_step_over();
		});

		$("[action=debug_step_in]").off("click").tooltip();
		$("[action=debug_step_in]").click(function() {
			if (self.prevent(this) || $(this).find(".debug_inactive").length || $(this).attr("isdisabled")) {
				return false;
			}

			core.module.debug.debug_step_in();
		});

		$("[action=debug_step_out]").off("click").tooltip();
		$("[action=debug_step_out]").click(function() {
			if (self.prevent(this) || $(this).find(".debug_inactive").length || $(this).attr("isdisabled")) {
				return false;
			}

			core.module.debug.debug_step_out();
		});
	},
	
	editor_context_menu_init: function() {
		var self = this;
		// AutoComplete in Editor
		$("a[action=do_autocomplete]").off("click");
		$("a[action=do_autocomplete]").click(function() {
			var window_manager = core.module.layout.workspace.window_manager;

			if (window_manager.window[window_manager.active_window]) {
				if (window_manager.window[window_manager.active_window].editor) {
					var target_editor = window_manager.window[window_manager.active_window].editor;

					var cursor = target_editor.editor.getCursor();
					var token = target_editor.editor.getTokenAt(cursor);

					target_editor.dictionary.search(token.string, null, "");
					target_editor.dictionary.show(target_editor.editor);
				}
			}
		});

		$("[action=toggle_breakpoint]").off("click").tooltip();
		$("[action=toggle_breakpoint]").click(function() {
			var editor = core.module.bookmark_list.get_active_editor();
			if (editor != null) {
				editor.set_breakpoint(editor.editor.getCursor().line);
			}
		});

		$("[action=toggle_bookmark]").off("click").tooltip(); //jeongmin: add toggle bookmark menu action
		$("[action=toggle_bookmark]").click(function() {
			var editor = core.module.bookmark_list.get_active_editor();
			if (editor != null) {
				editor.bookmark.toggle();
			}
		});

		
		// Go to Line in Editor
		$("[action=do_go_to_line]").off("click").tooltip();
		$("[action=do_go_to_line]").click(function() {
			core.module.layout.edit_toolbar.option("go_to_line"); //jeongmin: show go to line edit toolbar
		});

		$("[action=search]").off("click").tooltip();
		$("[action=search]").click(function() {
			core.dialog.search.show();
		});

		$("[action=do_find]").off("click").tooltip();
		$("[action=do_find]").click(function() {
			core.dialog.find_and_replace.show();
		});

		$("[action=select_all]").off("click").tooltip();
		$("[action=select_all]").click(function() {
			var window_manager = core.module.layout.workspace.window_manager;

			if (window_manager.window[window_manager.active_window]) {
				if (window_manager.window[window_manager.active_window].editor) {
					window_manager.window[window_manager.active_window].editor.select_all();
				}
			}
		});
		
	},

	window_manager_context_menu_init: function() {
		var self = this;
		$("[action=new_file_file]").off("click").tooltip();
		$("[action=new_file_file]").click(function() {
			if (self.prevent(this)) {
				return false;
			}

			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.new_file.show("");
		});

		$("[action=open_file]").off("click").tooltip();
		$("[action=open_file]").click(function() {
			if (core.status.current_project_path === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			}
			core.dialog.open_file.show();
		});

		$("[action=close_all]").off("click").tooltip();
		$("[action=close_all]").click(function() {
			core.module.layout.workspace.window_manager.close_all();
		});

		$("[action=toggle_full_workspace]").off("click").tooltip();
		$("[action=toggle_full_workspace]").click(function() {
			var __pane = ['west', 'east', 'south'];

			$.each(__pane, function(i, o) {
				core.module.layout.toggle(o);
			});
		});

		
	},

	window_tab_context_menu_init: function() {
		var self = this;
		// toggle showing window using tab context menu. Jeong-Min Im.
		$("[action=show_hide_window]").off("click").tooltip();
		$("[action=show_hide_window]").click(function() {
			var tab = core.module.layout.workspace.window_manager.tab_manager.clicked_window;

			if ($('#' + tab.tab_list_id).find('.tab_restore_button').is(':visible')) // restore button == minimized
				tab.window.restore();
			else
				tab.window.minimize();
		});

		// close window using tab context menu. Jeong-Min Im.
		$("[action=close_window]").off("click").tooltip();
		$("[action=close_window]").click(function() {
			var tab = core.module.layout.workspace.window_manager.tab_manager.clicked_window;

			$("#" + tab.tab_list_id + " .tab_close_button").click();
		});

		// close other windows using tab context menu.
		$("[action=close_other_windows]").off("click").tooltip();
		$("[action=close_other_windows]").click(function() {
			core.module.layout.workspace.window_manager.close_others();
			// var tabs = core.module.layout.workspace.window_manager.tab;
			// var clicked_tab = core.module.layout.workspace.window_manager.tab_manager.clicked_window;

			// var i = 0;
			// while (tabs.length > 1) {
			// 	if (tabs[i] === clicked_tab) {
			// 		i++;
			// 		continue;
			// 	}

			// 	$("#" + tabs[i].tab_list_id + " .tab_close_button").click();
			// }
		});

		$("[action=cascade]").off("click").tooltip();
		$("[action=cascade]").click(function() {
			core.module.layout.workspace.window_manager.cascade();
		});

		$("[action=tile_vertically]").off("click").tooltip();
		$("[action=tile_vertically]").click(function() {
			core.module.layout.workspace.window_manager.tile_vertically();
		});

		$("[action=tile_horizontally]").off("click").tooltip();
		$("[action=tile_horizontally]").click(function() {
			core.module.layout.workspace.window_manager.tile_horizontally();
		});
	},

	project_explorer_context_menu_init: function(type) {
		var self = this;
		//file
		var file_folder_common_context = function() {
			$("[action=Copy_context]").off("click").tooltip();
			$("[action=Copy_context]").click(function() {
				core.module.layout.project_explorer.copy();
			});

			$("[action=Paste_context]").off("click").tooltip();
			$("[action=Paste_context]").click(function() {
				core.module.layout.project_explorer.paste();
			});

			$("[action=Duplicate_context]").off("click").tooltip();
			$("[action=Duplicate_context]").click(function() {
				core.module.layout.project_explorer.duplicate();
			});

			$("[action=rename_context]").off("click").tooltip();
			$("[action=rename_context]").click(function() {
				if (self.prevent(this)) {
					return false;
				}
				core.dialog.rename_file.show("context");
			});

			$("[action=duplicate_file]").off("click").tooltip();
			$("[action=duplicate_file]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				core.module.layout.project_explorer.duplicate();
			});

			$("a[action=move_context]").off("click").tooltip();
			$("a[action=move_context]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				core.dialog.move_file.show("context");
			});

			$("[action=delete_context]").off("click").tooltip();
			$("[action=delete_context]").click(function() {
				if (self.prevent(this)) {
					return false;
				}
				$("[action=delete_file]").click();
			});

			$("[action=delete_all_context]").off("click").tooltip();
			$("[action=delete_all_context]").click(function() {
				var selected_items = $("#project_treeview .jstree-clicked");
				if (selected_items.length > 1) {

					var files = [],
						directorys = [];

					$(selected_items).each(function(i, o) {
						if ($(o).find('img').hasClass("file")) {
							files.push($(o).find(".fullpath").html());
						} else {
							directorys.push($(o).find(".fullpath").html());
						}
					});

					confirmation.init({
						title: core.module.localization.msg.confirmation_delete_title,
						message: core.module.localization.msg.confirmation_delete_all,
						yes_text: core.module.localization.msg.confirmation_yes,
						no_text: core.module.localization.msg.confirmation_no,
						yes: function() {
							var postdata = {
								files: files,
								directorys: directorys
							};

							//$.get("file/delete_all", postdata, function (data) {
							core._socket.once("/file/delete_all", function(data) {
								if (data.err_code == 20) {
									alert.show(core.module.localization.msg[data.message]);
								}
								core.status.selected_file = "";
								core.status.selected_file_type = "";
								core.module.layout.project_explorer.refresh();
							});
							core._socket.emit("/file/delete_all", postdata);
						},
						no: null
					});
					confirmation.show();

				} else {
					console.log("so small");
				}
			});

			$("[action=export_file]").off("click").tooltip();
			$("[action=export_file]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				if (core.status.current_project_path === "") {
					alert.show(core.module.localization.msg.alert_project_not_selected);
					return false;
				}
				core.dialog.export_file.show();
			});
			
		};

		var file_context_menu = function() {
			$("[action=open_context]").off("click").tooltip();
			$("[action=open_context]").click(function() {
				var filename = (core.status.selected_file.split("/")).pop();
				var filetype = null;
				if (filename.indexOf(".") != -1)
					filetype = (filename.split(".")).pop();

				var filepath = core.status.selected_file.replace(filename, "");

				core.module.layout.workspace.window_manager.open(filepath, filename, filetype);
			});

			$("[action=open_default_editor]").off("click").tooltip();
			$("[action=open_default_editor]").click(function() {
				var filename = (core.status.selected_file.split("/")).pop();
				var filetype = null;
				if (filename.indexOf(".") != -1)
					filetype = (filename.split(".")).pop();
				var filepath = core.status.selected_file.replace(filename, "");

				//core.module.layout.workspace.window_manager.open(filepath, filename, filetype);

				var window_manager = core.module.layout.workspace.window_manager;
				window_manager.open(filepath, filename, filetype);

				var selected_window = window_manager.get_window(filepath, filename).index;
				var editor = window_manager.window[selected_window].editor;
				editor.set_option({
					"vim_mode": false,
					"shortcut_theme": "default"
				});

			});

			$("[action=open_vim_editor]").off("click").tooltip();
			$("[action=open_vim_editor]").click(function() {
				var filename = (core.status.selected_file.split("/")).pop();
				var filetype = null;
				if (filename.indexOf(".") != -1)
					filetype = (filename.split(".")).pop();
				var filepath = core.status.selected_file.replace(filename, "");

				//var editor = core.module.layout.workspace.window_manager.open(filepath, filename, filetype, "Editor").editor;

				var window_manager = core.module.layout.workspace.window_manager;
				window_manager.open(filepath, filename, filetype, "Editor", null, function() {
					var selected_window = window_manager.get_window(filepath, filename).index;
					var editor = window_manager.window[selected_window].editor;
					editor.set_option({
						"vim_mode": true,
						"shortcut_theme": "vim"
					});
				});
			});
			
		};

		var folder_context_menu = function() {
			$("[action=new_file_file_context]").off("click").tooltip();
			$("[action=new_file_file_context]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				var target = core.status.selected_node;
				if (target) {
					var node = core.module.layout.project_explorer.treeview.tree.jstree("get_node", target);
					var target_src = node.li_attr.path;
					core.dialog.new_file.show("context");

					$(core.dialog.new_file.dialog_explorer).off("treeviewRenderComplete");
					$(core.dialog.new_file.dialog_explorer).on("treeviewRenderComplete", function() {
						// core.dialog.new_file.expand("#file_new_dir_tree", target_src);
						core.dialog.new_file.add_items("#file_new_files", target_src);

						$('#file_new_location_path').val(target_src);
					});

				} else {
					core.dialog.new_file.show("context");
				}
			});

			$("[action=new_file_folder_context]").off("click").tooltip();
			$("[action=new_file_folder_context]").click(function(e) {
				if (self.prevent(this)) {
					return false;
				}

				var target = core.status.selected_node;
				if (target) {
					var node = core.module.layout.project_explorer.treeview.tree.jstree("get_node", target);
					var target_src = node.li_attr.path;
					core.dialog.new_folder.show("context");

					$(core.dialog.new_folder.dialog_explorer).off("treeviewRenderComplete");
					$(core.dialog.new_folder.dialog_explorer).on("treeviewRenderComplete", function() {
						// core.dialog.new_folder.expand("#folder_new_dir_tree", target_src);
						$('#folder_new_location_path').val(target_src);
					});
				} else {
					core.dialog.new_folder.show("context");
					$("#folder_new_target_name").focus();
				}
			});

			$("[action=new_file_textfile_context]").off("click").tooltip();
			$("[action=new_file_textfile_context]").click(function(e) {
				if (self.prevent(this)) {
					return false;
				}

				var target = core.status.selected_node;
				if (target) {
					var node = core.module.layout.project_explorer.treeview.tree.jstree("get_node", target);
					var target_src = node.li_attr.path;

					core.dialog.new_untitled_textfile.show("context");

					$(core.dialog.new_untitled_textfile.dialog_explorer).off("treeviewRenderComplete");
					$(core.dialog.new_untitled_textfile.dialog_explorer).on("treeviewRenderComplete", function() {
						// core.dialog.new_untitled_textfile.expand("#text_new_dir_tree", target_src);
						$('#text_new_location_path').val(target_src);
					});
				} else {
					core.dialog.new_untitled_textfile.show("context");
				}
			});

			$("[action=folder_open_context]").off("click").tooltip();
			$("[action=folder_open_context]").click(function(e) {
				var target = core.status.selected_node;
				core.module.layout.project_explorer.treeview.tree.jstree("open_node", target);
			});

			$("[action=folder_close_context]").off("click").tooltip();
			$("[action=folder_close_context]").click(function(e) {
				var target = core.status.selected_node;
				core.module.layout.project_explorer.treeview.tree.jstree("close_node", target);
			});

			$("[action=find_in_folder_context]").off("click").tooltip();
			$("[action=find_in_folder_context]").click(function() {
				core.dialog.search.show('/' + core.status.selected_file);
			});

			$("[action=import_file]").off("click").tooltip();
			$("[action=import_file]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				if (core.status.current_project_path === "") {
					alert.show(core.module.localization.msg.alert_project_not_selected);
					return false;
				}
				core.dialog.import_file.show();
			});
			
		};

		//explorer
		var explorer_context_menu = function() {
			$("[action=new_project]").off("click").tooltip();
			$("[action=new_project]").click(function() {
				$("a[href='#new_project_template']").click();

				core.dialog.new_project.show();
				$(".project_wizard_first_button[project-type=all]").trigger("click").tooltip();

			});

			$("[action=open_project]").off("click").tooltip();
			$("[action=open_project]").click(function() {
				core.dialog.open_project.show();
			});

			$("[action=new_file_file]").off("click").tooltip();
			$("[action=new_file_file]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				if (core.status.current_project_path === "") {
					alert.show(core.module.localization.msg.alert_project_not_selected);
					return false;
				}
				core.dialog.new_file.show("");
			});

			$("[action=new_file_folder]").off("click").tooltip();
			$("[action=new_file_folder]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				if (core.status.current_project_path === "") {
					alert.show(core.module.localization.msg.alert_project_not_selected);
					return false;
				}
				core.dialog.new_folder.show("");
			});

			$("[action=new_file_textfile]").off("click").tooltip();
			$("[action=new_file_textfile]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				if (core.status.current_project_path === "") {
					alert.show(core.module.localization.msg.alert_project_not_selected);
					return false;
				}
				core.dialog.new_untitled_textfile.show("");
			});

			$("[action=import_file]").off("click").tooltip();
			$("[action=import_file]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				if (core.status.current_project_path === "") {
					alert.show(core.module.localization.msg.alert_project_not_selected);
					return false;
				}
				core.dialog.import_file.show();
			});

			$("[action=export_file]").off("click").tooltip();
			$("[action=export_file]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				if (core.status.current_project_path === "") {
					alert.show(core.module.localization.msg.alert_project_not_selected);
					return false;
				}
				core.dialog.export_file.show();
			});

			$("[action=save_all_file]").off("click").tooltip();
			$("[action=save_all_file]").click(function() {
				if (self.prevent(this)) {
					return false;
				}

				core.module.layout.workspace.window_manager.save_all();
			});

			$("[action=refresh_project_directory]").off("click").tooltip();
			$("[action=refresh_project_directory]").click(function() {
				core.module.layout.project_explorer.refresh();
			});

			$("a[action=show_properties]").off("click").tooltip();
			$("a[action=show_properties]").click(function() {
				core.dialog.project_property.show();
			});

		};

		switch (type) {
			case "file_context":
				file_folder_common_context();
				file_context_menu();
				break;
			case "folder_context":
				file_folder_common_context();
				folder_context_menu();
				break;
			case "explorer_context":
				explorer_context_menu();
				break;
			default:
				file_folder_common_context();
				file_context_menu();
				folder_context_menu();
				explorer_context_menu();
		}

	},

	

};