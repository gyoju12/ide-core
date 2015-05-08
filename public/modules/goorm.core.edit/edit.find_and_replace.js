/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.edit.find_and_replace = {
	dialog: null,
	buttons: null,
	editor: null,
	panel: null,
	last_pos: null,
	last_query: null,
	recent_pos: null,
	marked: [],
	match_case: false,
	whole_word: false,
	use_regexp: false,
	find_on_workspace: false,
	replace_cursor: null,
	matched_file_list: [],

	init: function() {
		var self = this;

		this.panel = $("#dlg_find_and_replace");
		$(core).one('localization_init_complete', function() {
			$("#find_query_inputbox").attr("placeholder", core.module.localization.msg.msg_project_find_guide);
			$("#replace_query_inputbox").attr("placeholder", core.module.localization.msg.msg_project_replace_guide);
		});
		$(core).on('language_loaded', function() {
			$("#find_query_inputbox").attr("placeholder", core.module.localization.msg.msg_project_find_guide);
			$("#replace_query_inputbox").attr("placeholder", core.module.localization.msg.msg_project_replace_guide);
		});

		this.total_count = 0;
		this.current_count = 0;

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_find_replace",
			id: "dlg_find_and_replace",
			success: function() {

				// Find
				// 
				$('#g_far_btn_find').click(function() {
					self.find();
				});

				// Find Previous
				// 
				$('#g_far_btn_find_prev').click(function() {
					self.find_prev();
				});

				// Find All
				//
				//$('#g_far_btn_find_all').click(function () {
				//	self.find_all();
				//});

				// Find/Replace -- depreciated
				//
				// $('#g_far_btn_far').click(function() {
				// 	self.handle_replace_and_find();
				// });

				// find button added - Donguk Kim
				$('#g_far_btn_find2').click(function() {
					self.find();
				});	

				// Replace
				// aggregated find and replace on this function --heeje
				$('#g_far_btn_replace').click(function() {
					//self.handle_replace();
					self.handle_replace_and_find();
				});
				// $('#far_match_case').click(function() {
				// 	if (!$('#far_match_case').hasClass('disabled')) {
				// 		$('#far_match_case').addClass('disabled');
				// 	} else {
				// 		$('#far_match_case').removeClass('disabled');
				// 	}
				// });
				$('#far_use_regexp').click(function() {
					if (!$('#far_whole_word').hasClass('disabled')) {
						$('#far_whole_word').addClass('disabled');
						$('#far_match_case').addClass('disabled');
					} else {
						$('#far_whole_word').removeClass('disabled');
						$('#far_match_case').removeClass('disabled');
					}
					if (!$('#far_use_regexp').hasClass('active')) {
						$("#find_query_inputbox").trigger("change");
					} else {
						$("#find_query_inputbox_background").val('');
					}

				});
				// Replace All
				//
				$('#g_far_btn_replace_all').click(function() {
					self.handle_replace_all();
				});

				$("#find_query_inputbox, #replace_query_inputbox").keydown(function(e) {
					var ev = e || event;

					if (ev.keyCode == 13) { // enter key
						self.find();

						e.stopPropagation();
						e.preventDefault();
						return false;
					}
				});

				var inputbox = $("#find_query_inputbox");
				var inputbox_background = $("#find_query_inputbox_background");
				var make_shadow = function (){
					if($('#far_use_regexp').hasClass('active')){
						var value = inputbox.val();
						var scroll = inputbox.scrollLeft();
						if(value.length > 0){
							if(scroll > 0){
								inputbox_background.css('padding-left', '8px');
							}else{
								inputbox_background.css('padding-left', '4px');
								value = "/" + value; 
							}
							value = value + "/";
						}
						inputbox_background.val(value);
						inputbox_background.scrollLeft(scroll);
					}
				}
				inputbox.bind("keydown keyup keypress change select", function(e){
					setTimeout(make_shadow, 10);
				});

				// Donguk.kim
				// // focus find inputbox by native javascript
				// var moveCaretToEnd = function(el) {
				// 	if (typeof el.selectionStart == "number") {
				// 		el.selectionStart = el.selectionEnd = el.value.length;
				// 	} else if (typeof el.createTextRange != "undefined") {
				// 		el.focus();

				// 		var range = el.createTextRange();
				// 		range.collapse(false);
				// 		range.select();
				// 	}
				// };

				// var input_box = document.getElementById("find_query_inputbox");
				// var input_box_onfocus = $.debounce(function() {
				// 	moveCaretToEnd(input_box);
				// }, 5);
				// input_box.onfocus = function() {
				// 	moveCaretToEnd(input_box);

				// 	// Work around Chrome's little problem
				// 	// window.setTimeout(function () {
				// 	input_box_onfocus();
				// };

				self.panel.on('hide.bs.modal', function() { // this part remove Donguk Kim 
					self.unmark();
					$("#find_and_replace_matches").hide();

					var window_manager = core.module.layout.workspace.window_manager;
					var active_window = window_manager.window[window_manager.active_window];
					if (active_window && active_window.editor) {

						// Get current active_window's CodeMirror editor
						var editor = active_window.editor.editor;
						// jeongmin: remove all the highlights
						CodeMirror.commands.clearSearch(editor); // using codemirror search API (clearSearch function (cm)) -> see addon/search.js
						self.remove_search_focus(editor);
						editor.focus(); // jeongmin: user can edit source code right after finding
					}
					self.current_count = 0;
				});

				//
				self.panel.on('shown.bs.modal', function() {
					var window_manager = core.module.layout.workspace.window_manager;

					if (window_manager.window[window_manager.active_window].searching) // jeongmin: only when searching
						core.dialog.search.unmark(); // jeongmin: remove search highlight

					// 	var window_manager = core.module.layout.workspace.window_manager;  // this part remove Donguk Kim

					// cut modal fade (dialog size)

					var goorm_dialog_container = $("#dlg_find_and_replace");
					var container = goorm_dialog_container.find('.modal-dialog');

					var window_width = $(window).width();
					var window_height = $(window).height();

					var container_width = container.outerWidth();
					var container_height = container.outerHeight();

					if (goorm_dialog_container.attr('data-backdrop') == 'false') { // no backdrop --> change width, height, top, left
						var top = (window_height - container_height) / 2;
						var left = (window_width - container_width) / 2;

						goorm_dialog_container.css('width', container_width + 'px')
							.css('height', container_height + 'px');
						// .css('top', top+'px')
						// .css('left', left+'px');

						$(document).off('focusin.bs.modal');
					} else {
						goorm_dialog_container.css('top', '0px');

						if (window_height > container_height) {
							container.css('margin-top', ((window_height - container_height) / 2) + 'px');
						} else {
							container.css('margin-top', '10px');
						}
					}
				});
			}
		});
	},

	set_options: function() {
		// this.match_case = $('#far_match_case').parent().hasClass('checked');
		//	this.use_regexp = $('#far_use_regexp').parent().hasClass('checked');
		//	this.whole_word = $('#far_whole_word').parent().hasClass('checked');
		this.use_regexp = $("#far_use_regexp").hasClass("active");
		this.match_case = $("#far_match_case").hasClass("active");
		this.whole_word = $("#far_whole_word").hasClass("active");
	},

	find: function() {
		var window_manager = core.module.layout.workspace.window_manager;

		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window].editor) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query of this dialog
			var keyword = $("#find_query_inputbox").val();
			CodeMirror.commands.clearSearch(editor); // using codemirror search API
			this.search(keyword, editor);
			// findNext: do Search
			// find: clear Search & do Search
		}

	},

	// find string in the opposite direction. Jeong-Min Im.
	find_prev: function() {
		var window_manager = core.module.layout.workspace.window_manager;

		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window].editor) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query of this dialog
			var keyword = $("#find_query_inputbox").val();
			this.search(keyword, editor, "previous");
		}
	},

	find_all: function() {
		this.progress_elements = core.module.loading_bar.start({
			str: core.module.localization.msg.loading_bar_search
		});
		var window_manager = core.module.layout.workspace.window_manager,
			keyword;
		
		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window].editor) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query of this dialog
			keyword = $("#find_query_inputbox").val();
			// Call search function of goorm.core.file.findReplace with keyword and editor
			this.search_all(keyword, editor);
		} else {
			//var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query of this dialog
			keyword = $("#find_query_inputbox").val();
			// Call search function of goorm.core.file.findReplace with keyword and editor
			this.search_all(keyword, null);
		}
	},

	handle_replace_and_find: function() {

		var window_manager = core.module.layout.workspace.window_manager;
		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window].editor) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query and replacing word of this dialog
			var keyword1 = $("#find_query_inputbox").val(),
				keyword2 = $("#replace_query_inputbox").val();
			// Call search function of goorm.core.file.findReplace with keyword and editor
			if (editor.getSelection() === "") {
				this.search(keyword1, editor);
				this.replace(keyword1, keyword2, editor);
				return;
			} else {
				this.replace(keyword1, keyword2, editor);
				this.search(keyword1, editor);
				return;
			}

			//this.replace_search(keyword1, keyword2, editor);
		}
	},

	handle_replace: function() {

		var window_manager = core.module.layout.workspace.window_manager;
		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window].editor) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query and replacing word of this dialog
			var keyword1 = $("#find_query_inputbox").val(),
				keyword2 = $("#replace_query_inputbox").val();
			// Call search function of goorm.core.file.findReplace with keyword and editor
			this.replace(keyword1, keyword2, editor);

		}
	},

	handle_replace_all: function() {

		var window_manager = core.module.layout.workspace.window_manager;
		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window].editor) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query and replacing word of this dialog
			var keyword1 = $("#find_query_inputbox").val(),
				keyword2 = $("#replace_query_inputbox").val();
			// Call search function of goorm.core.file.findReplace with keyword and editor
			this.replace_all(keyword1, keyword2, editor);
		}
	},
	search: function(keyword, editor, direction) {
		if (!keyword)
			return;
		
		this.set_options();
		
		var text = keyword,
			length = text.length,
			caseFold = true,
			start,
			options = { "whole_word": this.whole_word,
					  	"ignore_case": !this.match_case };
		if(this.use_regexp) {	// special case : regexp
			try{
				text = new RegExp(text);
			}catch(e){
				text = '';
			}
		}
		else {	// others.
			var flag = "g";
			text = text.replace(/[^\w\d]/g, "\\$&"); // add backslash to non alphbet, underbar, number
			
			for(var option in options) {
				// common handling
				if(options[option]) {
					switch(option) {
						case "whole_word":
							text = length > 1 ? "\\b" + text + "\\b" : text;
							break;
						case "ignore_case":
							flag += "i";
							break;
					}
				}
			}
			
			text = new RegExp(text, flag);
		}
		
		// this.unmark();

		// if (this.last_query != text)
		// 	this.last_pos = null;

		// var cursor = editor.getSearchCursor(text, editor.getCursor(), caseFold);
		// var window_manager = core.module.layout.workspace.window_manager;
		// firstActive = window_manager.active_window;

		// reset coount
		
		if ((this.last_query != text.toString()) || this.total_count === 0 || this.current_count === 0) {
			this.total_count = 0;
			this.current_count = 0;

			var cursor;		// iterator - search positions
			start = editor.getSearchCursor(text, {line:editor.getCursor().line, ch:editor.getCursor().ch}, true);	// cursor position before search
			if (direction == "previous") {
				start.findPrevious();
			} else {
				start.findNext();
			}
			// iterate
			for (cursor = editor.getSearchCursor(text, null, true); cursor.findNext();) {
				this.total_count++;
				if (cursor.pos.from.line == start.pos.from.line && cursor.pos.from.ch == start.pos.from.ch) {
					if (direction == "previous") {
						this.current_count = this.total_count + 1;
					} else {
						this.current_count = this.total_count - 1;
					}
				}	
			}
			
		}

		text = text.toString();

		if (direction == "previous") {
			CodeMirror.commands.findPrev(editor, true, text, caseFold);
			
			
			if (this.total_count > 0) {
				this.current_count--;
				if (this.current_count < 1) {
					this.current_count = this.total_count;
				}
				CodeMirror.commands.showInCenter(editor);
			}
			
			// cursor.findPrevious();
			// if (!cursor.findPrevious()) {
			// 	//첫번재 match 단어에서 previous 시

			// 	if (this.find_on_workspace === true) {
			// 		for (var i = 0; i < window_manager.window.length; i++) {
			// 			if (window_manager.active_window === 0) {
			// 				if ((window_manager.window[window_manager.window.length - 1].filename).indexOf('terminal') != -1) {
			// 					window_manager.window[window_manager.window.length - 1].activate();
			// 					continue;
			// 				}
			// 				window_manager.window[window_manager.window.length - 1].activate();
			// 			} else {
			// 				if ((window_manager.window[(window_manager.active_window - 1) % window_manager.window.length].filename).indexOf('terminal') != -1) {
			// 					window_manager.window[(window_manager.active_window - 1) % window_manager.window.length].activate();
			// 					continue;
			// 				}s
			// 				window_manager.window[(window_manager.active_window - 1) % window_manager.window.length].activate();
			// 			}

			// 			editor = window_manager.window[window_manager.active_window].editor.editor;

			// 			for (cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {}
			// 			cursor.findPrevious();
			// 			if (editor.getSearchCursor(text, null, caseFold).findNext()) {
			// 				break;
			// 			}
			// 		}
			// 	} else {
			// 		for (cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {}
			// 		cursor.findPrevious();
			// 		if (!editor.getSearchCursor(text, null, caseFold).findNext()) {
			// 			return;
			// 		}
			// 	}
			// }
		} else {
			CodeMirror.commands.find(editor, null, text, caseFold);
			
			
			if (this.total_count > 0) {
				this.current_count++;
				if (this.current_count > this.total_count) {
					this.current_count = 1;
				}
				CodeMirror.commands.showInCenter(editor);
			}
			
			// if (!cursor.findNext()) {
			// 	//마지막 match 단어에서 next 시

			// 	if (this.find_on_workspace === true) {
			// 		for (var i = 0; i < window_manager.window.length; i++) {
			// 			if ((window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].filename).indexOf('terminal') != -1) {
			// 				window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();
			// 				continue;
			// 			}

			// 			window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();

			// 			editor = window_manager.window[window_manager.active_window].editor.editor;

			// 			cursor = editor.getSearchCursor(text, null, caseFold);
			// 			if (cursor.findNext()) {
			// 				break;
			// 			}
			// 		}
			// 	} else {
			// 		cursor = editor.getSearchCursor(text, null, caseFold);
			// 		if (!cursor.findNext()) {
			// 			core.module.toast.show(core.module.localization.msg.alert_cannot_find_word, null, function (){
			// 				$("#find_query_inputbox").focus();
			// 			});
			// 			return;
			// 		}
			// 	}

			// }
		}
		$("#find_and_replace_matches").html(this.current_count + " / " + this.total_count);
		$("#find_and_replace_matches").show();
		// window_manager.window[firstActive].activate();
		// editor.setSelection(cursor.from(), cursor.to());
		// this.replace_cursor = cursor;
		this.last_query = text;
		this.recent_pos = start;
		// this.last_pos = cursor.to();

		if (this.total_count === 0) { // no such words in text.
			core.status.focus_obj = null; 
			core.module.toast.show(core.module.localization.msg.alert_cannot_find_word, 550, function () {
				$("#find_query_inputbox").focus();
				$("#find_query_inputbox").select();
			});
		} else {
			this.draw_search_focus(editor);	
		}
	},
	draw_search_focus: function(editor) {
		if (!editor.somethingSelected() || $(editor.display.wrapper).find('.cm-searching').length === 0) {
			this.remove_search_focus(editor);
			return;
		}
		var start = editor.cursorCoords(true, {mode: 'local'});
		var end = editor.cursorCoords(false, {mode: 'local'});
		var height = start.bottom - start.top;
		if (start.top < 0) {
			start.top = 0;
		}
		if (end.bottom < 0) {
			end.top = 0;
		}

		if ($(editor.display.wrapper).find('.CodeMirror-lines').children().children('.goorm-search').length === 0) {
			$(editor.display.wrapper).find('.CodeMirror-lines').children().prepend('<div class="goorm-search" style="position: relative; z-index: 2;"></div>');	
		}
		var $to = $(editor.display.wrapper).find('.CodeMirror-lines').children().children('.goorm-search');
		var PRE_PADDING = 4;

		this.remove_search_focus(editor);
		
		if (start.top === end.top) {	// no line wrapped
			$to.append('<div class="goorm-search-focus" style="top: ' + start.top + 'px; ' +
														'left: ' + start.left + 'px; ' +
														'width: ' + (end.left - start.left).toString() + 'px; ' +
														'height: ' + height.toString() + 'px;' +
														'"></div>');	
		} else {	// line wrapped
			$to.append('<div class="goorm-search-focus" style="top: ' + start.top + 'px; ' +
														'left: ' + start.left + 'px; ' +
														'width: ' + ($to.parents('.CodeMirror-lines').width() - start.left - PRE_PADDING).toString() + 'px; ' +
														'height: ' + height.toString() + 'px;' +
														'"></div>');
			$to.append('<div class="goorm-search-focus" style="top: ' + end.top + 'px; ' +
														'left: ' + PRE_PADDING + 'px; ' +
														'width: ' + end.left + 'px; ' +
														'height: ' + height.toString() + 'px;' +
														'"></div>');
		}
	},
	remove_search_focus: function(editor) {
		$(editor.display.wrapper).find('.CodeMirror-lines').children().children('.goorm-search').empty();
	},
	/* 트리뷰 만들어줘야됌 */
	search_all: function(keyword, editor) {
		if (!keyword) {
			this.progress_elements.stop();
			return;
		}
		var text = keyword;
		var caseFold = true;
		this.set_options();
		// if (this.match_case === true)
		// 	caseFold = false;
		if (this.whole_word === true)
			if(this.match_case === true)
				text = text.replace(/\s*/g, '');
			else 
				text = text.replace(/\s*/gi, '');
			
		if (this.use_regexp === true)
			if(this.match_case === true)
				text = RegExp(keyword, "g");
			else 
				text = RegExp(keyword, "gi");

		if(!(this.whole_word === true || this.use_regexp === true)) {
			if(this.match_case === true)
				text = RegExp(keyword, "g");
			else 
				text = RegExp(keyword, "gi");
		}	

		var nodes = {}, node = {}, i,
			window_manager = core.module.layout.workspace.window_manager,
			firstActive, cursor, key,
			searchedWords = [];

		this.unmark();
		core.dialog.search.query = keyword;
		firstActive = window_manager.active_window;

		if (this.find_on_workspace === true) {
			for (i = 0; i < window_manager.window.length; i++) {
				if ((window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].filename).indexOf('terminal') != -1) {
					window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();
					continue;
				}
				window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();

				node = {};
				node.filename = window_manager.window[window_manager.active_window].filename;
				node.filetype = window_manager.window[window_manager.active_window].filetype;
				node.filepath = window_manager.window[window_manager.active_window].filepath;
				node.matched_line = 1;
				node.expanded = false;
				node.type = "html";
				node.html = "";
				node.children = [];

				nodes[node.filepath + node.filename] = node;
			}

			for (i = 0; i < window_manager.window.length; i++) {
				if ((window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].filename).indexOf('terminal') != -1) {
					window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();
					continue;
				}
				window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();
				editor = window_manager.window[window_manager.active_window].editor.editor;

				cursor = editor.getSearchCursor(text, null, caseFold);
				if (!cursor.findNext()) {
					delete nodes[window_manager.window[window_manager.active_window].filepath + window_manager.window[window_manager.active_window].filename];
					continue;
				}
				// search all matched words and set background of them yellow
				for (cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {
					this.marked.push(editor.markText(cursor.from(), cursor.to(), {
						'className': 'cm-searched'
					}));

					node = {};

					node.filename = window_manager.window[window_manager.active_window].filename;
					node.filetype = window_manager.window[window_manager.active_window].filetype;
					node.filepath = window_manager.window[window_manager.active_window].filepath;
					node.matched_line = cursor.from().line + 1;
					node.expanded = false;
					node.type = "html";
					node.html = "<span style=\"color: #666; font-weight:bold;\">Line: " + node.matched_line + "</span> - <span style=\"color: #808080\">" + window_manager.window[window_manager.active_window].editor.editor.getLine(node.matched_line - 1) + "</span>";

					nodes[node.filepath + node.filename].children.push(node);
				}
			}

			for (key in nodes) {
				nodes[key].matched_line = nodes[key].children[0].matched_line;
				nodes[key].html = "<div class='node'>" + "<img src=images/icons/filetype/" + "etc" + ".filetype.png class=\"directory_icon file\" style=\"margin: 0px 3px 0 2px !important; float:left\"/>" + nodes[key].filepath + nodes[key].filename + "<div class=\"matched_lines_cnt\" style=\"float:right; background: #99acc4; color: white; width: 14px; height: 14px; text-align:center; -webkit-border-radius:3px; -moz-border-radius:3px; border-radius:3px; margin: 1px 10px 0px;\">" + nodes[key].children.length + "</div>" + "<div class=\"fullpath\" style=\"display:none;\">" + nodes[key].filepath + nodes[key].filename + "</div>" + "</div>";
			}

			core.dialog.search.set_search_treeview($.isEmptyObject(nodes) ? null : nodes);
		} else if (editor) {
			node = {};
			node.filename = window_manager.window[window_manager.active_window].filename;
			node.filetype = window_manager.window[window_manager.active_window].filetype;
			node.filepath = window_manager.window[window_manager.active_window].filepath;
			node.matched_line = 1;
			node.expanded = false;
			node.type = "html";
			node.html = "";
			node.children = [];

			nodes[node.filepath + node.filename] = node;

			cursor = editor.getSearchCursor(text, null, caseFold);
			if (!cursor.findNext()) {
				core.dialog.search.set_search_treeview(null);
				this.progress_elements.stop();
				return;
			}
			// search all matched words and set background of them yellow
			for (cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {
				this.marked.push(editor.markText(cursor.from(), cursor.to(), {
					'className': 'cm-searched' //jeongmin: attach codemirror class prefix
				}));
				var temp = {
					fline: cursor.from().line,
					fch: cursor.from().ch,
					tline: cursor.to().line,
					tch: cursor.to().ch
				};

				node = {};

				node.filename = window_manager.window[window_manager.active_window].filename;
				node.filetype = window_manager.window[window_manager.active_window].filetype;
				node.filepath = window_manager.window[window_manager.active_window].filepath;
				node.matched_line = cursor.from().line + 1;
				node.expanded = false;
				node.type = "html";
				node.html = "<span style=\"color: #666; font-weight:bold;\">Line: " + node.matched_line + "</span> - <span style=\"color: #808080\">" + window_manager.window[window_manager.active_window].editor.editor.getLine(node.matched_line - 1) + "</span>";

				nodes[node.filepath + node.filename].children.push(node);

				searchedWords.push(temp);
			}

			for (key in nodes) {
				nodes[key].matched_line = nodes[key].children[0].matched_line;
				nodes[key].html = "<div class='node'>" + "<img src=images/icons/filetype/" + "etc" + ".filetype.png class=\"directory_icon file\" style=\"margin: 0px 3px 0 2px !important; float:left\"/>" + nodes[key].filepath + nodes[key].filename + "<div class=\"matched_lines_cnt\" style=\"float:right; background: #99acc4; color: white; width: 14px; height: 14px; text-align:center; -webkit-border-radius:3px; -moz-border-radius:3px; border-radius:3px; margin: 1px 10px 0px;\">" + nodes[key].children.length + "</div>" + "<div class=\"fullpath\" style=\"display:none;\">" + nodes[key].filepath + nodes[key].filename + "</div>" + "</div>";
			}

			core.dialog.search.set_search_treeview(nodes);
		}
		// print messages in reverse order (becuase getSearchCursor search text from the end to the start of the document)
		for (i = searchedWords.length - 1; i > -1; i--) {
			core.module.search.m(searchedWords[i].fline, searchedWords[i].fch, searchedWords[i].tline, searchedWords[i].tch, editor.getLine(searchedWords[i].fline));
		}

		// highlight the selected word on the editor with colored background
		$("div.search_message").click(function() {
			$("div.search_message").css("background-color", "");
			$(this).css("background-color", "#fff8dc");

			var fLine = parseInt($(this).attr("fline"), 10);
			var fCh = parseInt($(this).attr("fch"), 10);
			var tLine = parseInt($(this).attr("tline"), 10);
			var tCh = parseInt($(this).attr("tch"), 10);

			var from = {
				line: fLine,
				ch: fCh
			};
			var to = {
				line: tLine,
				ch: tCh
			};
			editor.setSelection(from, to);
		});
		window_manager.window[firstActive].activate();
		window_manager.window[firstActive].refresh();
		this.progress_elements.stop();

	},

	replace_search: function(keyword1, keyword2, editor) {

		if (!keyword1)
			return;
		var text = keyword1;
		var caseFold = true;

		if (this.use_regexp === true)
			text = RegExp(keyword1, "g");
		else {
			if (this.match_case === true)
				caseFold = false;
			if (this.whole_word === true)
				text = text.replace(/\s*/g, '');
		}

		this.unmark();

		for (var cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {
			this.marked.push(editor.markText(cursor.from(), cursor.to(), {
				'className': 'searched'
			}));
		}

		if (this.last_query != text)
			this.last_pos = null;

		cursor = editor.getSearchCursor(text, editor.getCursor() || this.last_pos, caseFold);

		if (!cursor.findNext()) {
			cursor = editor.getSearchCursor(text, null, caseFold);

			if (!cursor.findNext())
				return;
		}

		editor.setSelection(cursor.from(), cursor.to());
		this.last_query = text;
		this.last_pos = cursor.to();

	},

	replace: function(keyword1, keyword2, editor) {
		if (!keyword1)
			return;

		var text = keyword1,
			replace = keyword2;
		var caseFold = true;

		if (this.use_regexp === true)
			text = RegExp(keyword1, "g");
		else {
			if (this.match_case === true)
				caseFold = false;
			if (this.whole_word === true)
				text = text.replace(/\s*/g, '');
		}

		this.unmark();
		if (editor.getSelection() === "")
			return;
		this.search(keyword1, editor);
		this.search(keyword1, editor, "previous");
		if (editor.getSelection() === "")
			return;
		var cursor = editor.getSearchCursor(text, editor.getCursor(), caseFold);
		if (!cursor.findPrevious())
			return;
		editor.replaceRange(replace, cursor.from(), cursor.to());
	},

	replace_all: function(keyword1, keyword2, editor) {
		var self = this;
		if (!keyword1)
			return;
		var text = keyword1,
			replace = keyword2;
		var caseFold = true;
		var n = 0;
		if (this.use_regexp === true)
			text = RegExp(keyword1, "g");
		else {
			if (this.match_case === true)
				caseFold = false;
			if (this.whole_word === true)
				text = text.replace(/\s*/g, '');
		}

		// Activate search tab and clean it.
		//core.module.layout.select('search');
		core.module.search.clean();

		this.unmark();
		for (var cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {
			n++;
		}

		if (n === 0) {
			core.module.toast.show(core.module.localization.msg.confirmation_replace_all_none);
		} else {
			var msg = ("'" + keyword1 + "' " + n + core.module.localization.msg.confirmation_replace_all_end);
			var options = {
				title: core.module.localization.msg.title_replace_all,
				message: msg,
				yes_text: core.module.localization.msg.yes,
				no_text: core.module.localization.msg.no,
				yes: function() {
					for (var cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {
						// hidden - This causes infinite loop when replace 'a' to 'aa'
// 						editor.replaceRange(replace, cursor.from(), cursor.to());
// 						core.module.search.replace_all(cursor.from().line, cursor.from().ch, cursor.to().line, cursor.to().ch, text, replace);
						cursor.replace(replace);
					}

					self.panel.modal('hide');

					// highlight the selected word on the editor with colored background
					$("div.search_message").click(function() {

						$("div.search_message").css("background-color", "");
						$(this).css("background-color", "#fff8dc");

						var fLine = parseInt($(this).attr("fline"), 10);
						var fCh = parseInt($(this).attr("fch"), 10);
						var tLine = parseInt($(this).attr("tline"), 10);

						var from = {
							line: fLine,
							ch: fCh
						};
						var to = {
							line: tLine,
							ch: fCh + replace.length
						};
						editor.setSelection(from, to);
					});
				},
				no: null
			};
			confirmation.init(options);
			confirmation.show();
		}
	},

	unmark: function() {
		for (var i = 0; i < this.marked.length; ++i) this.marked[i].clear();
		this.marked.length = 0;
	},

	show: function() {

		var window_manager = core.module.layout.workspace.window_manager;

		// $("#find_query_inputbox").val("");
		$("#replace_query_inputbox").val("");

		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window] !== undefined) {

			this.panel.modal('show');
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;

			if (editor.getSelection() !== "") {
				$("#find_query_inputbox").val(editor.getSelection());
			}
			$("#find_query_inputbox").select();
		} else {
			alert.show(core.module.localization.msg.alert_cannot_exist_editor);
		}


		$("#far_match_case").tooltip();
		$("#far_whole_word").tooltip();
		$("#far_use_regexp").tooltip();
		$("#g_far_btn_find_prev").tooltip();
		$("#g_far_btn_find").tooltip();

	}
};
