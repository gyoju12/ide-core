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
goorm.core.edit.bookmark = {
	//initialize bookmark. Jeong-Min Im.
	init: function() {
		var self = this,
			is_there = false, //default bookmark list flag(default or not)
			bookmark_tab = $('#bookmark_tab'),
			bookmark_tab_list = $('#bookmark_tab_list'),
			bookmark_contents = $('#bookmark_contents');

		this.load_json();
		this.window_manager = core.module.layout.workspace.window_manager;

		//when bookmark hover, load bookmark of current active window. Jeong-Min Im.
		$(core).on("bookmark_hover", function() {
			self.remove(); //first, remove all bookmarks from main menu

			if (self.get_active_editor()) { //only when current active window and its editor is valid
				if (self.list[self.target]) { //only current bookmark list is not undefined
					$("#child_bookmark_menu li[class=disabled]").remove(); //remove default bookmark list

					is_there = false; //initialize default bookmark list flag

					////// add bookmarks to the menu //////
					var temp = [];
					for (var line in self.list[self.target]) //bookmark is added in reverse order..
						temp.push(line);
					for (var i = temp.length - 1; 0 <= i; i--) //so fix it
						self.add(temp[i]);

				} else if (!is_there) { //there aren't bookmarks. And do this only one time
					$("#bookmark_list").after("<li class='disabled'><a href=\"#\" localization_key='edit_no_bookmark'>(No Bookmarks)</a></li>"); //attach default bookmark list
					core.module.localization.local_apply("#child_bookmark_menu", "menu");
					is_there = true; //set default bookmark list flag
				}
			} else if (!is_there) { //there aren't bookmarks. And do this only one time
				$("#bookmark_list").after("<li class='disabled'><a href=\"#\" localization_key='edit_no_bookmark'>(No Bookmarks)</a></li>"); //attach default bookmark list
				core.module.localization.local_apply("#child_bookmark_menu", "menu");
				is_there = true; //set default bookmark list flag
			}
		});

		//when editor is loaded, load bookmark from localStorage. Jeong-Min Im.
		$(core).on("editor_loaded", function(e, file) {
			var _window = self.window_manager.get_window(file.filepath, file.filename);
			if (_window && _window.editor) {
				self.active_editor = self.window_manager.get_window(file.filepath, file.filename).editor; //current active window's editor
				self.target = self.active_editor.title; //active window's filepath

				if (self.list[self.target]) //only current bookmark list is not undefined
					self.active_editor.set_bookmark(self.list[self.target]); //send loaded bookmark list and set those
				$(core).trigger("bookmark_table_refresh");
			}
		});

		//when active editor is changed, refresh bookmark table in outline tab. Jeong-Min Im.
		$(core).on("bookmark_table_refresh", function() {
			self.outline_tab();
		});

		// modify comment. Jeong-Min Im.
		// $('#bookmark_table').on('click', '.well', function() {
		// 	$(this).siblings('.bookmark_text').click();
		// });

		// reverse caret direction whether collapse is opened or not. Jeong-Min Im.
		bookmark_tab_list.on('show.bs.collapse', function() {
			bookmark_tab.find('.caret').addClass('caret_reverse');

			////// control table height. Jeong-Min Im. //////
			bookmark_tab_list.addClass('force_full_height'); // add important
			bookmark_contents.removeClass('force_full_height');
		});
		bookmark_tab_list.on('hide.bs.collapse', function() {
			bookmark_tab.find('.caret').removeClass('caret_reverse');

			////// control table height. Jeong-Min Im. //////
			bookmark_tab_list.removeClass('force_full_height'); // remove important
			bookmark_contents.addClass('force_full_height'); // follow collapsing
		});

		

		// make bookmark list height adaptable. Jeong-Min Im.
		$(core).on('layout_resized', function() {
			bookmark_tab_list.css('max-height', ($('#outline').height() / 2) - bookmark_tab.find('.panel-heading').outerHeight());
		});
	},

	get_active_editor: function() {
		var w = null;

		if (this.window_manager.active_window != -1 && this.window_manager.window[this.window_manager.active_window] && this.window_manager.window[this.window_manager.active_window].editor) {
			w = this.window_manager.window[this.window_manager.active_window].editor;

			this.active_editor = w; //get current active window's editor
			this.editor = w.editor;
			this.target = w.title; //get active window's path
		}

		return w;
	},

	//toggle bookmark. Jeong-Min Im.
	toggle: function(new_bookmark_line) { // line that we want to set bookmark
		if (this.get_active_editor()) { //only when current active window and its editor is valid
			var is_added = true; // jeongmin: whether bookmark will be added or not

			var line = this.active_editor.set_bookmark(null, new_bookmark_line); //set bookmark and get bookmark line number

			if (!this.list[this.target]) { //if current active window doesn't have any bookmarks, so doesn't exist in the list
				this.list[this.target] = {}; //add current active window id to the list and this window's new bookmark
				this.list[this.target][line] = ""; //this object will be formed like this -> line: comment. e.g. 3: "error"
			} else if (this.list[this.target][line] == undefined) //if current active window has bookmark, so exists in the list and if bookmark line isn't in the list
				this.list[this.target][line] = ""; //add new bookmark to the window
			else { //if bookmark line is in the list
				delete this.list[this.target][line]; //remove this bookmark from the list

				if (Object.keys(this.list[this.target]).length == 0) { //if there is no bookmark in this window
					delete(this.list[this.target]); //delete this window from the list
				}

				is_added = false;
			}

			// object sorts itself automatically, so no need to do this
			// if(this.list[this.target]) {	//only current bookmark list is not undefined
			// 	this.list[this.target].sort(function (left, right) {	//next, sort array into numerical descending order
			// 		return left - right;
			// 	});
			// }

			this.store_json();
			this.outline_tab(is_added, line);
		}
	},

	//find next bookmark. Jeong-Min Im.
	next: function() {
		if (this.get_active_editor()) {
			var current_line = this.editor.getCursor().line + 1; //get current cursor line

			if (this.list[this.target]) { //only current bookmark list is not undefined
				////// extract only line from list //////
				var lines = [];
				for (var key in this.list[this.target])
					lines.push(key);

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
		}
	},

	//find previous bookmark. Jeong-Min Im.
	prev: function() {
		if (this.get_active_editor()) {
			var current_line = this.editor.getCursor().line + 1; //get current cursor line

			if (this.list[this.target]) { //only current bookmark list is not undefined
				////// extract only line from list //////
				var lines = [];
				for (var key in this.list[this.target])
					lines.push(key);

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
		}
	},

	//clear all bookmarks. Jeong-Min Im.
	clear: function() {
		if (this.get_active_editor()) {
			if (this.list[this.target]) { //only current bookmark list is not undefined
				this.editor.clearGutter("bookmark"); //send loaded bookmark list and set those

				delete(this.list[this.target]); //delete this window from the list
			}
		}

		this.store_json();
		this.outline_tab();
	},

	//move cursor to bookmark. Jeong-Min Im.
	move: function(linenumber) {
		if (typeof(linenumber) == "string") { //if linenumber is string type
			var keyword = linenumber.split("_").pop(); //find real line number from the string

			this.active_editor.editor.setCursor(parseInt(keyword, 10) - 1, 0); //set cursor to the parsed integer keyword
		} else //linenumber is number type
			this.active_editor.editor.setCursor(linenumber - 1, 0); //set cursor to the line
	},

	//add bookmark on mainmenu. Jeong-Min Im.
	add: function(linenumber) {
		$("#bookmark_list").after("<li><a href=\"#\" action=\"bookmark_" + linenumber + "\">Line " + linenumber + "</a></li>");

		$("[action=bookmark_" + linenumber + "]").unbind("click");
		$("[action=bookmark_" + linenumber + "]").click(function() {
			core.module.bookmark.move($(this).attr("action"));
		});
	},

	//remove bookmark from mainmenu. Jeong-Min Im.
	remove: function(linenumber) {
		if (!linenumber) { //if linenumber is not selected exactly
			$("[action^=bookmark_]").unbind("click"); //remove all bookmark actions
			$("[action^=bookmark_]").parent().remove(); //remove all bookmarks from main menu
		} else { //if linenumber is selected exactly
			$("[action=bookmark_" + linenumber + "]").unbind("click"); //remove that bookmark action
			$("[action=bookmark_" + linenumber + "]").parent().remove(); //remove that bookmark action
		}
	},

	//load bookmark json file. Jeong-Min Im.
	load_json: function() {
		var data = (localStorage.getItem('bookmark') && localStorage.getItem('bookmark') != 'null' && localStorage.getItem('bookmark') != 'undefined') ? localStorage.getItem('bookmark') : "{}"; //get bookmark from localStorage

		this.list = JSON.parse(data); //parse json
	},

	//store bookmark at json file. Jeong-Min Im.
	store_json: function() {
		localStorage.setItem('bookmark', JSON.stringify(this.list)); //set bookmark in the localStorage
	},

	//make bookmark list in the outline tab. Jeong-Min Im.
	outline_tab: function(is_added, target_line) {
		var is_there = false, //'No Bookmark' sign is in the list or not
			$bookmark_table = $("#bookmark_table"),
			self = this;

		////// making //////
		if (this.get_active_editor()) {
			var cm = this.editor;
			var target = this.target;

			if (this.list[target]) {
				is_there = false; //initialize 'No bookmark' flag

				// make outline form and append it to outline tab. Jeong-Min Im.
				function add_bookmark_to_outline(line) {
					var comment = self.list[target][line],
						text = cm.getLine(line - 1);

					if (line) {
						////// making row //////
						var delete_button = '<button type="button" id="delete_bookmark_' + line + '" class="close" aria-hidden="true">&times;</button>';
						var lines = [];// Object.keys(self.list[target]);
						$bookmark_table.find(".bookmark_line").each(function(){lines.push($(this).text())});
						for(var i = lines.length - 1; i>=0; i--){
							if(lines[i]<line){
								break;
							}
						}
						if(i == -1){
							$bookmark_table.prepend('<tr><td id="bookmark_line_' + line + '" class="bookmark_line">' + line + '</td><td><div id="bookmark_text_' + line + '" class="bookmark_text col-md-11"></div>' + delete_button + '</td></tr>');
						} else {
							$bookmark_table.children().eq(i).after('<tr><td id="bookmark_line_' + line + '" class="bookmark_line">' + line + '</td><td><div id="bookmark_text_' + line + '" class="bookmark_text col-md-11"></div>' + delete_button + '</td></tr>');
						}

						////// delete bookmark button handler //////
						$('#delete_bookmark_' + line).click(function() {
							self.toggle(parseInt($(this).attr('id').split('_').pop()));
						});

						////// give some effects //////
						if (text) {
							CodeMirror.runMode(text, cm.options.mode, $("#bookmark_text_" + line).get(0)); //syntax highlighting
						}

						$("#bookmark_line_" + line).click(function() {
							var _line = $(this).attr('id').split('_').pop(); // extract line from bookmark_line

							cm.setCursor(_line - 1);
						});
						$("#bookmark_text_" + line).click(function() {
							var _line = $(this).attr('id').split('_').pop(); // extract line from bookmark_line

							cm.setCursor(_line - 1);
						});

						////// add comment //////
						self.add_comment(line, comment, target);
					}
				}

				// jeongmin: if same window, just add bookmark item to outline
				if (this.window_target == target && target_line) {
					if ($bookmark_table.find('[localization_key=edit_no_bookmark]').length > 0) { // jeongmin: remove 'no bookmarks' message
						$bookmark_table.find('[localization_key=edit_no_bookmark]').parent().remove();
					}

					if (is_added) { // add bookmark
						add_bookmark_to_outline(target_line);

						////// make it prettier //////
						var font = $("[path='" + target + "'] .CodeMirror").css("font-family");
						$(".bookmark_text").css("font-family", font);
					} else { // delete bookmark
						$('#delete_bookmark_' + target_line).off('click'); // unbind delete bookmark button handler
						$('#bookmark_line_' + target_line).off('click'); // unbind go to line handler
						$('#bookmark_text_' + target_line).off('click'); // unbind comment toggle handler

						$bookmark_table.find('#bookmark_line_' + target_line).parent().remove(); // delete row
					}
				} else { // jeongmin: different window target with before
					this.window_target = target;

					////// initialize //////
					$bookmark_table.empty();

					////// adding bookmarks //////
					for (var key in this.list[target]) {
						add_bookmark_to_outline(key);
					}

					////// make it prettier //////
					var font = $("[path='" + target + "'] .CodeMirror").css("font-family");
					$(".bookmark_text").css("font-family", font);
				}
			} else if (!is_there) { //if there is no bookmarks and no sign of it
				////// initialize //////
				$bookmark_table.empty();

				$bookmark_table.prepend('<tr><td localization_key="edit_no_bookmark">' + core.module.localization.msg.edit_no_bookmark + '</td></tr>');

				is_there = true; //now there is no bookmark sign
			}
		} else if (!is_there) { //if there is no bookmarks and no sign of it
			////// initialize //////
			$bookmark_table.empty();

			$bookmark_table.prepend('<tr><td localization_key="edit_no_bookmark">' + core.module.localization.msg.edit_no_bookmark + '</td></tr>');

			is_there = true; //now there is no bookmark sign
		}
	},

	// add comment. Jeong-Min Im.
	add_comment: function(line, new_comment, active_window) {
		////// make comment place //////
		$("#bookmark_text_" + line).parent().append('<div class="well well-sm" id="comment_text_' + line + '"></div>');

		var self = this,
			comment_place = $("#bookmark_text_" + line).siblings('.well'),
			placeholder = 'Comment...';

		////// write comment //////
		if (new_comment && new_comment != '')
			comment_place.html(this.filtering(new_comment));
		else
			comment_place.html(this.filtering(placeholder));

		////// add context menu //////
		var context_menu = new goorm.core.menu.context();
		context_menu.init(null, 'bookmark.context', comment_place, "", null);

		////// comment place click event handler //////
		comment_place.mousedown(function(e) {
			if (e.which == 1) { // left click
				////// input space //////
				$(this).parent().append('<input type="text" class="form-control" placeholder="Comment"/>');

				var $form_control = $(this).siblings('.form-control'), // comment input space
					comment = "";

				////// make it editable //////
				if ($(this).html() == placeholder)
					comment = ''; // no comment
				else
					comment = $(this).html(); //old comment
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
					} else if (e.keyCode == 27) //esc
						$(this).blur(); // cancel
				});

				////// disappearing input space. Jeong-Min Im. //////
				$form_control.blur(function() {
					self.list[active_window][line] = comment;
					self.store_json();

					$(this).remove(); //commentary done

					////// set back to comment place //////
					self.add_comment(line, comment, active_window);
				});
			} else if (e.which == 3 && $(this).html() != placeholder) { // right click. If it is placeholder now, don't show context menu.
				self.who_clicked = this; // save who this is
				context_menu.show(e);
			} else
				context_menu.hide(e);

			return false; // stop propagation
		});
	},

	// delete comment. Jeong-Min Im.
	delete_comment: function() {
		////// removing //////
		var line = $(this.who_clicked).attr('id').split('_').pop(); // get checked line

		this.list[this.target][line] = "";
		this.store_json();

		$('#comment_text_' + line).html('Comment...'); // initialize well

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
	}
};
