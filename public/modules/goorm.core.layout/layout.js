/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.layout = {
	layout: null,
	inner_layout: null,
	left_tabview: null,
	inner_right_tabview: null,
	inner_bottom_tabview: null,
	inner_center_tabview: null,
	table_properties: null,
	treeview_project: null,
	mainmenu: null,
	toolbar: null,
	edit_toolbar: null,
	workspace: null,
	startpage: null,
	window_manager: null,
	chat: null,
	history: null,
	console: null,
	tab_project: null,
	tab_toolbox: null,
	project_explorer: null,
	tab_cloud: null,
	outline: null,

	// 	more_toolbar_timer: null,
	// 	more_toolbar_wait_timer: null,
	// 	more_toolbar_option: {
	// 		duration: 800, // fadein, fadeout duration
	// 		resize_timer: 900 // must be larger than duration
	// 	},
	user_pluginList: [],

	init: function(container) {

		var self = this;

		self.toolbar_width = 20; // default padding value for calling set_more_toolbar()

		this.layout = $('body#goorm').layout({
			enableCursorHotkey: false,
			west__size: 250,
			north__size: 70,
			north__resizable: false,
			north__animatePaneSizing: true,
			north__fxSpeed: 'fast',
			north__fxSettings: {
				direction: 'up'
			},
			south__size: 30,
			south__resizable: false,
			south__closable: false,
			spacing_open: 3,
			spacing_closed: 5,
			south__spacing_closed: 0, //seongho.cha: It is trick. When show and hide function called togather, sometimes resizer not be hide. It makes resizer looks like hide
			center__childOptions: {
				enableCursorHotkey: false,
				center__paneSelector: '.ui-inner-layout-center',
				south__animatePaneSizing: true,
				south__fxSpeed: 'fast',
				south__fxName: 'none',
				east__size: 380,
				south__size: 200,
				spacing_open: 3,
				spacing_closed: 5,
				onopen: function(pos) {
					if (pos == 'east') {
						$(core).trigger('east_tab_openend');
					}
				},
				south__onclose_start: function() {
					var inner_layout = goorm.core.layout.layout.center.children.layout1;
					if (!inner_layout.state.south.closing) {
						inner_layout.state.south.closing = true;
						inner_layout.state.south._size = inner_layout.state.south.size;
						inner_layout.sizePane('south', '1');
						return false;
					}
				},
				south__onclose_end: function() {
					var inner_layout = goorm.core.layout.layout.center.children.layout1;
					if (inner_layout.state.south.closing) {
						inner_layout.state.south.closing = false;
					}
				},
				south__onopen_start: function() {
					var inner_layout = goorm.core.layout.layout.center.children.layout1;
					inner_layout.sizePane('south', inner_layout.state.south._size || inner_layout.state.south.size);
				},
				east__onclose_start: function() {
					if ($('#chat_joined_panel').css('display') === 'block') {
						$('#chat_joined_panel').hide('slide', {
							direction: 'right'
						});
					}
				},
				
				onresize_end: function(name) {
					var inner_layout = goorm.core.layout.layout.center.children.layout1;
					if (name == 'south' && inner_layout.state.south.closing) {
						inner_layout.close('south');
					}
					self.refresh();
				}
			},
			onload: function() {
				$('div.goorm_layout').show();

				$('#main_toolbar ul.navbar-nav .grm_toolbar').each(function() {
					if ($(this).is(':visible')) {
						self.toolbar_width += $(this).outerWidth();
					}
				});
			},
			onresize: function() {},
			onresize_end: $.debounce(function() {
				if ($(document).width() < self.toolbar_width || $('#toolbar_more_button_group').is(':visible')) {
					self.set_more_toolbar();
				}
			}, 200, false)
		});

		this.tab_manager = goorm.core.layout.tab;
		this.tab_manager.init();

		$(window).on('unload', function() {
			var layout_state = self.layout.readState();
			var hidden_tabs = $('.ui-layout-pane .nav-tabs li[style*=none] a');

			layout_state.south.initClosed = false; //seongho.cha : it must be opened. sometimes plugin close it.
			layout_state.south.initHidden = false;
			layout_state.north_step = self.north_step || 3;
			layout_state.hidden_tabs = [];

			for (var i = hidden_tabs.length - 1; 0 <= i; i--) {
				layout_state.hidden_tabs.push(hidden_tabs[i].id);
			}

			
			self.save_layout_tab_activated(layout_state); // add layout tab state
			localStorage.layout_state = JSON.stringify(layout_state);
			//localStorage.layout_state = JSON.stringify(self.layout.readState());
		});

		// Left

		//Project Explorer Tab
		this.attach_project_explorer(this.left_tabview);

		//Tool Box
		//		this.attach_toolbox(this.left_tabview);

		

		this.attach_navigate(this.left_tabview);

		// Right

		
		

		// Bottom

		//Bottom TabView

		//Debug Tab
		this.attach_debug(this.inner_bottom_tabview);

		//Terminal Tab
		if (use_terminal !== false) {
			this.attach_terminal(this.inner_bottom_tabview);
		}
		//Outputtab
		//Search Tab
		this.attach_search(this.inner_bottom_tabview);

		

		// Center

		this.workspace = goorm.core.layout.workspace;
		this.workspace.init(container + '_inner_layout_center');

		this.attach_edit_toolbar(this.workspace); //jeongmin: attach edit_toolbar to the workspace

		// Final

		// Menu DropDown
		//
		// var menu_timer = null;
		// var menu_time = 4 * 1000;
		// var dd_m = $('#goorm-mainmenu .dropdown > a:not(#account_menu_dropdown)');

		// dd_m.mousedown(function(e) {
		// 	return false;
		// });

		// dd_m.mouseover(function(e) {
		// 	var menu = e.currentTarget;

		// 	$(core).trigger('contextmenu_all_hide');

		// 	if (!$(menu).parent().hasClass('disabled')) {
		// 		$(menu).dropdown('toggle');
		// 	}

		// 	if (menu_timer) clearTimeout(menu_timer);
		// });

		// dd_m.siblings('ul').mouseover(function(e) {
		// 	if (menu_timer) clearTimeout(menu_timer);
		// });
		// //
		// // Mouse Over --> Timer Update

		// // Mouse Leave --> Menu Hide
		// //
		// dd_m.mouseleave(function(e) {
		// 	var menu = e.currentTarget;

		// 	if (menu_timer) clearTimeout(menu_timer);
		// 	menu_timer = setTimeout(function() {
		// 		$(menu).parent().removeClass('open');
		// 	}, menu_time);
		// });

		// dd_m.siblings('ul').mouseleave(function(e) {
		// 	var menu = e.currentTarget;

		// 	if (menu_timer) clearTimeout(menu_timer);
		// 	menu_timer = setTimeout(function() {
		// 		$(menu).parent().removeClass('open');
		// 	}, menu_time);
		// });

		var $last_child_menu = null;
		var hover_timer = null;
		var is_hover = false;

		var menu_shown = false;
		var menu = null;

		$('#goorm-mainmenu .dropdown').on('show.bs.dropdown', function() {
			$(core).trigger('contextmenu_all_hide');
		});
		

		// when mainmenu dropdown, hover can open dropdown menu
		$('#goorm-mainmenu .dropdown').hover(function(e) {
			menu_shown = $('#goorm-mainmenu .dropdown-menu').is(':visible');
			if (menu_shown) {
				menu = e.currentTarget;
				$('#goorm-mainmenu .dropdown.open').removeClass('open');
				$(menu).addClass('open');
			}
		});

		// do not test n-th submenu... this is for 1-th submenu event
		//
		$('.dropdown-submenu a').hover(
			function(e) { // mouseover event
				var $parent = $(this);

				var child = $parent.attr('child');
				var $child = $('#' + child);
				var is_disabled = $parent.parent().hasClass('disabled');

				if (child) {
					if (is_disabled) {
						$child.hide();
					} else {
						$child.show();

						var offset = $parent.offset();

						if ($last_child_menu) { // must be hide the last_child_menu before new child menu open
							$last_child_menu.trigger('force_hide');
						}

						$last_child_menu = $('#' + child);

						$('#' + child).appendTo('#submenu_container')
							// .addClass('active_menu')
							.css({
								'position': 'fixed',
								'top': offset.top + 'px',
								'left': (offset.left + $parent.outerWidth()) + 'px'
							}) // move to external container
							.on('force_hide', function() {
								var parent = $(this).attr('parent');
								var $local_parent = $('#' + parent).parent();

								$(this).appendTo($local_parent).hide();
							})
							.hover(function() {
								is_hover = true;
								clearTimeout(hover_timer);
							}, function() {
								is_hover = false;
								$(this).trigger('force_hide');
							})
							.show();

						//correctly calculate submenu height and apply -- heeje
						var submenu = $('#submenu_container>.dropdown-menu');
						var pageY = e.pageY;
						submenu.css('overflow-y', 'auto');
						submenu.css('max-height', $('body#goorm').height() - pageY - 5);

						//submenu position move -- Donguk Kim
						var submenu_width = submenu.width();
						var pageX = parseInt(submenu.css('left'), 10);
						if ($('body#goorm').width() < pageX + submenu_width) {
							var opened_menu_width = parseInt($('.open >.dropdown-menu>li:first').css('width'), 10);
							submenu.css('left', pageX - opened_menu_width - submenu_width);
						}

					}
				}
			},
			function() { // mouseout event
				var child = $(this).attr('child');
				var $child_menu = $('#' + child);

				hover_timer = setTimeout(function() { // must be triggered after child menu hover event because we have to catch what active element is
					if (!is_hover && $child_menu) {
						$child_menu.trigger('force_hide');
					}
				}, 300);
			}
		);

		$(document).on('click', '#submenu_container a', function() {
			if ($last_child_menu) {
				$last_child_menu.trigger('force_hide');
			}
		});

		// to prevent ui-resizer-layout overlap(east south)
		$('.ui-layout-resizer-south .ui-layout-toggler').hover(
			function() {
				$('.ui-layout-resizer-east').addClass('ui-layout-resizer-temp');
			},
			function() {
				$('.ui-layout-resizer-east').removeClass('ui-layout-resizer-temp');
			});

		// to prevent ui-resizer-layout overlap user tooltip
		$('#chat_all .list-group').hover(
			function() {
				$('.ui-layout-resizer-east').addClass('ui-layout-resizer-temp');
			},
			function() {
				$('.ui-layout-resizer-east').removeClass('ui-layout-resizer-temp');
			});
		
		$('#toolbar_more_button').click(function() {
			goorm.core.layout.reposition_bubble_toolbar();
			$('#bubble_toolbar').fadeToggle('fast', function() {
				// when bubble toolbar show, add click event(click outside of element, hide bubble toolbar)
				if ($(this).css('display') != 'none') {
					$(document).one('click', function() {
						$('#bubble_toolbar').css('display', 'none');
					});
				}
			});

			//width and height fix
			$('#bubble_toolbar').height($('#bubble_toolbar_sub').outerHeight());
			if ($('#bubble_toolbar').width() <= 610 && $('#bubble_toolbar').width() > 77) {
				$('#bubble_toolbar').css('right', 0);
			}
		});

		this.tab_manager.update();

		//stop button disabled
		$('button[action="stop"]').addClass('debug_inactive');
		$('button[action="stop"]').attr('isdisabled', 'disabled');
		$('a[action="stop"]').parent().addClass('disabled');
		// console.log('layout.js:init();');
		// this.refresh();

		// 		console.log('2222');
		// 		this.set_more_toolbar();
		// this.set_scroll_ui();

		$(window).resize(function(event) {
			// jQuery-ui resizable triggers window.resize event.
			if (!$(event.target).hasClass('ui-resizable')) {
				self.refresh();
			}
		});

		$(document).on('click', '#goorm-mainmenu .disabled,.dropdown-submenu', function() {
			return false;
		});

		document.addEventListener('mousedown', function(e) {
			var context = $(e.target).closest('ul.dropdown-menu');

			if ($(e.target).closest('li.dropdown').hasClass('open')) {
				return;
			}
			if (context.length > 0) {
				var parent = context.attr('parent');
				if (parent) {
					context = $('#' + parent).closest('ul.dropdown-menu');
				}
				context = context.closest('.dropdown');

				$('div.goorm_menu_item').not(context).hide();
				$('#goorm-mainmenu li.dropdown.open').not(context).removeClass('open');
			} else {
				$(core).trigger('contextmenu_all_hide');
			}
		}, true); //event capturing method.

		$(core).on('contextmenu_all_hide', function() {
			$('#goorm-mainmenu li.dropdown.open').removeClass('open');
			$('#main_toolbar div.btn-group.open').removeClass('open');
		});

		$(core).on('goorm_login_complete', function() {
			var layout = self.layout;

			if (localStorage.layout_state === null || localStorage.layout_state === undefined) {
				localStorage.layout_state = JSON.stringify(layout.readState());
			} else {
				self.load_layout_tab_activated(JSON.parse(localStorage.layout_state));
				layout.loadState(JSON.parse(localStorage.layout_state), false);
			}
		});

		// Set Dragging Event for Resizer - East
		//
		// var is_dragging = false;
		// $('.ui-layout-resizer-east')
		// 	.mousedown(function () {
		// 		$('.ui-layout-resizer-east').mousemove(function () {
		// 			is_dragging = true;
		// 			$('.ui-layout-resizer-east').unbind('mousemove');

		// 			console.log('mousemove');
		// 		});

		// 		console.log('mousedown');
		// 	})
		// 	.mouseup(function () {

		// 	});

		// $('.ui-layout-resizer-east').on('dragover', function () {
		// 	console.log('dragover');
		// });

		// $('.ui-layout-resizer-east').on('dragend', function () {
		// 	console.log('dragend');
		// });

		// North panel toggle function
		// When it is opend, close toolbar
		// When toolbar is closed, close panel
		// When panel is closed, open panel
		$('.ul-layout-resizer-north').unbind('click');
		$('.ul-layout-resizer-north').unbind('drag');
		$('.ui-layout-toggler-north').unbind('click');
		$('.ui-layout-toggler-north').click(function() {
			// self.north_layout_toggle(e);
			var north_state = core.module.layout.layout.north.state;
			if (!north_state.isClosed) {
				if (north_state.outerHeight < core.module.layout.layout.north.options.size) {
					// from half to close layout
					self.north_layout_toggle(1);
				} else {
					// from completely north layout to half
					self.north_layout_toggle(2);
				}
			} else {
				// from close layout to completely north layout
				self.north_layout_toggle(3);
			}
		});

		// edit menu is clicked -> check undo/redo menu. Jeong-Min Im.
		$('#main-menu-edit').mousedown(function() {
			var menu_undo = $('[action=do_undo]').parent();
			var menu_redo = $('[action=do_redo]').parent();

			// initialize
			menu_undo.addClass('disabled');
			menu_redo.addClass('disabled');

			var window_manager = core.module.layout.workspace.window_manager;

			// 1. is there any editor?
			if (window_manager.window.length > 0) {
				var active_window_obj = window_manager.window[window_manager.active_window];

				// 2. isn't it terminal?
				var history_edit = null;

				if (active_window_obj.editor) {
					if (active_window_obj.editor.collaboration) { // jeongmin: use ot_stack
						history_edit = active_window_obj.history_edit;
					} else { // jeongmin: use codemirror's original edit history
						history_edit = active_window_obj.editor.editor.doc.historySize();
					}
				} else if (active_window_obj.merge) { // jeongmin: use codemirror's original edit history
					history_edit = active_window_obj.merge.edit.doc.historySize();
				}

				if (history_edit) {
					// 3. can we do undo/redo?
					if (history_edit.redo > 0) {
						menu_redo.removeClass('disabled');
					}

					if (history_edit.undo > 0) {
						menu_undo.removeClass('disabled');
					}
				}
			}
		});

		$(core).trigger('layout_loaded');

	},

	north_layout_toggle: function(step) {
		var current_layout = core.module.layout.layout;
		switch (step) {
			case 1:
				// close north layout
				current_layout.close('north');
				break;
			case 2:
				// half size
				current_layout.sizePane('north', 30); // North Panel size - Toolbar Size = 30
				current_layout.open('north');
				$('#goorm_main_toolbar').hide();
				break;
			case 3:
				// completely open
				current_layout.sizePane('north', 70);
				current_layout.open('north');
				$('#goorm_main_toolbar').show();
				break;
		}

		this.north_step = step;
	},

	attach_project_explorer: function() {
		this.project_explorer = new goorm.core.project.explorer();
		this.project_explorer.init();
	},

	
	

	attach_toolbar: function() {
		$(core).trigger('context_menu_complete');
	},

	attach_debug: function() {
		this.debug = new goorm.core.debug();
		this.debug.init();
		core.module.debug = this.debug;
	},

	

	attach_terminal: function() {
		var self = this;

		this.terminal = new goorm.core.terminal();

		$(core).one('goorm_login_complete', function() {
			self.terminal.init($('#goorm_inner_layout_bottom #terminal'), 'default_terminal', false);
			core.module.terminal = new goorm.core.terminal.background('background');
		});
	},

	attach_search: function() {},

	//attach edit_toolbar. Jeong-Min Im.
	attach_edit_toolbar: function() {
		this.edit_toolbar = goorm.core.edit.toolbar; //jeongmin: declare edit toolbar
		this.edit_toolbar.init(); //jeongmin: initialize edit toolbar
	},

	attach_navigate: function(target) {
		this.navigate = goorm.core.layout.navigate;
		this.navigate.init();
	},

	refresh_terminal: function() {},

	resize_all: $.debounce(function() {
		// -- left --
		var left_height = $('#goorm_left').height() - $('#west_tab').height() - $('#goorm_left .nav-pills').height() - 8;
		$('#project_explorer').height(left_height - $('#project_selector').outerHeight());
		$('#share_list_group').height(left_height - 3);
		$('#navigate_tab').outerHeight($('#goorm_left').height() - $('#west_tab').height() - 2);
		//  - parseInt($('#project_explorer').css('padding-top')) * 2);

		var project_selector_width = $('#project_explorer_tab').width() - 40;
		// if (project_selector_width < 190) project_selector_width = 190;

		$('#project_selectbox').css('width', project_selector_width); // for margin & refresh tool

		// -- right --
		var layout_right_height = $('div.ui-layout-east').height() - $('#east_tab').height();
		$('#goorm_inner_layout_right > div.tab-content').height(layout_right_height);
		
		// goorm_inner_layout_right.find('#bookmark_tab_list').css('max-height', layout_right_height / 2 - 33); //jeongmin: the other half is for outline and 33 means bookmark header	// hidden by jeongmin: bookmark tab list is now resizable, so don't need to set height.
		$('#chat .tab-content').height(layout_right_height - $('#chat .nav').height());

		// -- bottom --

		var layout_bottom_height = $('div.ui-layout-south').height() - $('#goorm_inner_layout_bottom .nav').outerHeight();
		$('#goorm_inner_layout_bottom').find('div.tab-content').height(layout_bottom_height);

		//set search tab and server tab in nodejs correct dynamically --heeje
		// $('.rst_view').outerHeight($('#search_treeview').height() - $('.clr_view').outerHeight());
		$('.rst_view').each(function() {

			// clr_view may not be rendered yet
			var clr_view_height = $(this).siblings('.clr_view').outerHeight() === 0 ? 38 : $(this).siblings('.clr_view').outerHeight();
			$(this).outerHeight(layout_bottom_height - clr_view_height);
		});
		// -- center --

		// workspace

		var layout_center_height = $('#goorm_inner_layout_center').height() - 29;
		if (core.dialog.find_and_replace && core.dialog.find_and_replace.is_visible()) {
			layout_center_height -= $('#bar_find_and_replace').outerHeight();
		}
		$('#workspace').height(layout_center_height);

		var layout_center_width = $('#goorm_inner_layout_center').width() - 2;
		$('#workspace').width(layout_center_width);

		$('.dummyspace').css('z-index', 0);

		// Main Menu - DropDown MaxHeight...
		//
		var max_height = $(window).height() - $('#goorm-mainmenu .collapse').outerHeight() - 5;
		$('#goorm-mainmenu .dropdown-menu').css('max-height', max_height + 'px');

		$(core).trigger('layout_resized');
	}, 50),

	set_more_toolbar: function() {
		var $more_button = $('#toolbar_more_button_group');

		var $toolbars = $('#main_toolbar ul.navbar-nav .grm_toolbar').not('.disabled');
		var bubble_toolbar_container = $('#bubble_toolbar');
		var bubble_toolbars = bubble_toolbar_container.find('ul.navbar-nav .grm_bubble_toolbar').not('.disabled');

		var screen_width = $(document).width();
		var current_toolbar_width = 30; // because jquery cannot measure hidden width

		$toolbars.each(function(i) { // show if only it is enabled item
			var $bubble_toolbar = $(bubble_toolbars.get(i));

			current_toolbar_width += $(this).outerWidth();

			if (current_toolbar_width > screen_width) {
				$(this).fadeOut({
					'duration': 500
				});

				$bubble_toolbar.show();

				if (!$more_button.is(':visible')) {
					$more_button.fadeIn({
						'duration': 500
					});
				}
			} else {
				$(this).fadeIn({
					'duration': 500
				});

				$bubble_toolbar.hide();

				if ($toolbars.length - 1 === i) {
					$more_button.hide();
				}
			}
		});

		if (bubble_toolbar_container.is(':visible') && !bubble_toolbars.is(':visible')) { // if there aren't any bubble toolbars, hide bubble toolbar container
			bubble_toolbar_container.hide();
			$more_button.hide();
		}
	},

	set_scroll_ui: function() {},

	refresh: function() {
		this.resize_all();
		// self.layout.getUnitByPosition('top').set('height', $('#goorm_mainmenu').height() + $('#goorm_main_toolbar').height() + 55);
	},

	// select tab in layout. Jeong-Min Im.
	// tab_name (String || Object) : tab's name or nth tab in which layout
	select: function(tab_name) {
		var $parent = null;
		var pane = '';
		var id = '';

		var plugin_manager = core.module.plugin_manager.plugins['goorm.plugin.' + core.status.current_project_type];

		if (tab_name) {
			if (typeof tab_name === 'string') {
				id = this.get_id(tab_name);

				switch (tab_name) {

					/* west */
					case 'project':
					case 'packages':
					case 'cloud':
						pane = 'west';
						$parent = $('#goorm_left');
						break;

						/* south */
					case 'debug':
					case 'terminal':
					case 'search':
						pane = 'south';
						$parent = $('#goorm_inner_layout_bottom');
						break;

						/* east */
						
					case 'bookmark':
						pane = 'east';
						$parent = $('#goorm_inner_layout_right');
						break;

					default:
						if (this.tab_manager.list[tab_name]) {
							id = tab_name;
							pane = this.tab_manager.list[tab_name].pane;

							if (pane == 'west') {
								$parent = $('#goorm_left');
							} else if (pane == 'south') {
								$parent = $('#goorm_inner_layout_bottom');
							} else if (pane == 'east') {
								$parent = $('#goorm_inner_layout_right');
							}
						}
				}

				if (id && $parent && pane) {
					var tab = $parent.find('#' + id);
					if (tab.length) {
						if (tab.parent().css('display') === 'none') {
							tab.parent().show();
						}

						tab.click();
						this.expand(pane);
						if (tab_name == 'terminal') {
							if (core.module.layout.terminal.Terminal && core.module.layout.terminal.Terminal.focus) {
								core.module.layout.terminal.Terminal.focus();
							}

							$('#terminal').click();
						}
					}
				}
			} else { // just toggle nth tab
				switch (tab_name.position) {
					case 'left':
						$parent = $('#goorm_left');
						pane = 'west';
						break;

					case 'bottom':
						$parent = $('#goorm_inner_layout_bottom');
						pane = 'south';
						break;

					case 'right':
						$parent = $('#goorm_inner_layout_right');
						pane = 'east';
				}

				var tab = $parent.find('.nav-tabs a:eq(' + tab_name.index + ')');

				if (tab.length) {
					if (~tab.attr('href').indexOf('outline') && !(plugin_manager && plugin_manager.outline)) {
						return false;
					}

					if (tab.parent().css('display') === 'none') {
						tab.parent().show();
					}

					tab.click();
					this.expand(pane);

					if (~tab.attr('href').indexOf('terminal')) {
						var terminal = core.module.layout.terminal.Terminal;

						if (terminal && terminal.focus) {
							terminal.focus();
						}

						$('#terminal').click();
					}
				}
			}
		}
	},

	// pane : north, south, east, west
	//
	__get_parent: function(pane) {
		var __pane = ['north', 'south', 'east', 'west'];

		if (pane && typeof(pane) == 'string' && __pane.indexOf(pane) > -1) {

			if (pane == 'north' || pane == 'west') {
				return this.layout;
			} else {
				return this.layout.center.children.layout1;
			}
		}
	},

	// pane : north, south, east, west
	//
	is_open: function(pane) {
		var __pane = ['north', 'south', 'east', 'west'];

		if (pane && typeof(pane) == 'string' && __pane.indexOf(pane) > -1) {
			return !this.__get_parent(pane)[pane].state.isClosed;
		}
	},

	toggle: function(pane) {
		var self = this;
		var __pane = ['north', 'south', 'east', 'west'];

		if (pane && typeof(pane) == 'string') {

			if (pane == 'all') {
				__pane.forEach(function(o) {
					var parent = self.__get_parent(o);
					parent.toggle(o);
				});
			} else if (__pane.indexOf(pane) > -1) {
				var parent = this.__get_parent(pane);
				parent.toggle(pane);
			}
		}
	},

	expand: function(pane) {
		var self = this;
		var __pane = ['north', 'south', 'east', 'west'];

		if (pane && typeof(pane) == 'string') {

			if (pane == 'all') {
				__pane.forEach(function(o) {
					var parent = self.__get_parent(o);
					parent.open(o);
				});
			} else if (__pane.indexOf(pane) > -1) {
				var parent = this.__get_parent(pane);
				parent.open(pane);
			}
		}
	},

	collapse: function(pane) {
		var self = this;
		var __pane = ['north', 'south', 'east', 'west'];

		if (pane && typeof(pane) == 'string') {

			if (pane == 'all') {
				__pane.forEach(function(o) {
					var parent = self.__get_parent(o);
					parent.close(o);
				});
			} else if (__pane.indexOf(pane) > -1) {
				var parent = this.__get_parent(pane);
				parent.close(pane);
			}
		}
	},

	set_size: function(pane, size) {
		var __pane = ['north', 'south', 'east', 'west'];
		var __parent = null;
		size = parseInt(size);
		if (pane && typeof(pane) == 'string' && __pane.indexOf(pane) > -1) {
			__parent = this.__get_parent(pane);
			__parent.sizePane(pane, size);
		}
	},

	// to remember layout state tab activated...
	save_layout_tab_activated: function(layout_state) {
		//var west_tab = $('#goorm_left #west_tab').find('.active a').attr('id');
		var west_tab = {
			tab: $('#goorm_left #west_tab').find('.active a').attr('id'),
			detail_tab: $('#goorm_left .tab-pane.active').find('li.active a').attr('id')
		};
		//var east_tab = $('#goorm_center_inner_layout #goorm_inner_layout_right #east_tab').find('.active a').attr('id');
		var east_tab = {
			tab: $('#goorm_center_inner_layout #goorm_inner_layout_right #east_tab').find('.active a').attr('id'),
			detail_tab: $('#goorm_center_inner_layout #goorm_inner_layout_right .tab-pane.active').find('li.active a').attr('id')
		};
		var south_tab = $('#goorm_center_inner_layout #goorm_inner_layout_bottom #south_tab').find('.active a').attr('id');
		//var layout_state = JSON.parse(localStorage.layout_state);
		if (!layout_state.activated_tab) {
			layout_state.activated_tab = {
				west_tab: null,
				east_tab: null,
				south_tab: null
			};
		}
		layout_state.activated_tab.west_tab = west_tab;
		layout_state.activated_tab.east_tab = east_tab;
		layout_state.activated_tab.south_tab = south_tab;

		//localStorage = JSON.stringify(layout_state);
	},

	// load activated layout tab
	load_layout_tab_activated: function(layout_state) {
		//var layout_state = JSON.parse(localStorage.layout_state);
		if (layout_state.activated_tab) {
			var west_tab = layout_state.activated_tab.west_tab;
			var east_tab = layout_state.activated_tab.east_tab;
			var south_tab = layout_state.activated_tab.south_tab;
			// west tab activate
			if (west_tab.tab) {
				switch (west_tab.tab) {
					case 'gLayoutTab_project':
						this.select('project');
						break;
					case 'gLayoutTab_Packages':
						this.select('packages');
						break;
					case 'gLayoutTab_Cloud':
						this.select('cloud');
						break;

				}
			}
			if (west_tab.detail_tab) {
				$('#' + west_tab.detail_tab).click();
			}

			// east tab activate
			if (east_tab.tab) {
				switch (east_tab.tab) {
					
					case 'gLayoutTab_Outline':
						this.select('outline');
						break;
				}
			}
			if (east_tab.detail_tab) {
				$('#' + east_tab.detail_tab).click();
			}

			// south tab activate
			if (south_tab) {
				switch (south_tab) {
					case 'gLayoutTab_Debug':
						this.select('debug');
						break;
					case 'gLayoutTab_Terminal':
						this.select('terminal');
						break;
					case 'gLayoutTab_Search':
						this.select('search');
						break;
				}
			}
		}

		if (layout_state.north_step) {
			this.north_layout_toggle(layout_state.north_step);
		}

		if (layout_state.hidden_tabs) {
			this.tab.toggle(layout_state.hidden_tabs.join(', #'));
		}
	},

	/*
	 * options : id, title, html, width, height, success ...
	 * width, height, callback --> real options !!
	 */
	add_dialog: function(options, callback) {
		var dialog = null;
		var panel = null;

		var XSSfilter = function(content) {
			return content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		};
		// CHECK ID
		//
		if (!(options.id && $('#' + options.id).length === 0)) {
			// ALERT...
			//
			alert.show(core.module.localization.msg.alert_dialog_id_used);
		} else {

			// GET HTML
			//
			if (options.html) {
				if (options.html.indexOf('.html') > -1) { // if path
					// GET HTML FILE
					//
					$.post('/plugin/get_dialog', options, function(html_contents) {
						//  THIS IS A MODAL TEMPLATE
						var modal_template = '<div class="modal fade" id="ID_FOOTPRINT" tabindex="-1" role="dialog" aria-hidden="true">' +
							'<div class="modal-dialog" style="width: WIDTH_FOOTPRINT;height: HEIGHT_FOOTPRINT;">' +
							'<div class="modal-content">' +
							'<div class="modal-header">' +
							'<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
							'<h4 class="modal-title">TITLE_FOOTPRINT</h4>' +
							'</div>' +
							'<div class="modal-body row" >html_contents_FOOTPRINT</div>' +
							'</div>' +
							'</div>' +
							'</div> ';

						if (html_contents) {

							// SET ID, TITLE, WIDTH, HEIGHT, html_contents
							//
							html_contents = modal_template.replace(/ID_FOOTPRINT/, options.id)
								.replace(/WIDTH_FOOTPRINT/, options.width)
								.replace(/TITLE_FOOTPRINT/, options.title)
								.replace(/HEIGHT_FOOTPRINT/, options.height)
								.replace(/html_contents_FOOTPRINT/, html_contents.file_data);

							// APPEND HTML
							//
							$('#goorm_dialog_container').append(html_contents);

							panel = $('#' + options.id);

							// SET goorm.core.dialog
							//
							dialog = new goorm.core.dialog();
							dialog.init({ // public/modules/goorm.core.project/project._new.js에서 dialog 만드는 것과 같이 goorm.core.dialog 이용
								// options ...
								//
								'success': function() {

									// call success
									//
									if (options.success && typeof(options.success) === 'function') {
										options.success();
									}

									// callback
									//
									if (options.callback && typeof(options.callback) === 'function') {
										callback(panel);
									}
								}
							});
						}
					});
				} else { // IS HTML CONTENTS
					var modal_template = '<div class="modal fade" id="ID_FOOTPRINT" tabindex="-1" role="dialog" aria-hidden="true">' +
						'<div class="modal-dialog" style="width: WIDTH_FOOTPRINT;height: HEIGHT_FOOTPRINT;">' +
						'<div class="modal-content">' +
						'<div class="modal-header">' +
						'<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
						'<h4 class="modal-title">TITLE_FOOTPRINT</h4>' +
						'</div>' +
						'<div class="modal-body row" >html_contents_FOOTPRINT</div>' +
						'</div>' +
						'</div>' +
						'</div> ';

					// SET ID, TITLE, WIDTH, HEIGHT, html_contents
					//
					var html_contents = modal_template.replace(/ID_FOOTPRINT/, options.id)
						.replace(/WIDTH_FOOTPRINT/, options.width)
						.replace(/TITLE_FOOTPRINT/, options.title)
						.replace(/HEIGHT_FOOTPRINT/, options.height)
						.replace(/html_contents_FOOTPRINT/, XSSfilter(options.html));

					// APPEND HTML
					//
					$('#goorm_dialog_container').append(html_contents);

					panel = $('#' + options.id);

					// SET goorm.core.dialog
					//
					dialog = new goorm.core.dialog();
					dialog.init({ // public/modules/goorm.core.project/project._new.js에서 dialog 만드는 것과 같이 goorm.core.dialog 이용
						// options ...
						//
						'success': function() {

							// call success
							//
							if (options.success && typeof(options.success) === 'function') {
								options.success();
							}

							// callback
							//
							if (options.callback && typeof(options.callback) === 'function') {
								callback(panel);
							}
						}
					});
				}
			} else {
				// ALERT (NO HTML)
				//
				alert.show(core.module.localization.msg.alert_no_html_file);
			}
		}
	},

	add_main_menu: function(options) {
		var id = options.id;
		if (id && $('#plugin_' + id).length === 0) {
			$('#main_menu_bar').append('<li id="plugin_' + id + '" class="dropdown"><a href="#" role="button" class="dropdown-toggle" data-toggle="dropdown" localization_key="">' + options.name + '<b class="caret"></b></a><ul class="dropdown-menu" role="menu" aria-labelledby="drop10" style="max-height: 541px;"></ul></li>');
		}
		$.each(options.children, function(index, value) {
			if (value.id && $('#plugin_' + value.id).length === 0) {
				$('#plugin_' + id).find('.dropdown-menu').append('<li><a href="#" id="plugin_' + value.id + '" localization_key="" class="">' + value.name + '</a></li>');
				$('#plugin_' + value.id).click(function() {
					value.handler();
				});
			}
		});
	},

	reposition_bubble_toolbar: function() {
		var offset = $('#toolbar_more_button').offset();
		$('#bubble_arrow').css('top', (offset.top + $('#toolbar_more_button').height() + 14) + 'px').css('left', (offset.left + 30) + 'px');
		var toolbar_left_margin = Math.floor($('#toolbar_more_button').offset().left + ($('#toolbar_more_button').outerWidth() / 2) - ($('#bubble_toolbar').outerWidth() / 2));
		var toolbar_right_margin = $(window).width() - toolbar_left_margin - $('#bubble_toolbar').outerWidth();
		if (toolbar_right_margin < 25) {
			toolbar_right_margin = 25;
		}

		if ($('#bubble_toolbar').width() <= 610 && $('#bubble_toolbar').width() > 77) {
			$('#bubble_toolbar').css('right', 0);
		} else {
			$('#bubble_toolbar').css('right', toolbar_right_margin);
		}
	},

	get_id: function(tab_name) {
		switch (tab_name) {
			case 'project':
				return 'gLayoutTab_project';

			case 'packages':
				return 'gLayoutTab_Packages';

			case 'cloud':
				return 'gLayoutTab_Cloud';

			case 'debug':
				return 'gLayoutTab_Debug';

			case 'terminal':
				return 'gLayoutTab_Terminal';

			case 'search':
				return 'gLayoutTab_Search';

				

			case 'outline':
				return 'gLayoutTab_Outline';

			case 'bookmark':
				return 'gLayoutTab_Bookmark';
		}
	}
};
