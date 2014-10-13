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
	// cloud_explorer: null,
	outline: null,

	more_toolbar_timer: null,
	more_toolbar_wait_timer: null,
	more_toolbar_option: {
		duration: 800, // fadein, fadeout duration
		resize_timer: 900 // must be larger than duration
	},
	user_pluginList: [],

	init: function(container) {

		var self = this;

		this.layout = $('body').layout({
			west__size: 250,
			north__size: 80,
			north__resizable: false,
			north__animatePaneSizing: true,
			north__fxSpeed: 'fast',
			north__fxSettings: {
				direction: "up"
			},
			south__size: 30,
			south__resizable: false,
			south__closable: false,
			spacing_open: 3,
			spacing_closed: 5,
			south__spacing_closed: 0, //seongho.cha: It is trick. When show and hide function called togather, sometimes resizer not be hide. It makes resizer looks like hide
			center__childOptions: {
				center__paneSelector: ".ui-inner-layout-center",
				// inset: {
				// 	top: 4
				// },
				east__size: 380,
				south__size: 200,
				spacing_open: 3,
				spacing_closed: 5,
				onopen: function(pos) {
					try {
						if (pos == "east")
							$(core).trigger("east_tab_openend");
					} catch (e) {
						console.log(e);
					}
				},
				
				onresize_end: $.debounce(function() {
					self.refresh();
				}, 100, false)
			},
			onload: function(obj, state, options, name) {
				$('div.goorm_layout').show();
			},
			onresize: function() {},
			onresize_end: function() {
				// Main Toolbar - More Button
				//				
				// if (self._f_init_resize) {
				// 	if (self.more_toolbar_wait_timer) clearTimeout(self.more_toolbar_wait_timer);
				// 	self.more_toolbar_wait_timer = setTimeout(function() {
				// 		self._f_init_resize = false;
				// 		self.set_more_toolbar();
				// 	}, self.more_toolbar_option.resize_timer + 400);
				// } else {
				self.set_more_toolbar();
				// }
			}
			// onresize_end: function () {
			// 	console.log('end');

			// 	self.resize_all();

			// 	return false;
			// }
		});

		this.tab_manager = goorm.core.layout.tab;

		$(window).on('unload', function() {
			var layout_state = self.layout.readState();
			layout_state.south.initClosed = false; //seongho.cha : it must be opened. sometimes plugin close it.
			layout_state.south.initHidden = false;
			
			self.save_layout_tab_activated(layout_state); // add layout tab state
			localStorage.layout_state = JSON.stringify(layout_state);
			//localStorage.layout_state = JSON.stringify(self.layout.readState());
		});

		// Left


		//Project Explorer Tab
		this.attach_project_explorer(this.left_tabview);

		//Tool Box
		//		this.attach_toolbox(this.left_tabview);

		

		// Right


		
		

		// Bottom

		//Bottom TabView


		//Debug Tab
		this.attach_debug(this.inner_bottom_tabview);

		//Terminal Tab
		if(use_terminal !== false){
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

		// main-menu for submenu event by youseok.nam
		//
		var $last_child_menu = null;
		var hover_timer = null;
		var is_hover = false;

		var menu_shown = false;
		var menu = null;


		$('#goorm-mainmenu .dropdown').on('show.bs.dropdown', function() {
			$(core).trigger('contextmenu_all_hide');
		});

		$("#main-menu-file.dropdown").on('show.bs.dropdown', function(){
			var current_file = core.module.layout.project_explorer.get_tree_selected_path().files;

			if (goorm.core.file.decompress.check_type(current_file)) {
				$("#main-menu-file a[action=decompress_file]").parent().removeClass('disabled');
			}else{
				$("#main-menu-file a[action=decompress_file]").parent().addClass('disabled');
			}
		})

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

						$(core).trigger("bookmark_hover"); //jeongmin: bookmark hover -> load bookmark

						//correctly calculate submenu height and apply -- heeje
						var submenu = $('#submenu_container>.dropdown-menu');
						var pageY = e.pageY;
						submenu.css("overflow-y", "auto");
						submenu.css("max-height", $("body").height() - pageY - 5);

						//submenu position move -- Donguk Kim
						var submenu_width = submenu.width();
						var pageX = parseInt(submenu.css("left"));
						if ($("body").width() < pageX + submenu_width) {
							var opened_menu_width = parseInt($('.open >.dropdown-menu>li:first').css("width"));
							submenu.css("left", pageX - opened_menu_width - submenu_width);
						}

					}
				} else if ($(this).parent().children(".dropdown-menu")) {
					var dmenu = $(this).parent().children(".dropdown-menu");
					var height = dmenu.height();
					var pageY = e.pageY;

					//false gaining height of submenu - hide -- heeje
					//dmenu.css("overflow-y","auto");
					//dmenu.css("max-height",$("body").height()-pageY);


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
		$(".ui-layout-resizer-south .ui-layout-toggler").hover(
			function() {
				$(".ui-layout-resizer-east").addClass("ui-layout-resizer-temp");
			}, function() {
				$(".ui-layout-resizer-east").removeClass("ui-layout-resizer-temp");
			});

		// to prevent ui-resizer-layout overlap user tooltip
		$("#chat_all .list-group").hover(
			function() {
				$(".ui-layout-resizer-east").addClass("ui-layout-resizer-temp");
			}, function() {
				$(".ui-layout-resizer-east").removeClass("ui-layout-resizer-temp");
			});
		
		// bubble (more) button for main-toolbar by youseok.nam
		//
		$('#toolbar_more_button').click(function(e) {
			goorm.core.layout.reposition_bubble_toolbar();
			$('#bubble_toolbar').fadeToggle('fast', function() {
				// when bubble toolbar show, add click event(click outside of element, hide bubble toolbar)
				if ($(this).css('display') != 'none') {
					$(document).one("click", function() {
						$('#bubble_toolbar').css('display', 'none');
					});
				}
			});
			
			//width and height fix
			$('#bubble_toolbar').height($('#bubble_toolbar_sub').outerHeight());
			if($('#bubble_toolbar').width() <= 610) {
				$('#bubble_toolbar').css('right', 0);
			}
		});

		this.tab_manager.update();

		//stop button disabled
		$('button[action="stop"]').addClass('debug_not_active');
		$('button[action="stop"]').attr('isdisabled','disabled');
		$('a[action="stop"]').parent().addClass('disabled');	
		// console.log("layout.js:init();");
		// this.refresh();

		this.set_more_toolbar();
		// this.set_scroll_ui();

		$(window).resize(function(event) {
			// jQuery-ui resizable triggers window.resize event.
			if (!$(event.target).hasClass('ui-resizable')) {
				self.refresh();
			}
		});

		$(core).on('contextmenu_all_hide', function() {
			// force hide --> remove 'open' class

			$('#goorm-mainmenu li.dropdown.open').removeClass('open');
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
		$(".ul-layout-resizer-north").unbind("click");
		$(".ul-layout-resizer-north").unbind("drag");
		$(".ui-layout-toggler-north").unbind("click");
		$(".ui-layout-toggler-north").click(function(e) {
			// self.north_layout_toggle(e);
			var north_state = core.module.layout.layout.north.state;
			if (!north_state.isClosed) {
				if (north_state.layoutHeight < 70) {
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

		$(core).trigger('layout_loaded');

	},

	north_layout_toggle: function(step) {
		var current_layout = core.module.layout.layout;
		switch (step) {
			case 1:
				// close north layout
				current_layout.close("north");
				break;
			case 2:
				// half size
				current_layout.sizePane("north", 30); // North Panel size - Toolbar Size = 30
				current_layout.open("north");
				$("#goorm_main_toolbar")[0].style.visibility = "hidden";
				break;
			case 3:
				// completely open
				current_layout.sizePane("north", 81);
				current_layout.open("north");
				$("#goorm_main_toolbar")[0].style.visibility = "visible";
				break;
		}
	},

	attach_project_explorer: function(target) {
		this.project_explorer = new goorm.core.project.explorer();
		this.project_explorer.init();
	},

	
	

	attach_toolbar: function(target) {
		$(core).trigger("context_menu_complete");
	},

	attach_debug: function(target) {
		this.debug = new goorm.core.debug();
		this.debug.init();
		core.module.debug = this.debug;
	},

	

	attach_terminal: function(target) {
		var self = this;

		this.terminal = new goorm.core.terminal();

		$(core).one("goorm_login_complete", function() {
			self.terminal.init($("#goorm_inner_layout_bottom #terminal"), "default_terminal", false);
			core.module.terminal = new goorm.core.terminal.background("background");
		});
	},

	attach_search: function(target) {

	},

	//attach edit_toolbar. Jeong-Min Im.
	attach_edit_toolbar: function(target) {
		this.edit_toolbar = goorm.core.edit.toolbar; //jeongmin: declare edit toolbar
		this.edit_toolbar.init(); //jeongmin: initialize edit toolbar
	},

	refresh_terminal: function() {

	},

	resize_all: function() {

		// -- left --

		var goorm_left = $("#goorm_left");

		var layout_left_height = $("div.ui-layout-west").height() - 22;
		goorm_left.find("#project_explorer").height(layout_left_height - 6);
		goorm_left.find("#project_treeview").height(layout_left_height - 35 - 60); // minus top, bottom layout


		var project_selector_width = $("#project_explorer_tab").width() - 11;

		if (project_selector_width < 190) project_selector_width = 190;

		var project_selectbox = goorm_left.find("#project_selectbox");
		project_selectbox.css('width', (project_selector_width - 38)); // for margin & refresh tool


		var layout_right_height = $("div.ui-layout-east").height() - $("#east_tab").height();
		var goorm_inner_layout_right = $("#goorm_inner_layout_right");
		goorm_inner_layout_right.find("div.tab-content").height(layout_right_height);
		
		// goorm_inner_layout_right.find("#bookmark_tab_list").css("max-height", layout_right_height / 2 - 33); //jeongmin: the other half is for outline and 33 means bookmark header	// hidden by jeongmin: bookmark tab list is now resizable, so don't need to set height.


		// -- bottom --

		var layout_bottom_height = $("div.ui-layout-south").height() - $('#goorm_inner_layout_bottom .nav').outerHeight();
		$("#goorm_inner_layout_bottom").find("div.tab-content").height(layout_bottom_height);

		//set search tab and server tab in nodejs correct dynamically --heeje
		$(".rst_view").outerHeight($("#search_treeview").height() - $(".clr_view").outerHeight());
		// -- center --

		// workspace


		var layout_center_height = $('#goorm_inner_layout_center').height() - 30;
		$("#workspace").height(layout_center_height - 1);

		var layout_center_width = $('#goorm_inner_layout_center').width();
		$("#workspace").width(layout_center_width);


		$(".dummyspace").css("z-index", 0);

		// Main Menu - DropDown MaxHeight...
		//
		var max_height = $(window).height() - $('#goorm-mainmenu .collapse').outerHeight() - 5;
		$('#goorm-mainmenu .dropdown-menu').css('max-height', max_height + 'px');

		$(core).trigger("layout_resized");
	},

	set_more_toolbar: function() {
		var self = this;

		var $more_button = $('#toolbar_more_button_group');

		var toolbars = $('#goorm_main_toolbar #main_toolbar ul.navbar-nav').children();
		var bubble_toolbars = $('#goorm_main_toolbar #bubble_toolbar ul.navbar-nav').children();

		var main_toolbar_width = $('#goorm_main_toolbar').width();
		var current_toolbar_width = 0;

		var is_hide = false;



		for (var i = 0; i < toolbars.length - 1; i++) { // exclude more-button
			var $toolbar = $(toolbars.get(i));
			var $bubble_toolbar = $(bubble_toolbars.get(i));

			current_toolbar_width += ($toolbar.outerWidth() + 15); // margin

			if (current_toolbar_width + 63 > main_toolbar_width) {
				$toolbar.fadeOut({
					'duration': this.more_toolbar_option.duration
				});

				$bubble_toolbar.show();

				is_hide = true;
				$more_button.show();
			} else {
				$toolbar.fadeIn({
					'duration': this.more_toolbar_option.duration
				});

				$bubble_toolbar.hide();
			}
		}

		if (!is_hide) {
			$more_button.hide();
		}

		// bubble_toolbar hide in resize
		$('#bubble_toolbar').hide();
		// if (this.more_toolbar_timer) clearTimeout(this.more_toolbar_timer);
		// this.more_toolbar_timer = setTimeout(function() {
		this.more_toolbar_timer = $.debounce(function() {
			if ($("#goorm_main_toolbar").css('visibility') == "visible") {
				self._f_init_resize = true;
				self.layout.sizePane("north");
			}
		}, this.more_toolbar_option.resize_timer);
		this.more_toolbar_timer();
	},

	set_scroll_ui: function() {
		var $menus = $('#goorm-mainmenu .dropdown-menu');
		var ui = "<li class='scroll_controller'>Scroll</li>";
	},

	refresh: function() {
		this.resize_all();
		// self.layout.getUnitByPosition("top").set("height", $("#goorm_mainmenu").height() + $("#goorm_main_toolbar").height() + 55);	
	},

	select: function(tab_name) {
		var $parent = null;
		var pane = "";
		var id = "";
		if (tab_name) {
			switch (tab_name) {

				/* west */
				case 'project':
					id = 'gLayoutTab_project';
					pane = 'west';
					break;

				case 'packages':
					id = 'gLayoutTab_Packages';
					pane = 'west';
					$parent = $('#goorm_left');
					break;

				case 'cloud':
					id = 'gLayoutTab_Cloud';
					pane = 'west';
					$parent = $('#goorm_left');
					break;

					/* south */
				case 'debug':
					id = 'gLayoutTab_Debug';
					pane = 'south';
					$parent = $('#goorm_inner_layout_bottom');
					break;

				case 'terminal':
					id = 'gLayoutTab_Terminal';
					pane = 'south';
					$parent = $('#goorm_inner_layout_bottom');
					break;

				case 'search':
					id = 'gLayoutTab_Search';
					pane = 'south';
					$parent = $('#goorm_inner_layout_bottom');
					break;

					/* east */
				
				case 'outline':
					id = 'gLayoutTab_Outline';
					pane = 'east';
					$parent = $('#goorm_inner_layout_right');
					break;

				default:
					if (this.tab_manager.list[tab_name]) {
						id = tab_name;
						pane = this.tab_manager.list[tab_name].pane;
					}

					break;
			}
		}

		if (pane == 'west') $parent = $('#goorm_left');
		else if (pane == 'south') $parent = $('#goorm_inner_layout_bottom');
		else if (pane == 'east') $parent = $('#goorm_inner_layout_right');

		if (id && $parent && pane) {
			var tab = $parent.find('#' + id);
			if(tab.length){
				tab.click();
				this.expand(pane);
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
		var self = this;
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
				__pane.forEach(function(o, i) {
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
				__pane.forEach(function(o, i) {
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
				__pane.forEach(function(o, i) {
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
		//var west_tab = $("#goorm_left #west_tab").find(".active a").attr("id");
		var west_tab = {
			tab: $("#goorm_left #west_tab").find(".active a").attr("id"),
			detail_tab: $("#goorm_left .tab-pane.active").find('li.active a').attr('id')
		};
		//var east_tab = $("#goorm_center_inner_layout #goorm_inner_layout_right #east_tab").find(".active a").attr("id");
		var east_tab = {
			tab: $("#goorm_center_inner_layout #goorm_inner_layout_right #east_tab").find(".active a").attr("id"),
			detail_tab: $("#goorm_center_inner_layout #goorm_inner_layout_right .tab-pane.active").find('li.active a').attr('id')
		};
		var south_tab = $("#goorm_center_inner_layout #goorm_inner_layout_bottom #south_tab").find(".active a").attr("id");
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
			if (west_tab.detail_tab)
				$('#' + west_tab.detail_tab).click();

			// east tab activate
			if (east_tab.tab) {
				switch (east_tab.tab) {
					
					case 'gLayoutTab_Outline':
						this.select('outline');
						break;
				}
			}
			if (east_tab.detail_tab)
				$('#' + east_tab.detail_tab).click();

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
	},

	/*
	 * options : id, title, html, width, height, success ...
	 * width, height, callback --> real options !!
	 */
	add_dialog: function(options, callback) {
		var dialog = null;
		var panel = null;


		var XSSfilter = function(content) {
			return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		};
		// CHECK ID
		//
		if (!(options.id && $('#' + options.id).length === 0)) {
			// ALERT...
			//
			alert.show('Dialog ID is already used!');
		} else {



			// GET HTML
			//
			if (options.html) {
				if (options.html.indexOf('.html') > -1) { // if path
					// GET HTML FILE
					//
					$.post('/plugin/get_dialog', options, function(html_contents) {
						//  THIS IS A MODAL TEMPLATE
						var modal_template = "<div class='modal fade' id='ID_FOOTPRINT' tabindex='-1' role='dialog' aria-hidden='true'> \
				            <div class='modal-dialog' style='width: WIDTH_FOOTPRINT;height: HEIGHT_FOOTPRINT;'> \
				                <div class='modal-content'> \
				                    <div class='modal-header'> \
				                        <button type='button' class='close' data-dismiss='modal' aria-hidden='true'>&times;</button> \
				                        <h4 class='modal-title'>TITLE_FOOTPRINT</h4> \
				                    </div> \
				                    <div class='modal-body row' >html_contents_FOOTPRINT</div> \
				                </div> \
				            </div> \
				        </div> ";



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
					var modal_template = "<div class='modal fade' id='ID_FOOTPRINT' tabindex='-1' role='dialog' aria-hidden='true'> \
				            <div class='modal-dialog' style='width: WIDTH_FOOTPRINT;height: HEIGHT_FOOTPRINT;'> \
				                <div class='modal-content'> \
				                    <div class='modal-header'> \
				                        <button type='button' class='close' data-dismiss='modal' aria-hidden='true'>&times;</button> \
				                        <h4 class='modal-title'>TITLE_FOOTPRINT</h4> \
				                    </div> \
				                    <div class='modal-body row' >html_contents_FOOTPRINT</div> \
				                </div> \
				            </div> \
				        </div> ";

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
				alert.show('Can not find HTML File!');
			}
		}
	},

	add_main_menu: function(options) {
		var id = options.id;
		if (id && $('#plugin_' + id).length === 0) {
			$("#main_menu_bar").append('<li id="plugin_' + id + '" class="dropdown"><a href="#" role="button" class="dropdown-toggle" data-toggle="dropdown" localization_key="">' + options.name + '<b class="caret"></b></a><ul class="dropdown-menu" role="menu" aria-labelledby="drop10" style="max-height: 541px;"></ul></li>');
		}
		$.each(options.children, function(index, value) {
			if (value.id && $('#plugin_' + value.id).length === 0) {
				$("#plugin_" + id).find(".dropdown-menu").append('<li><a href="#" id="plugin_' + value.id + '" localization_key="" class="">' + value.name + '</a></li>');
				$("#plugin_" + value.id).click(function() {
					value.handler();
				});
			}
		});


	},

	reposition_bubble_toolbar: function() {
		var offset = $('#toolbar_more_button').offset();
		$('#bubble_arrow').css('top', (offset.top + $("#toolbar_more_button").height() + 18) + 'px').css('left', (offset.left + 30) + 'px');
		var toolbar_left_margin = Math.floor($('#toolbar_more_button').offset().left + ($('#toolbar_more_button').outerWidth() / 2) - ($('#bubble_toolbar').outerWidth() / 2));
		var toolbar_right_margin = $(window).width() - toolbar_left_margin - $('#bubble_toolbar').outerWidth();
		if (toolbar_right_margin < 25) {
			toolbar_right_margin = 25;
		}

		if($('#bubble_toolbar').width() <= 610) {
			$('#bubble_toolbar').css('right', 0);
		} else {
			$('#bubble_toolbar').css('right', toolbar_right_margin);
		}
	}
};
