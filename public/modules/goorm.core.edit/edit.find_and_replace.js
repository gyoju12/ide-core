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
	marked: [],
	match_case: false,
	ignore_whitespace: false,
	use_regexp: false,
	find_on_workspace: false,
	replace_cursor: null,
	matched_file_list: [],

	init: function() {
		var self = this;

		this.panel = $("#dlg_find_and_replace");
		$(core).one('localization_init_complete',function(){
			$("#find_query_inputbox").attr("placeholder",core.module.localization.msg.msg_project_find_guide);
			$("#replace_query_inputbox").attr("placeholder",core.module.localization.msg.msg_project_replace_guide);
		});
		$(core).on('language_loaded',function(){
			$("#find_query_inputbox").attr("placeholder",core.module.localization.msg.msg_project_find_guide);
			$("#replace_query_inputbox").attr("placeholder",core.module.localization.msg.msg_project_replace_guide);
		});

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

				// Find/Replace
				//
				$('#g_far_btn_far').click(function() {
					self.handle_replace_and_find();
				});

				// Replace
				//
				$('#g_far_btn_replace').click(function() {
					self.handle_replace();
				});
				$('#far_use_regexp').click(function() {
					if (!$('#far_ignore_whitespace').hasClass('disabled')) {
						$('#far_ignore_whitespace').addClass('disabled');
						$('#far_match_case').addClass('disabled');
					} else {
						$('#far_ignore_whitespace').removeClass('disabled');
						$('#far_match_case').removeClass('disabled');
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

				// focus find inputbox by native javascript
				var moveCaretToEnd = function(el) {
					if (typeof el.selectionStart == "number") {
						el.selectionStart = el.selectionEnd = el.value.length;
					} else if (typeof el.createTextRange != "undefined") {
						el.focus();

						var range = el.createTextRange();
						range.collapse(false);
						range.select();
					}
				};

				var input_box = document.getElementById("find_query_inputbox");
				var input_box_onfocus = $.debounce(function() {
					moveCaretToEnd(input_box);
				}, 5);
				input_box.onfocus = function() {
					moveCaretToEnd(input_box);

					// Work around Chrome's little problem
					// window.setTimeout(function () {
					input_box_onfocus();
				};

				self.panel.on('hide.bs.modal', function() { // this part remove Donguk Kim 
					self.unmark();
					var window_manager = core.module.layout.workspace.window_manager;
					// Get current active_window's editor
					if (window_manager.window[window_manager.active_window].editor) {

						// Get current active_window's CodeMirror editor
						var editor = window_manager.window[window_manager.active_window].editor.editor;
						// jeongmin: remove all the highlights
						CodeMirror.commands.clearSearch(editor); // using codemirror search API (clearSearch function (cm)) -> see addon/search.js
					}
				});



				//
				self.panel.on('shown.bs.modal', function() {
					var window_manager = core.module.layout.workspace.window_manager;

					if(window_manager.window[window_manager.active_window].searching)	// jeongmin: only when searching
						core.dialog.search.unmark();	// jeongmin: remove search highlight

					$("#find_query_inputbox").focus();
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
		//	this.match_case = $('#far_match_case').parent().hasClass('checked');
		//	this.use_regexp = $('#far_use_regexp').parent().hasClass('checked');
		//	this.ignore_whitespace = $('#far_ignore_whitespace').parent().hasClass('checked');
		this.use_regexp = $("#far_use_regexp").hasClass("active");
		this.match_case = $("#far_match_case").hasClass("active");
		this.ignore_whitespace = $("#far_ignore_whitespace").hasClass("active");
	},

	find: function() {
		var window_manager = core.module.layout.workspace.window_manager;

		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window].editor) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query of this dialog
			var keyword = $("#find_query_inputbox").val();

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
		core.module.loading_bar.start("Searching......");
		var window_manager = core.module.layout.workspace.window_manager;
		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window].editor) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query of this dialog
			var keyword = $("#find_query_inputbox").val();
			// Call search function of goorm.core.file.findReplace with keyword and editor
			this.search_all(keyword, editor);
		} else {
			//var editor = window_manager.window[window_manager.active_window].editor.editor;
			// Get input query of this dialog
			var keyword = $("#find_query_inputbox").val();
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
			var keyword1 = $("#find_query_inputbox").val();
			var keyword2 = $("#replace_query_inputbox").val();
			// Call search function of goorm.core.file.findReplace with keyword and editor
			if (editor.getSelection() == "") {
				this.search(keyword1, editor);
				return;
			}
			this.replace(keyword1, keyword2, editor);
			this.search(keyword1, editor);
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
			var keyword1 = $("#find_query_inputbox").val();
			var keyword2 = $("#replace_query_inputbox").val();
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
			var keyword1 = $("#find_query_inputbox").val();
			var keyword2 = $("#replace_query_inputbox").val();
			// Call search function of goorm.core.file.findReplace with keyword and editor
			this.replace_all(keyword1, keyword2, editor);
		}
	},
	search: function(keyword, editor, direction) {
		if (!keyword)
			return;
		var text = keyword;
		var caseFold = true;
		var firstActive;
		this.set_options();

		if (this.use_regexp === true)
			try {
				text = RegExp(keyword, "g");
			} catch (e) {
				return;
			} else {
				if (this.match_case === true)
					caseFold = false;
				if (this.ignore_whitespace === true)
					text = text.replace(/\s*/g, '');
			}


		// this.unmark();

		// if (this.last_query != text)
		// 	this.last_pos = null;

		// var cursor = editor.getSearchCursor(text, editor.getCursor(), caseFold);
		// var window_manager = core.module.layout.workspace.window_manager;
		// firstActive = window_manager.active_window;

		if (direction == "previous") {
			CodeMirror.commands.findPrev(editor, true, text, caseFold);
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
			// 				}
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
		// window_manager.window[firstActive].activate();
		// editor.setSelection(cursor.from(), cursor.to());
		// this.replace_cursor = cursor;
		// this.last_query = text;
		// this.last_pos = cursor.to();
	},
	/* 트리뷰 만들어줘야됌 */
	search_all: function(keyword, editor) {
		if (!keyword) {
			core.module.loading_bar.stop();
			return;
		}
		var text = keyword;
		var caseFold = true;

		if (this.use_regexp === true)
			text = RegExp(keyword, "g");
		else {
			if (this.match_case === true)
				caseFold = false;
			if (this.ignore_whitespace === true)
				text = text.replace(/\s*/g, '');
		}
		var nodes = {};
		var window_manager = core.module.layout.workspace.window_manager;
		var firstActive;
		var searchedWords = [];

		this.unmark();
		core.dialog.search.query = keyword;
		firstActive = window_manager.active_window;

		if (this.find_on_workspace === true) {
			for (var i = 0; i < window_manager.window.length; i++) {
				if ((window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].filename).indexOf('terminal') != -1) {
					window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();
					continue;
				}
				window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();

				var node = {};
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

			for (var i = 0; i < window_manager.window.length; i++) {
				if ((window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].filename).indexOf('terminal') != -1) {
					window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();
					continue;
				}
				window_manager.window[(window_manager.active_window + 1) % window_manager.window.length].activate();
				editor = window_manager.window[window_manager.active_window].editor.editor;

				var cursor = editor.getSearchCursor(text, null, caseFold);
				if (!cursor.findNext()) {
					delete nodes[window_manager.window[window_manager.active_window].filepath + window_manager.window[window_manager.active_window].filename];
					continue;
				}
				// search all matched words and set background of them yellow
				for (cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {
					this.marked.push(editor.markText(cursor.from(), cursor.to(), {
						'className': 'cm-searched'
					}));

					var node = {};

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
			var node = {};
			node.filename = window_manager.window[window_manager.active_window].filename;
			node.filetype = window_manager.window[window_manager.active_window].filetype;
			node.filepath = window_manager.window[window_manager.active_window].filepath;
			node.matched_line = 1;
			node.expanded = false;
			node.type = "html";
			node.html = "";
			node.children = [];

			nodes[node.filepath + node.filename] = node;

			var cursor = editor.getSearchCursor(text, null, caseFold);
			if (!cursor.findNext()) {
				core.dialog.search.set_search_treeview(null);
				core.module.loading_bar.stop();
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

				var node = {};

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
		for (var i = searchedWords.length - 1; i > -1; i--) {
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
		core.module.loading_bar.stop();

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
			if (this.ignore_whitespace === true)
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

		var cursor = editor.getSearchCursor(text, editor.getCursor() || this.last_pos, caseFold);

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
			if (this.ignore_whitespace === true)
				text = text.replace(/\s*/g, '');
		}

		this.unmark();
		if (editor.getSelection() == "")
			return;
		this.search(keyword1, editor);
		this.search(keyword1, editor, "previous");
		if (editor.getSelection() == "")
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
			if (this.ignore_whitespace === true)
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
				yes_text: core.module.localization.msg.confirmation_yes,
				no_text: core.module.localization.msg.confirmation_no,
				yes: function() {
					for (var cursor = editor.getSearchCursor(text, null, caseFold); cursor.findNext();) {
						editor.replaceRange(replace, cursor.from(), cursor.to());
						core.module.search.replace_all(cursor.from().line, cursor.from().ch, cursor.to().line, cursor.to().ch, text, replace);
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

		$("#find_query_inputbox").val("");
		$("#replace_query_inputbox").val("");

		// Get current active_window's editor
		if (window_manager.window[window_manager.active_window] !== undefined) {


			this.panel.modal('show');
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor.editor;

			if (editor.getSelection() !== "") {
				$("#find_query_inputbox").val(editor.getSelection());
			}
		} else {
			alert.show(core.module.localization.msg.alert_cannot_exist_editor);
		}


		$("#far_match_case").tooltip();
		$("#far_ignore_whitespace").tooltip();
		$("#far_use_regexp").tooltip();
		$("#g_far_btn_find_prev").tooltip();
		$("#g_far_btn_find").tooltip();
		$("#find_query_inputbox").focus();

	}
};