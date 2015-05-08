/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.edit.go_to_line = {
	// dialog: null,
	// buttons: null,
	editor: null,
	flag: false, //jeongmin: whether keydown is binded already or not

	success: function() {
		var self = this;

		if (this.flag == false) { //jeongmin: if keydown isn't binded yet
			$("#edit_toolbar_inputbox").off("keydown"); //jeongmin: remove event handler which is binded before
			$("#edit_toolbar_ok").parent().off("mousedown");
			$("#edit_toolbar_inputbox").keydown(function(e) {
				var ev = e || event;
				if (ev.keyCode == 27) { //jeongmin: add this again for esc
					// esc key
					$(this).blur(); //jeongmin: go to line is done
					return false; //jeongmin: stop event
				} else if (ev.keyCode == 13) {
					self.move();
					// $(this).blur(); //jeongmin: go to line is done

					e.stopPropagation();
					e.preventDefault();
					
					
					return false;
				} else if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.keyCode == 76) { //jeongmin: when edit toolbar is shown, if ctrl + shift + l (go to line shortcut) is pushed, exit
					$(this).blur(); //jeongmin: go to line is done
					return false;
				}
			});

			//button 
			$("#edit_toolbar_ok").parent().on("mousedown", "#edit_toolbar_ok", function() {
				self.move();
				// $("#edit_toolbar").toggleClass('hidden');
				return false;
			});

			this.flag = true; //jeongmin: keydown is binded
		}
	},

	move: function() {
		// Get current active_window's editor

		if (this.editor) {
			// Get current active_window's CodeMirror editor
			// this.editor = window_manager.window[window_manager.active_window].editor.editor;	// hidden by jeongmin: editor is decided at show, so no need to do it again
			// Get input query of this dialog
			var keyword = $("#edit_toolbar_inputbox").val();
			var window_manager = core.module.layout.workspace.window_manager;
			// Call search function of goorm.core.file.findReplace with keyword and editor	

			//editor error fix --heeje
			$(this).blur();
			// $("#edit_toolbar").toggleClass('hidden');
			if (isNaN(keyword) || keyword <= 0) return;

			this.editor.setCursor(parseInt(keyword, 10) - 1, 0);
			CodeMirror.commands.showInCenter(this.editor);
			//scroll location calculate : no need - KW
			// var container_id = window_manager.window[window_manager.active_window].container;
			// var to_mean = ($('#' + container_id + ' .bd').height() / (this.font_size + 3)) / 2;
			// this.editor.scrollIntoView(parseInt(parseInt(keyword, 10) - 1 - to_mean, 10));
			// this.editor.scrollIntoView(parseInt(parseInt(keyword, 10) - 1 + to_mean, 10));
			// this.editor.scrollIntoView(parseInt(keyword, 10) - 1);
			this.editor.focus();
		}
	},

	show: function() {

		var window_manager = core.module.layout.workspace.window_manager;
		var active_window = window_manager.window[window_manager.active_window];

		// Get current active_window's editor
		if (active_window !== undefined) {
			$("#edit_toolbar_inputbox").val("");

			// Get current active_window's CodeMirror editor
			if (active_window.editor) {
				this.editor = active_window.editor.editor;
				this.font_size = this.editor.font_size; // jeongmin: use font size differently according to editor type
				
			} else {
				return false;
			}

			return true; //jeongmin: not error
		} else {
			alert.show(core.module.localization.msg.alert_cannot_exist_editor);
			return false; //jeongmin: error
		}
	}
};