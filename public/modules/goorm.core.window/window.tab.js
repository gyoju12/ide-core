/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.window.tab = function() {
	this.tab_list_id = '';
	this.tab_content_id = '';
	this.tabview = null;
	this.list_menu = null;
	this.tab = null;
	this.menuitem = null;
	this.window = null;
	this.context_menu = null;
	this.title = null;
	this.is_saved = null;
	this.tab_count = 0;
	this.tab_width = 80;
	this.undo_depth = 0;
	this.done = null;
	this.title = null;
	this.filename = null;
	this.filepath = null;
};

goorm.core.window.tab.prototype = {

	init: function(__options) {
		var self = this;

		var options = __options || {};

		this.is_saved = true;
		this.undo_depth = 0;
		this.done = [];
		// this.tabview = tabview;
		// this.list_menu = list_menu;
		this.title = options.title || "";
		this.filename = options.filename || options.title; // jeongmin: in case of url, filename is undefined. So, put title instead.
		this.filepath = options.filepath;

		//bootstrap start
		//var morphed_title = this.title.split("/").join("_").split(".").join("_").split(":").join("_");

		// changed to timestamp. not using file path anymore for window id
		var morphed_title = options.id;

		this.tab_list_id = "g_window_tab_" + morphed_title;
		this.tab_content_id = "g_wndw_tab_ctnt_" + morphed_title;
		
		var tooltip_contents = this.title;
		var chunks = [];
		var chunkSize = 40;
		
		if (tooltip_contents.length > chunkSize) {
			while (tooltip_contents) {
				if (tooltip_contents.length < chunkSize) {
					chunks.push(tooltip_contents);
					break;
				}
				else {
					chunks.push(tooltip_contents.substr(0, chunkSize));
					tooltip_contents = tooltip_contents.substr(chunkSize);
				}
			}
			
			tooltip_contents = chunks.join("\n");
		}
				
		if (typeof core.status.current_opened_list[this.filename] === "undefined") {
			$("#g_window_tab_list").append("<li class='g_windows_tab_li'><a id='g_window_tab_" + morphed_title + "' href='#g_wndw_tab_ctnt_" + morphed_title + "' data-toggle='tooltip tab' data-placement='top' data-original-title='" + tooltip_contents + "' data-container='body' class='goorm_tab_menu'><span class='tab_option'></span><div class='panel_image window_tab-toolbar-disconnect' tabindex='-1'><i class='fa fa-share-alt'></i></div><span class='tab_title' id='tab_title_" + morphed_title + "' filename='" + this.filename + "' filepath='" + this.filepath + "'>" + this.filename + "</span><button class='tab_restore_button' type='button'><i class='fa fa-square-o'></i></button><button class='close tab_close_button' id='close_tab_" + morphed_title + "' type='button'><i class='fa fa-times'></i></button><button class='tab_modified_button tab_close_button' type='button'><i class='fa fa-circle'></i></button></a></li>"); // jeongmin: put tab_option before file_name	
			core.status.current_opened_list[this.filename] = 1;
		} else {
			$("#g_window_tab_list").append("<li class='g_windows_tab_li'><a id='g_window_tab_" + morphed_title + "' href='#g_wndw_tab_ctnt_" + morphed_title + "' data-toggle='tooltip tab' data-placement='top' data-original-title='" + tooltip_contents + "' data-container='body' class='goorm_tab_menu'><span class='tab_option'></span><div class='panel_image window_tab-toolbar-disconnect' tabindex='-1'><i class='fa fa-share-alt'></i></div><span class='tab_title' id='tab_title_" + morphed_title + "' filename='" + this.filename + "' filepath='" + this.filepath + "'>" + this.filename + " - " + this.filepath + "</span><button class='tab_restore_button' type='button'><i class='fa fa-square-o'></i></button><button class='close tab_close_button' id='close_tab_" + morphed_title + "' type='button'><i class='fa fa-times'></i></button><button class='tab_modified_button tab_close_button' type='button'><i class='fa fa-circle'></i></button></a></li>"); // jeongmin: put tab_option before file_name		
			core.status.current_opened_list[this.filename] ++;
		}


		$("#g_window_tab_contents").append("<div class='tab-pane' id='g_wndw_tab_ctnt_" + morphed_title + "'></div>");
		if (core.status.current_project_name != "eduWeb") {
			self.set_tooltip(morphed_title); // Tooltip - Donguk Kim	
		}


		var cnt = core.status.current_opened_list[this.filename];
		if (cnt > 0) { // Donguk Kim : File Name Duplication Check & File Path Adding
			var temp = $("#g_window_tab_list").find('.tab_title[filename$="' + this.filename + '"]');
			if (temp) {
				if (cnt == 1) {
					var name = temp.attr("filename");
					var path = temp.attr("filepath").split("/")[0];
					var current_project_path = core.status.current_project_path;
					if(path != current_project_path) {
						temp.html(name + " - " + temp.attr("filepath"));
					} else {
						temp.html(name);	
					}
				} else if (cnt > 1) {
					temp.each(function(index) {
						var path = $(this).attr("filepath");
						var name = $(this).attr("filename");
						$(this).html(name + " - " + path);
					});
				}
			}
		}

		//bootstrap end

		$("#g_window_tab_" + morphed_title).click(function() {
			$("#g_window_" + morphed_title).dialog("moveToTop");
			//self.window.panel.mousedown();
			self.window.activate();
		});

		$("#" + this.tab_list_id + " .tab_close_button").click(function() {
			// core.module.layout.workspace.window_manager.close_by_index(self.window.index, self.window.index);
			// self.close();
			// self.window.close();
			$('.tooltip').remove(); // tooltip remove : Donguk Kim
			self.window.panel.siblings('.ui-dialog-titlebar').find('.ui-dialog-titlebar-close').click(); // jeongmin: for showing confirmation_save dialog
		});

		$('#' + this.tab_list_id + " .tab_restore_button").click(function() {
			var wm = core.module.layout.workspace.window_manager;

			if (wm.maximized) {
				core.module.layout.workspace.window_manager.unmaximize_all();
			} else {
				self.window.restore();
			}
		});


		this.tab = $("#g_window_tab_" + morphed_title);

		////// jeongmin: initialize context menu //////
		this.context_menu = new goorm.core.menu.context();
		this.context_menu.init(null, "window.tab", this.tab, this.title.replace('.', '_'));
		// tab context menu. Jeong-Min Im.
		this.tab.mousedown(function(e) {
			if (e.which == 3) { // right click and only for workspace_tab_list
				self.context_menu.show(e);

				////// save who is clicked for doing context menu's action //////
				var wm = core.module.layout.workspace.window_manager;
				wm.tab_manager.clicked_window = self;
			}
		});

		/* TODO : above codes is converted to use bootstrap */

		this.tab_manager = core.module.layout.workspace.window_manager.tab_manager;

		this.move = new goorm.core.window.tab.move();
		this.move.init(this);


		// when click tab, window panel restore...
		var window_manager = core.module.layout.workspace.window_manager;
		$(this.tab).dblclick(function() {
			var panel = self.window.panel;
			if (!window_manager.maximized)
				panel.dialogExtend("restore");
			else {
				// if state is maximize, all window panel restore
				window_manager.unmaximize_all();
			}
		});


		$("#g_window_tab_list").sortable("refresh");

		// when tab is moved(sorted), arrange indexes of window and tab. Jeong-Min Im.
		$('#g_window_tab_list').on('sortstop', function(e, ui) {
			var new_tab_list = $(this).find('a.goorm_tab_menu'), // moved(sorted) tab list
				old_tab_list = window_manager.tab, // original tab list
				window_list = window_manager.window;

			for (var i = new_tab_list.length - 1; 0 <= i; i--) {
				if ($(new_tab_list[i]).attr('id') != old_tab_list[i].tab_list_id) { // true: need to arrange
					for (var j = i - 1; 0 <= j; j--) { // find right tab
						if ($(new_tab_list[i]).attr('id') == old_tab_list[j].tab_list_id) { // true: right tab is found!
							// move tab to right place
							var temp = old_tab_list[i];
							old_tab_list[i] = old_tab_list[j];
							old_tab_list[j] = temp;

							// move window to right place, too
							temp = window_list[i];
							window_list[i] = window_list[j];
							window_list[i].index = i;
							window_list[j] = temp;
							window_list[j].index = j;

							break; // end of finding
						}
					}
				}
			}

			// jeongmin: update active window
			$(this).children().each(function(i) { // $(this).children() == tab li items
				if ($(this).hasClass('active')) {
					window_manager.active_window = i;

					return false; // end of finding active tab
				}
			});
		});

		if (options.status) {
			if (options.status === 'minimized') {
				this.minimize();
			}
		}
	},

	set_tooltip: function(morphed_title) { // Tooltip - Donguk Kim
		$("[id=g_window_tab_" + morphed_title + "]").off("click").tooltip();

		$("[id=g_window_tab_" + morphed_title + "]").click(function() {
			$(this).tooltip('hide');
		});
		$("[id=close_tab_" + morphed_title + "]").click(function() {
			$("[id=g_window_tab_" + morphed_title + "]").tooltip('hide');
		});
		$("[id=g_window_tab_" + morphed_title + "]").on('shown.bs.tooltip', function(e) {
			var leftpx = Number($("[id=g_window_tab_" + morphed_title + "]").offset().left);
			$('.tooltip').css("left", leftpx - 10);
			$('.tooltip.top > .tooltip-arrow').css('display', 'none');
			// $('.tooltip > .tooltip-arrow').css("left", 23);
		});
	},

	set_title: function(title) {
		console.log("===tab_set_title");
		if (title) {
			if (typeof core.status.current_opened_list[this.filename] === "undefined") {
				$("#" + this.tab_list_id).find('.tab_title').html(title + "-" + this.filepath);
			} else {
				$("#" + this.tab_list_id).find('.tab_title').html(title);
			}
		} else if (this.title) {
			//var morphed_title = this.title.split("/").join("_").split(".").join("_");
			if (typeof core.status.current_opened_list[this.filename] === "undefined") {
				$("#" + this.tab_list_id).find('.tab_title').html(this.filename + "-" + this.filepath);
			} else {
				$("#" + this.tab_list_id).find('.tab_title').html(this.filename);
			}
		}
	},

	set_event: function() {
		var self = this;

	},

	set_modified: function() {
		
		if (this.saved) { // jeongmin: it is saved by panel, so don't modify
			this.saved = false; // jeongmin: initialize

			return;
		}

		var self = this;

		var morphed_title = this.title.split("/").join("_").split(".").join("_");

		$("#" + this.tab_list_id).find('.tab_option').html("<i class='fa fa-asterisk'></i>");

		$('#' + this.tab_list_id).find('.tab_close_button').hide().end()
			.find('.tab_modified_button').show();

		// this.resize_title();

		this.is_saved = false;
	},

	set_saved: function() {
		var self = this;
		var morphed_title = this.title.split("/").join("_").split(".").join("_");

		$.each(core.status.current_opened_list, function(index, value) {
			cnt = value;
			if (cnt > 0) { // Donguk Kim : File Name Duplication Check & File Path Adding
				var temp = $("#g_window_tab_list").find('.tab_title[filename$="' + index + '"]');
				if (temp) {
					if (cnt == 1) {
						var name = temp.attr("filename");
						var path = temp.attr("filepath").split("/")[0];
						var current_project_path = core.status.current_project_path;
						if(path != current_project_path) {
							temp.html(name + " - " + temp.attr("filepath"));
						} else {
							temp.html(name);	
						}
					} else if (cnt > 1) {
						temp.each(function(index2) {
							var path = $(this).attr("filepath");
							var name = $(this).attr("filename");
							$(this).html(name + " - " + path);
						});
					}
				}
			}
		});

		$("#" + this.tab_list_id).find('.tab_option').html("");

		$('#' + this.tab_list_id).find('.tab_close_button').show().end().find('.tab_modified_button').hide();

		// this.resize_title();

		this.is_saved = true;
	},

	connect: function(window) {
		this.window = window;
		if (this.window) {
			if (this.window.state() === "maximized")
				this.maximize();
		}
	},

	maximize: function() {
		$('#' + this.tab_list_id).find('.tab_restore_button').show();
	},

	minimize: function() {
		$('#' + this.tab_list_id).find('.tab_restore_button').show();
	},

	restore: function() {
		$('#' + this.tab_list_id).find('.tab_restore_button').hide();
	},

	close: function() {
		var self = this;

		var cnt = --core.status.current_opened_list[this.filename];
		var window_manager = core.module.layout.workspace.window_manager;
		this.tab_manager.off_event(); // jeongmin: off this tab's shortcut
		window_manager.decrement_index_in_window(this.window.index);
		window_manager.delete_window_in_tab(this.window.index);

		this.empty_tab_dom();
		if (cnt > 0) { // Donguk Kim : File Name Duplication Check & File Path Adding
			var temp = $("#g_window_tab_list").find('.tab_title[filename$="' + this.filename + '"]');
			if (temp) {
				if (cnt == 1) {
					var name = temp.attr("filename");
					var path = temp.attr("filepath").split("/")[0];
					var current_project_path = core.status.current_project_path;
					if(path != current_project_path) {
						temp.html(name + " - " + temp.attr("filepath"));
					} else {
						temp.html(name);	
					}
				} else if (cnt > 1) {
					temp.each(function(index) {
						var path = $(this).attr("filepath");
						var name = $(this).attr("filename");
						$(this).html(name + " - " + path);
					});
				}
			}
		}
		// $.each(core.status.current_opened_list, function(index, value) {
		// 	temp = $("#g_window_tab_list").find('.tab_title').html();

		// });

		$("#goorm_inner_layout_center").css("min-width", window_manager.min_tab_width * (window_manager.tab.length));
		window_manager.tab_resize_window_relocation();

		if (this.title == 'debug') {
			core.module.layout.debug.button_inactive();
		}
	},

	empty_tab_dom: function() {
		var self = this;

		$("#" + this.tab_list_id).parent().remove();
		$("#" + this.tab_content_id).remove();
		$("#g_window_tab_list").sortable("refresh");
	},

	activate: function() {
		this.tab.tab("show");
		var current_file_type = core.module.layout.workspace.window_manager.active_filename.split('.').pop();
		switch (current_file_type) {
            case 'c':
            case 'cpp':
            case 'java':
            case 'py':
            case 'js':
            	$("[action=do_jump_to_definition]").parent().show();
            	$("#gLayoutTab_Outline").show();
            	break;
            	
            case 'html':
            case 'css':
            	$("[action=do_jump_to_definition]").parent().hide();
                $("#gLayoutTab_Outline").show();
                break;

            default:
            	$("[action=do_jump_to_definition]").parent().hide();
            	$("#gLayoutTab_Outline").hide();
				$("#gLayoutTab_chat").click();
                break;
        }
	},

	resize: function() {
		var window_manager = core.module.layout.workspace.window_manager;
		var each_width = Math.floor((parseInt($("#goorm_inner_layout_center")[0].style.width) - 10) / window_manager.tab.length) - 1; // seongho.cha : style.width will get real width
		this.tab.parent().css("width", each_width + "px");
		this.resize_title();


	},

	////// adjust title's width. This is for keeping title and other buttons inline at tab. Jeong-Min Im. //////
	resize_title: function() {
		var tab_button_width = (this.tab.find('.close').outerWidth() > this.tab.find('.tab_modified_button').outerWidth()) ? this.tab.find('.close').outerWidth() : this.tab.find('.tab_modified_button').outerWidth(); // max width of buttons
		var tab_contents_width = this.tab.find('.tab_option').outerWidth() + tab_button_width; // width of modifying star and button
		var temp = null;



		this.tab.find('.tab_title').css('width', this.tab.width() - tab_contents_width - 20 + 'px'); // set the title width as excepted other contents' width from whole tap length
	}
};