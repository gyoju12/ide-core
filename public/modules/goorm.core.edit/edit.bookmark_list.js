/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.edit.bookmark_list = { //initialize bookmark. Jeong-Min Im.
	list: {},

	init: function() {
		var self = this;
		var bookmark_contents = $('#bookmark_contents');

		this.load_json();
		this.window_manager = core.module.layout.workspace.window_manager;

		//when bookmark hover, load bookmark of current active window. Jeong-Min Im.

		$(core).on('bookmark_hover', function() {

			self.remove(); //first, remove all bookmarks from main menu
			var editor = self.get_active_editor();
			if (editor !== null) {
				$('#child_bookmark_menu li[class=disabled]').remove(); //remove default bookmark list
				var keys = Object.keys(editor.bookmark.bookmarks);
				if (keys.length > 0) {
					for (var i = keys.length - 1; i >= 0; i--) {
						self.add(keys[i]);
					}
				} else {
					// $("#bookmark_list").after("<li class='disabled'><a href=\"#\" localization_key='edit_no_bookmark'>(No Bookmarks)</a></li>"); //attach default bookmark list
					core.module.localization.local_apply('#child_bookmark_menu', 'menu');
				}
			} else {
				// $("#bookmark_list").after("<li class='disabled'><a href=\"#\" localization_key='edit_no_bookmark'>(No Bookmarks)</a></li>"); //attach default bookmark list
				core.module.localization.local_apply('#child_bookmark_menu', 'menu');
			}
		});

		$(window).on('unload', function() {
			localStorage.setItem('bookmark', JSON.stringify(self.list)); //set bookmark in the localStorage
		});

		//when editor is loaded, load bookmark from localStorage. Jeong-Min Im.
		$(core).on('editor_loaded', function(e, file) {
			var _window = self.window_manager.get_window(file.filepath, file.filename);
			if (_window && _window.editor) {
				if (self.list[_window.editor.title]) { //only current bookmark list is not undefined
					_window.editor.set_bookmark(self.list[_window.editor.title]); //send loaded bookmark list and set those
				}
				$(core).trigger('bookmark_table_refresh');
			}
		});

		//when active editor is changed, refresh bookmark table in outline tab. Jeong-Min Im.
		$(core).on('bookmark_table_refresh', function() {
			var editor = self.get_active_editor();
			if (editor !== null) {
				editor.bookmark.outline_tab();
			} else {
				self.clear_outline_tab();
			}
		});

		// modify comment. Jeong-Min Im.
		// $('#bookmark_table').on('click', '.well', function() {
		// 	$(this).siblings('.bookmark_text').click();
		// });

		/** collapse is removed
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
		**/

		//useonly(mode=goorm-standalone,goorm-server)
		////// make bookmark tab resizable //////
		bookmark_contents.resizable({
			disabled: true
		}); // initialize resizable
		bookmark_contents.resizable('enable');
		//useonlyend

		////// add context menu //////
		this.context_menu = new goorm.core.menu.context();
		this.context_menu.init(null, 'bookmark.context', $('#bookmark_contents'), '', null);

		// make bookmark list height adaptable. Jeong-Min Im.

		$(document).on('click', '#gLayoutTab_Bookmark', function() {
			// $(core).trigger('layout_resized');
			self.resize();
		});
		$(core).on('layout_resized', function() {
			// var container_height = $('#goorm_inner_layout_right').height() - 28;
			// bookmark_contents.css('height', container_height - bookmark_tab.find('.panel-heading').outerHeight());
			self.resize();
		});

		$('#main-submenu-bookmark').hover(function() {
			$(core).trigger('bookmark_hover');
		});
	},
	//add bookmark on mainmenu. Jeong-Min Im.
	add: function(linenumber) {
		var self = this;
		// $("#bookmark_list").after("<li><a href=\"#\" action=\"bookmark_" + linenumber + "\">Line " + linenumber + "</a></li>");

		$('[action=bookmark_' + linenumber + ']').unbind('click');
		$('[action=bookmark_' + linenumber + ']').click(function() {
			var editor = self.get_active_editor();
			if (editor !== null) {
				editor.bookmark.move($(this).attr('action'));
			}
		});
	},

	//remove bookmark from mainmenu. Jeong-Min Im.
	remove: function(linenumber) {
		if (!linenumber) { //if linenumber is not selected exactly
			$('[action^=bookmark_]').unbind('click'); //remove all bookmark actions
			$('[action^=bookmark_]').parent().remove(); //remove all bookmarks from main menu
		} else { //if linenumber is selected exactly
			$('[action=bookmark_' + linenumber + ']').unbind('click'); //remove that bookmark action
			$('[action=bookmark_' + linenumber + ']').parent().remove(); //remove that bookmark action
		}
	},
	//load bookmark json file. Jeong-Min Im.
	load_json: function() {
		var data = (localStorage.getItem('bookmark') && localStorage.getItem('bookmark') != 'null' && localStorage.getItem('bookmark') != 'undefined') ? localStorage.getItem('bookmark') : '{}'; //get bookmark from localStorage
		this.list = JSON.parse(data); //parse json
	},
	get_active_editor: function() {
		var w = null;
		var window_manager = goorm.core.window.manager;

		if (window_manager.active_window != -1 && window_manager.window[window_manager.active_window] && window_manager.window[window_manager.active_window].editor) {
			w = window_manager.window[window_manager.active_window].editor;
		}

		return w;
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
			data = ((data.replace('&amp;', '&')).replace('&quot;', '"')).replace('&#39;', '\'');
		}

		return data;
	},
	clear_outline_tab: function() {
		var bookmark_table = $('#bookmark_table');
		bookmark_table.empty();
		bookmark_table.prepend('<tr><td class="padding-10px" localization_key="edit_no_bookmark">' + core.module.localization.msg.edit_no_bookmark + '</td></tr>');

	},
	resize: function() {
		// use constant value because height() is 0 when the element is being drawn
		var container_height = $('#goorm_inner_layout_right').height() - 28; // #28 is tab height
		$('#bookmark_contents').css('height', container_height - 36); // #36 is head height
	},
	delete_project_bookmarks: function(delete_project_path) {
		for (var mark in this.list) {
			if (mark.split('/')[0] == delete_project_path) {
				delete this.list[mark];
			}
		}
	}
};
