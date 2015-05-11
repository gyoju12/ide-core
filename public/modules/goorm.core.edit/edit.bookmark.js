/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

//jeongmin: bookmark the line
goorm.core.edit.bookmark = function() {
	this.bookmarks = null;
	this.editor = null;
};

goorm.core.edit.bookmark.prototype = {
	//initialize bookmark. Jeong-Min Im.
	init: function(target, editor) {
		this.bookmarks = goorm.core.edit.bookmark_list.list[target] || {};
		this.editor = editor;
	},

	//toggle bookmark. Jeong-Min Im.
	toggle: function(new_bookmark_line) { // line that we want to set bookmark
		var is_added = true; // jeongmin: whether bookmark will be added or not
		var line = this.editor.set_bookmark(null, new_bookmark_line); //set bookmark and get bookmark line number

		if (this.bookmarks[line] == undefined) {//if bookmark line isn't in the list
			this.bookmarks[line] = ''; //add new bookmark to the window
		} else {
			delete this.bookmarks[line];
			is_added = false;
		}

		this.set_modified();
		this.outline_tab(is_added, line);
	},

	//find next bookmark. Jeong-Min Im.
	next: function() {
		var current_line = this.editor.editor.getCursor().line + 1; //get current cursor line
		////// extract only line from list //////
		var lines = Object.keys(this.bookmarks);

		if (lines.length) { //only current bookmark list is not undefined
			////// move to next line //////
			var index = lines.indexOf(current_line); //current line is in the list or not
			var length = lines.length; //number of active window's bookmarks

			if (index < 0) { //if current line is not in the list
				for (var i = 0; i < length; i++) { //find next bookmark from current line
					if (lines[i] > current_line) { //if there is bookmark that is bigger than current line
						this.move(lines[i]); //move to that bookmark

						return; //return this function
					}
				}

				this.move(lines[0]); //if can't find bigger line than current line, just move to first bookmark
			} else if (index == length - 1) { //current line is in the list, but this line is last index of the list
				this.move(lines[0]); //move to first bookmark
			} else { //current line is in the list and not the last index
				this.move(lines[index + 1]); //move to next index of the list
			}
		}

	},

	//find previous bookmark. Jeong-Min Im.
	prev: function() {
		var current_line = this.editor.editor.getCursor().line + 1; //get current cursor line
		////// extract only line from list //////
		var lines = Object.keys(this.bookmarks);

		if (lines.length) { //only current bookmark list is not undefined
			////// move to next line //////
			var index = lines.indexOf(current_line); //current line is in the list or not
			var length = lines.length; //number of active window's bookmarks

			if (index < 0) { //if current line is not in the list
				for (var i = length; 0 <= i; i--) { //find next bookmark from current line
					if (lines[i] < current_line) { //if there is bookmark that is smaller than current line
						this.move(lines[i]); //move to that bookmark

						return; //return this function
					}
				}

				this.move(lines[length - 1]); //if can't find smaller line than current line, just move to last bookmark
			} else if (index == 0) { //current line is in the list, but this line is first index of the list
				this.move(lines[length - 1]); //move to last bookmark
			} else { //current line is in the list and not the first index
				this.move(lines[index - 1]); //move to previous index of the list
			}
		}

	},

	//clear all bookmarks. Jeong-Min Im.
	clear: function() {
		this.editor.editor.clearGutter('bookmark'); //send loaded bookmark list and set those
		this.bookmarks = {}; //delete this window from the list

		this.set_modified();
		this.outline_tab();
	},

	//move cursor to bookmark. Jeong-Min Im.
	move: function(linenumber) {
		var bookmark_rows = $('#bookmark_table').children();
		var current_row = bookmark_rows.has('#bookmark_line_' + linenumber);

		bookmark_rows.removeClass('current_bookmark_row');
		current_row.addClass('current_bookmark_row');

		$(document).off('mousedown.bookmark');
		$(document).one('mousedown.bookmark', function() {
			bookmark_rows.removeClass('current_bookmark_row');
		});

		$('#bookmark_tab_list').scrollTop(current_row[0].offsetTop);

		if (typeof(linenumber) == 'string') { //if linenumber is string type
			var keyword = linenumber.split('_').pop(); //find real line number from the string

			this.editor.editor.setCursor(parseInt(keyword, 10) - 1, 0); //set cursor to the parsed integer keyword
			CodeMirror.commands.showInCenter(this.editor.editor);
		} else {//linenumber is number type
			this.editor.editor.setCursor(linenumber - 1, 0); //set cursor to the line
			CodeMirror.commands.showInCenter(this.editor.editor);
		}
	},

	//make bookmark list in the outline tab. Jeong-Min Im.
	outline_tab: function(is_added, target_line) {
		var is_there = false; //'No Bookmark' sign is in the list or not
		var self = this;
		var lines = Object.keys(this.bookmarks);
		var bookmark_table = $('#bookmark_table');
		var cm = this.editor.editor;
		var font_family = core.preference['preference.editor.font_family'];

		if (lines.length > 0) {
			// make outline form and append it to outline tab. Jeong-Min Im.
			var add_bookmark_to_outline = function(line) {
				var comment = self.bookmarks[line];
				var text = cm.getLine(line - 1);

				if (line) {
					////// making row //////
					var i = lines.indexOf(line.toString());

					var bookmark_elmnt = '<tr><td id="bookmark_line_' + line + '" class="bookmark_line" style="font-family:' + font_family + '">' + line + '</td><td><div id="bookmark_text_' + line + '" class="bookmark_text col-md-11 margin-0px padding-0px" style="font-family:' + font_family + '"></div><button type="button" id="delete_bookmark_' + line + '" class="close" aria-hidden="true">&times;</button></td></tr>';
					if (i === 0) {
						bookmark_table.prepend(bookmark_elmnt);
					} else {
						bookmark_table.children().eq(i - 1).after(bookmark_elmnt);
					}

					////// delete bookmark button handler //////
					$('#delete_bookmark_' + line).click(function(e) {
						e.stopPropagation();
						self.toggle(parseInt($(this).attr('id').split('_').pop(), 10));
					});

					////// give some effects //////
					if (text) {
						CodeMirror.runMode(text, cm.options.mode, $('#bookmark_text_' + line).get(0)); //syntax highlighting
					}

					$('#bookmark_line_' + line).parent().click(function() {
						var _line = $(this).find('.bookmark_line').attr('id').split('_').pop(); // extract line from bookmark_line

						cm.setCursor(_line - 1);
						CodeMirror.commands.showInCenter(cm);
					});

					////// add comment //////
					self.add_comment(line, comment);
				}
			};

			// jeongmin: if same window, just add bookmark item to outline
			if (target_line) {
				if (bookmark_table.find('[localization_key=edit_no_bookmark]').length > 0) { // jeongmin: remove 'no bookmarks' message
					bookmark_table.find('[localization_key=edit_no_bookmark]').parent().remove();
				}

				if (is_added) { // add bookmark
					add_bookmark_to_outline(target_line);

					////// make it prettier //////
					$('.bookmark_text').css('font-family', font_family);
				} else { // delete bookmark
					$('#delete_bookmark_' + target_line).off('click'); // unbind delete bookmark button handler
					$('#bookmark_line_' + target_line).off('click'); // unbind go to line handler
					$('#bookmark_text_' + target_line).off('click'); // unbind comment toggle handler

					bookmark_table.find('#bookmark_line_' + target_line).parent().remove(); // delete row
				}
			} else {
				bookmark_table.empty();
				var keys = Object.keys(this.bookmarks);
				for (var i = 0; i < keys.length; i++) {
					add_bookmark_to_outline(keys[i]);
				}
				$('.bookmark_text').css('font-family', font_family);
			}

		} else {
			goorm.core.edit.bookmark_list.clear_outline_tab();
		}

	},

	// add comment. Jeong-Min Im.
	add_comment: function(line, new_comment) {
		////// make comment place //////
		$('#bookmark_text_' + line).parent().append('<div class="well well-sm" id="comment_text_' + line + '" localization_key="profile_comment"></div>');

		var self = this;
		var comment_place = $('#bookmark_text_' + line).siblings('.well');
		var placeholder = core.module.localization.msg.profile_comment;

		////// write comment //////
		if (new_comment && new_comment != '') {
			comment_place.html(this.filtering(new_comment));
		} else {
			comment_place.html(this.filtering(placeholder));
		}

		////// comment place click event handler //////
		comment_place.mousedown(function(e) {
			e.stopPropagation();
			if (e.which == 1) { // left click
				////// input space //////
				$(this).parent().append('<input type="text" class="well form-control" placeholder="Comment"/>');

				var $form_control = $(this).siblings('.form-control'); // comment input space
				var comment = '';

				////// make it editable //////
				if ($(this).html() == placeholder) {
					comment = ''; // no comment
				} else {
					comment = $(this).html(); //old comment
				}

				$form_control.val(self.de_filtering(comment));

				////// remove //////
				$(this).remove(); // well

				////// ready to get input //////
				$form_control.focus();

				////// save comment //////
				$form_control.keydown(function(e) {
					if (e.keyCode == 13) { //enter
						comment = $(this).val();

						$(this).blur();
					} else if (e.keyCode == 27) {//esc
						$(this).blur(); // cancel
					}
				});

				////// disappearing input space. Jeong-Min Im. //////
				$form_control.blur(function() {
					self.bookmarks[line] = comment;
					self.set_modified();

					$(this).remove(); //commentary done

					////// set back to comment place //////
					self.add_comment(line, comment);
				});
			} else if (e.which == 3 && $(this).html() != placeholder) { // right click. If it is placeholder now, don't show context menu.
				self.who_clicked = this; // save who this is
				goorm.core.edit.bookmark_list.context_menu.show(e);
			} else {
				goorm.core.edit.bookmark_list.context_menu.hide(e);
			}

			return false; // stop propagation
		});
	},

	// delete comment. Jeong-Min Im.
	delete_comment: function() {
		////// removing //////
		var line = $(this.who_clicked).attr('id').split('_').pop(); // get checked line

		this.bookmarks[line] = '';
		this.set_modified();

		$('#comment_text_' + line).html(core.module.localization.msg.profile_comment); // initialize well

		this.who_clicked = null; // initialize
	},

	// escape special character (prevent inserting code in input space). Jeong-Min Im.
	filtering: function(data) {
		if (data) {
			data = decodeURIComponent(data);
			data = ((data.replace(/&/g, '&amp;')).replace(/\"/g, '&quot;')).replace(/\'/g, '&#39;');
			data = data.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		}

		return data;
	},

	// after filtering, re-insert original character. Jeong-Min Im.
	de_filtering: function(data) {
		if (data) {
			data = data.replace('&lt;', '<').replace('&gt;', '>');
			data = ((data.replace('&amp;', '&')).replace('&quot;', '"')).replace('&#39;', "'");
		}

		return data;
	},

	set_modified: function() {
		var editor_parent = this.editor.parent;

		if (editor_parent && editor_parent.tab) {
			editor_parent.set_modified();
			editor_parent.tab.set_modified();
		}
	}
};
