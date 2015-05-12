/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.explorer = function() {
	this.target = null;
	this.treeview = null;
	this.context_menu_file = null;
	this.context_menu_folder = null;
	this.context_menu_project = null;
	this.current_tree_data = null;
	this.current_project = null;
	this.project_data = null;
	this.treeview_data = null;
	this.old_project_list_table_width = 0;
	this.project_idx_data = {};
	this.table = null;
	this.project_init = false;
	this.check_callbacks = [];
};

goorm.core.project.explorer.prototype = {
	init: function() {
		var self = this;

		// init explorer treeview from localStorage
		if (!localStorage.explorer_treeview) {
			localStorage.explorer_treeview = JSON.stringify({});
		}
		this.load_explorer_treeview();

		// bind selectbox event
		//
		this.init_select_box_event();

		// init...
		//
		$('#project_loading_gif').css('width', '100%');

		if (!core.status.current_project_path) {
			core.status.current_project_path = '';
		}
		core.status.selected_file = '';
		self.current_project = {};

		// drag & drop file upload
		self.drag_n_drop();
		$(core).on('project_get_list_complete', function() {
			if (!$.isEmptyObject(localStorage.current_project) && localStorage.current_project != '') {
				self.current_project = $.parseJSON(localStorage.current_project);

				if (self.current_project.current_project_name !== '' && self.check_project_list(self.current_project.current_project_path)) {
					core.dialog.open_project.open(self.current_project.current_project_path, self.current_project.current_project_name, self.current_project.current_project_type);
				} else {
					self.current_project = {};

					core.status.current_project_name = '';
					core.status.current_project_path = '';
					core.status.current_project_type = '';

					localStorage.current_project = '';

					

					self.set_default_project_list();
				}
			} else {
				self.current_project = {};

				core.status.current_project_name = '';
				core.status.current_project_path = '';
				core.status.current_project_type = '';

				localStorage.current_project = '';

				

				self.set_default_project_list();
			}

		});

		$(core).on('goorm_login_complete', function() {
			function get_list_cb(data) {
				self.project_data = data;
				self.make_project_selectbox();
				core.workspace = {};
				for (var i in data) {
					data[i].name && (core.workspace[data[i].name] = data[i].contents);
				}
				if (core.status.current_project_path === '') {
					self.make_project_list_table();

				} else {}

				$(core).trigger('project_get_list_complete');
			}

			
			//useonly(mode=goorm-oss)
			core.socket.once('/project/get_list/owner', get_list_cb);
			core.socket.emit('/project/get_list', {
				'get_list_type': 'owner_list'
			});
			

			self.set_context_menu();
		});

		$(core).on('language_loaded', function() {
			if (core.status.current_project_path === '') {
				$('#selected_project_name').html($('#project_selector .dropdown-menu li[localization_key=project_list]').text());
			}
		});

		$(window).unload(function() {
			self.save_explorer_treeview();
		});

		$(core).on('layout_resized', function() {
			var table = $('#project_list_table');

			if (table.width() != self.old_project_list_table_width && table.css('display') != 'none') {
				self.old_project_list_table_width = table.width();
				self.make_project_list_table();
			}
		});

		// when click treeview div, hide context menu
		//	$("#project_treeview").click(function () {
		//		self.hide_all_context_menu();
		//	});
	},

	refresh: $.throttle(function(callback) {
		var self = this;

		if (this.refreshing || (this.treeview && this.treeview._refresh)) { // It is not enough, need throttle too.
			return;
		}
		this.refreshing = true;

		$('#project_loading_div').show();
		$('#project_treeview').hide();
		$('#project_list_table').hide();

		function get_list_cb(data) {
			self.project_data = data;
			self.make_project_selectbox();

			core.workspace = {};
			for (var i in data) {
				data[i].name && (core.workspace[data[i].name] = data[i].contents);
			}

			if (core.status.current_project_path === '') {
				self.make_project_list_table();
			} else if (!core.workspace[core.status.current_project_path]) {
				

				core.current_project_name = '';
				core.status.current_project_path = '';
				core.current_projectType = '';
				self.current_project.current_project_path = '';
				self.current_project.current_project_name = '';
				self.current_project.current_projectType = '';

				

				$('#project_treeview').hide();
				self.make_project_list_table();
			} else {
				

				var temp_project_path = core.status.current_project_path;
				$('#project_treeview').css('background-color', '#FFF');

				self.current_project.current_project_path = temp_project_path;
				if (self.treeview && self.treeview.project_path === self.current_project.current_project_path) {
					console.log('goormIDE treeview refresh');
					self.treeview.refresh();
				} else {
					if (self.treeview) {
						// save state
						//
						self.save_explorer_treeview(self.treeview.project_path);

						// destroy
						//
						self.treeview.destroy();
					}
					self.treeview = null;

					var postdata = {
						kind: 'project',
						path: temp_project_path
					};

					self.fill_tree_data(postdata.path, self.treeview_data[temp_project_path]);
				}
				$('#project_loading_div').hide();
				$('#project_treeview').show();
			}
			
			var windows = core.module.layout.workspace.window_manager.window;
			var window_index = -1;

			for (window_index = core.module.layout.workspace.window_manager.window.length - 1; window_index >= 0; window_index--) {
				var o = core.module.layout.workspace.window_manager.window[window_index];
				var project = o.project;

				if (o.type == 'Editor' && !core.workspace[project]) {
					o.is_saved = true;
					core.module.layout.workspace.window_manager.close_by_index(o.index, o.index);
				}
			}
			self.drag_n_drop();
			if (callback && typeof(callback) === 'function') {
				callback();
			}
			self.refreshing = false;
		}

		
		//useonly(mode=goorm-oss)
		core.socket.once('/project/get_list/owner', get_list_cb);
		core.socket.emit('/project/get_list', {
			'get_list_type': 'owner_list'
		});
		
	}, 400),

	make_project_selectbox: function() {
		this.clear();
		
		if (this.project_data) {
			
			for (var project_idx = 0; project_idx < this.project_data.length; project_idx++) {
				var project_item = this.project_data[project_idx];

				if (project_item.name == core.status.current_project_path) {
					this.select_project_name(project_item.contents.name);
				}
				
				//useonly(mode=goorm-oss)
				$('#my_projects_header').after('<li class="project_item" project_path="' + project_item.name + '" idx="' + project_idx + '"><a href="#">' + project_item.contents.name + '</a></li>');
				
				this.project_idx_data[project_item.name] = project_idx;
			}
		}
		
		if (core.status.current_project_path === '') {
			// core.module.localization.local_apply("#project_selector", "dict");
			this.select_project_name($('#project_selector .dropdown-menu li[localization_key=project_list]').text());
		}

		// $("#project_selectbox").empty();

		// $("#project_selectbox").append`("<option localization_key='dictionary_project_list' value='' selected>" + core.module.localization.msg.dictionary_project_list + "</option>");

		// if (this.project_data) {
		//	for (var project_idx = 0; project_idx < this.project_data.length; project_idx++) {
		//		var temp_name = this.project_data[project_idx].name;

		//		if (this.project_data[project_idx].name == core.status.current_project_path) {
		//			$("#project_selectbox").append("<option value='" + project_idx + "' selected>" + temp_name + "</option>");
		//		} else {
		//			$("#project_selectbox").append("<option value='" + project_idx + "'>" + temp_name + "</option>");
		//		}
		//	}
		// }
	},

	init_select_box_event: function() {
		var self = this;

		$('#project_selectbox').click(function() {
			// jeongmin: make project list scroll
			var $dropdown = $('#project_selector .dropdown-menu');
			$dropdown.css('max-height', $(document).height() - $(this).offset().top - 80);
		});

		$('#back_to_project_table').click(function() {
			core.status.selected_file = '';
			core.module.localization.local_apply('#project_selector', 'dict');
			self.on_project_selectbox_change('');
		});

		$(document).on('click', 'li.project_item', function() {
			var project_name = $(this).attr('project_name');
			var idx = $(this).attr('idx');

			core.status.selected_file = '';
			self.select_project_name(project_name);
			self.on_project_selectbox_change(idx);
		});

		// $("#goorm_center_inner_layout").focusin(function() {
		// 	if($("#project_selectbox").attr("aria-expanded")) {
		// 		$('#project_selector').find('.dropdown-menu').dropdown('toggle')
		// 	}
		// });
	},

	set_default_project_list: function() { // default: DataTable
		$('#back_to_project_table').click();
		this.project_init = true;
	},

	clear: function() {
		this.project_idx_data = {};
		$('li.project_item').remove();
	},

	select_project_name: function(project_name) {
		$('#selected_project_name').html(project_name);
	},

	refresh_project_selectbox: function() {
		var self = this;

		function get_list_cb(data) {
			self.project_data = data;
			self.make_project_selectbox();
		}

		
		//useonly(mode=goorm-oss)
		core.socket.once('/project/get_list/owner', get_list_cb);
		core.socket.emit('/project/get_list', {
			'get_list_type': 'owner_list'
		});
		
	},

	on_project_selectbox_change: function(project_idx) {
		var self = this;
		// need modify. NullA

		

		if (project_idx !== null && project_idx !== undefined && project_idx !== '') {
			self.current_project.current_project_path = self.project_data[project_idx].name;
			self.current_project.current_project_name = self.project_data[project_idx].contents.name;
			self.current_project.current_project_type = self.project_data[project_idx].contents.type;
			core.dialog.open_project.open(self.current_project.current_project_path, self.current_project.current_project_name, self.current_project.current_project_type);
		} else {
			self.current_project.current_project_path = '';
			self.current_project.current_project_name = '';
			self.current_project.current_project_type = '';
			core.dialog.open_project.open(self.current_project.current_project_path, self.current_project.current_project_name, self.current_project.current_project_type);
		}

	},

	load_explorer_treeview: function() {
		this.treeview_data = JSON.parse(localStorage.explorer_treeview);

		// init
		if (!this.treeview_data) {
			this.treeview_data = {};
		}

		// sort treeview data to expand childs and avoid sync error during dynamic loading.
		if (!this.treeview_data[core.status.current_project_path]) {
			return;
		}
		if (this.treeview_data[core.status.current_project_path] && this.treeview_data[core.status.current_project_path].sort) {
			this.treeview_data[core.status.current_project_path].sort();
		}
	},

	save_explorer_treeview: function(project_path) {
		if (!this.treeview_data) {
			this.treeview_data = {};
		}
		if (!project_path) {
			project_path = core.status.current_project_path;
		}
		if (!this.treeview) {
			return;
		}

		if (this.treeview.project_path === project_path) {
			this.treeview_data[project_path] = this.treeview.get_state();
			localStorage.explorer_treeview = JSON.stringify(this.treeview_data);
		}
	},

	// add_explorer_treeview: function (path) {
	// 	if (!this.treeview_data[core.status.current_project_path]) this.treeview_data[core.status.current_project_path] = [];
	// 	if (path == "//undefined") return;
	// 	this.remove_explorer_treeview(path);
	// 	this.treeview_data[core.status.current_project_path].push(path);
	// 	this.save_explorer_treeview();
	// },

	remove_explorer_treeview: function(path) {
		delete this.treeview_data[path];
		localStorage.explorer_treeview = JSON.stringify(this.treeview_data);
		this.treeview.project_path = '';
		// console.log(this.treeview.get_state());
		// if (!this.treeview_data[core.status.current_project_path]) return;
		// for (var i = 0; i < this.treeview_data[core.status.current_project_path].length; i++) {
		// 	if (this.treeview_data[core.status.current_project_path][i] == path) {
		// 		this.treeview_data[core.status.current_project_path].remove(i);
		// 		break;
		// 	}
		// }
		// this.save_explorer_treeview();
	},

	set_context_menu: function() {
		var self = this;

		this.context_menu_file = new goorm.core.menu.context();
		this.context_menu_file.init('configs/menu/goorm.core.project/project.explorer.file.html', 'project.explorer.file_context', $('#project_treeview'), '', null, null, true);

		this.context_menu_folder = new goorm.core.menu.context();
		this.context_menu_folder.init('configs/menu/goorm.core.project/project.explorer.folder.html', 'project.explorer.folder_context', $('#project_treeview'), '', null, null, true);

		this.context_menu_project = new goorm.core.menu.context();
		this.context_menu_project.init('configs/menu/goorm.core.project/project.explorer.html', 'project.explorer_context', $('#project_explorer'), '', null, null, false);

		this.context_menu_multi = new goorm.core.menu.context();
		this.context_menu_multi.init('', 'project.explorer.multi_context', $('#project_treeview'), '', null, null, true);
	},

	copy: function() {
		this.clipboard = this.get_tree_selected_path();
	},
	// paste file/directory to target. Jeong-Min Im.
	paste: function() {
		var self = this;
		var localization_msg = core.module.localization.msg;
		var target = core.status.selected_file;

		if (this.clipboard && (core.status.selected_file_type === 'folder' || core.status.selected_file_type === 'root')) {
			var postdata = {
				source: this.clipboard,
				target: target
			};
			var paste_func = function() {
				_$.get('file/copy_file_paste', postdata, function(result) {
					if (!result.err_code) {
						self.treeview.refresh_node(target); // file will be placed below target, so just refresh target
					} else {
						var msg = '';

						switch (result.err_code) {
							case 1:
								msg = 'alert_invalide_query';
								break;

							case 2:
								msg = 'alert_permission_denied';
								break;

							case 3:
								msg = 'alert_paste_fail';
								break;

							

							default:
								msg = 'alert_unknown_error';
						}

						alert.show(localization_msg[msg]);
					}
				});
			};

			if (this.clipboard.directorys.length) {
				_$.get('file/directorys_exist', postdata, function(exist) {
					if (!exist) {
						paste_func();
					} else {
						var msg = '';
						var err_file = exist.err_file ? exist.err_file.join(', ') : '';

						switch (exist.err_code) {
							case 1:
								msg = 'alert_invalide_query';
								break;

							case 2:
								confirmation.init({
									'message': localization_msg.confirmation_do_you_want_overwrite + '<br/>' + err_file,
									'yes': paste_func
								}).show();
								return;

							case 3:
								msg = 'alert_paste_child';
								break;

							default:
								msg = 'alert_unknown_error';
						}

						alert.show(localization_msg[msg] + '<br/>' + err_file);
					}
				});
			} else {
				paste_func();
			}
		}
	},
	// duplicate file. Jeong-Min Im.
	duplicate: function() {
		var self = this;
		var localization_msg = core.module.localization.msg;

		this.copy(); // get selected files

		var files = this.clipboard.files;
		var directories = this.clipboard.directorys;

		if (files.length) {
			_$.get('file/copy_file_paste', {
				source: this.clipboard
			}, function(result) {
				if (result.err_code === 1) {
					alert.show(localization_msg.alert_invalide_query);
				} else if (result.err_code === 2) {
					alert.show(localization_msg.alert_permission_denied);
				} else if (result.err_file) {
					var msg = localization_msg.alert_paste_fail + '<br/>' + result.err_file.join(', ');

					if (result.err_file.length !== files.length) {
						var refresh_files = files.filter(function(item) {
							return result.err_file.indexOf(item) === -1;
						});

						for (var i = refresh_files.length - 1; 0 <= i; i--) {
							self.treeview.refresh_node(refresh_files[i].substring(0, refresh_files[i].lastIndexOf('/')));
						}
					}

					if (directories.length) {
						msg += '<br/>' + localization_msg.alert_folder_not_duplicated;
					}

					alert.show(msg);
				} else {
					for (var i = files.length - 1; 0 <= i; i--) {
						self.treeview.refresh_node(files[i].substring(0, files[i].lastIndexOf('/')));
					}

					if (directories.length) {
						alert.show(localization_msg.alert_folder_not_duplicated);
					}
				}
			});
		} else if (directories.length) {
			alert.show(localization_msg.alert_folder_duplicate_error);
		} else {
			alert.show(localization_msg.alert_file_not_select);
		}
	},

	get_tree_selected_path: function(treeview_id) { // treeview_id: id of various treeviews
		if (core.status.current_project_path !== '') { // except project table
			treeview_id = treeview_id || 'project_treeview';

			var selected_items = $('#' + treeview_id + ' .jstree-clicked');
			var files = [];
			var directorys = [];

			$(selected_items).each(function(i, o) {
				var $node = $(o).parent();

				if ($node.attr('file_type') !== undefined) {
					files.push($node.attr('path'));
				} else {
					directorys.push($node.attr('path'));
				}

				// if ($(o).find('span').hasClass("file")) {
				// 	files.push($(o).find(".fullpath").html());
				// } else {
				// 	directorys.push($(o).find(".fullpath").html());
				// }
			});

			// jeongmin: remove selected item
			if (selected_items.length == 0) {
				this.reset_tree_selected();
			}

			return {
				files: files,
				directorys: directorys
			};
		} else {
			return {
				files: [],
				directorys: []
			};
		}
	},

	reset_tree_selected: function() {
		core.status.selected_node = '';
		core.status.selected_file = '';
		core.status.selected_file_type = '';
		this.selected_type = '';
	},

	refresh_event: function() {
		core.module.localization.change_language(localStorage.getItem('language'), true);
		core.module.action.init();
	},

	check_project_list: function(project_path) {
		var self = this;

		if (this.project_data) {
			var project_data = this.project_data;
			var exist = false;

			for (var i = 0; i < project_data.length; i++) {
				if (project_data[i].name == project_path) {
					exist = true;
				}
			}

			return exist;
		} else {
			return false;
		}
	},

	make_project_list_table: function() {
		var self = this;

		var project_list_table = $('#project_list_table');

		var my_project_list = [];
		var shared_project_list = [];

		for (var p in core.workspace) {
			var project_data = core.workspace[p];

			if (project_data && project_data.type && project_data.name && project_data.author) {
				if (project_data.author == core.user.id) {
					my_project_list.push([project_data.type, project_data.name, project_data.author]);
				} else {
					shared_project_list.push([project_data.type, project_data.name, project_data.author]);
				}
			}
		}

		$('#project_list_table').html('<table cellpadding="0" cellspacing="0" border="0" class="display table table-hover table-condensed table-striped" id="project_list_jquery_table" ></table>');

		this.table = $('#project_list_jquery_table').dataTable({
			'aaData': my_project_list.concat(shared_project_list),
			'aoColumns': [{
					'sTitle': '<span localization_key="dictionary_type">' + core.module.localization.msg.dictionary_type + '</span>'
				}, {
					'sTitle': '<span localization_key="dictionary_name">' + core.module.localization.msg.dictionary_name + '</span>'
				}, {
					'sTitle': '<span localization_key="dictionary_author">' + core.module.localization.msg.dictionary_author + '</span>'
				}

			],
			'sDom': '<"H"f>rt',
			'iDisplayLength': -1,
			'oLanguage': {
				'sEmptyTable': '<span localization_key="project_empty">' + core.module.localization.msg.project_empty + '</span>'
			}
		});

		$('#project_explorer_refresh_tool').off('click');
		$('#project_explorer_refresh_tool').click(function(e) {
			self.refresh();
		});
		$('#project_loading_div').css('display', 'none');
		$('#project_list_table').css('display', '');

		$('#project_list_table td').unbind('hover');
		$('#project_list_table td').hover(function() {
			$(this).css('cursor', 'pointer');
		}, function() {
			$(this).css('cursor', 'auto');
		});
		$('#project_list_table td').unbind('click');
		$('#project_list_table td').click(function(e) {
			var aPos = self.table.fnGetPosition(this);
			var snapshot = self.table.fnGetData(aPos[0]);

			var selected_project_name = snapshot[2] + '_' + snapshot[1];

			var idx = self.project_idx_data[selected_project_name];

			self.on_project_selectbox_change(idx);

			// $('#project_selectbox').find('option').each(function(i, item) {
			// 	if ($(item).html() == selected_project_name) {
			// 		$('#project_selectbox').val($(item).val());
			// 		self.on_project_selectbox_change($(item).val());
			// 	}
			// });
		});

		this.styling_search();

		//force setting of localization when project is deleted by rm -rf on table --heeje
		if (core.status.current_project_path == '') {
			if (localStorage.getItem('language') == 'us') {
				$('#selected_project_name').text('Project List');
			} else {
				$('#selected_project_name').text('프로젝트 리스트');
			}
		}
	},

	styling_search: function() {
		var filter = $('#project_list_jquery_table_filter');

		// make div
		filter.append('<div class="input-group" style="width:95%; margin:0 auto; margin-bottom:5px;"><span class="input-group-addon" localization_key="search">Search</span></div>');
		core.module.localization.local_apply('#project_list_jquery_table_filter', 'dict');

		// move to div
		filter.find('input').addClass('form-control').appendTo(filter.find('.input-group'));

		// delete label
		filter.find('label').remove();
	},

	drag_n_drop: function() {
		var self = this;
		var treeview = $('#project_explorer'); // expand dnd space to whole tab

		var isWholerow = true;
		var isUploading = false;
		// file drag & drop from local
		treeview.off('dragover');
		treeview.off('drop');
		treeview.off('dragenter');
		treeview.off('dragleave');
		treeview.on('dragover', function(e) {
				return false;
			})
			.on('drop', function(e) {
				if (isUploading) {
					return false;
				}

				var target = $(e.target).parent();
				if (target.attr('id') !== 'my_project' && (target.is('[file_type]') || !target.is('[role="treeitem"]'))) {
					return false; // if id === my_project, user dnd to empty space on project_treeview
				}
				var files = e.originalEvent.dataTransfer.files;
				var items = e.originalEvent.dataTransfer.items;

				function callback() {
					isUploading = false;
				}

				// firefox does not support dataTransfer.items. we can't confirm which is file or folder.
				// so we don't support drag n drop function in firefox. - gangseok.lee
				if (items === undefined) {
					return false;
				}

				// is this best way to check folders?
				// all items data will be gone when confirmataion dialog occur.
				for (var i = 0; i < items.length; i++) {
					var entry = items[i].getAsEntry ? items[i].getAsEntry() : items[i].webkitGetAsEntry();

					if (entry && entry.isDirectory) {
						alert.show(core.module.localization.msg.alert_folder_upload_is_not_allowed);
						return false;
					}
				}

				goorm.core.file._import.upload_file_drag(files, target.attr('path') || core.status.current_project_path, callback);
				return false;
			})
			.on('dragenter', 'li:not([file_type])', function(e) {
				var target = $(e.target);
				if (target.parent().is('[file_type]')) {
					return false;
				}

				var tagName = target.prop('tagName');
				var sibling = undefined;

				switch (tagName) {
					case 'A':
						if (isWholerow) {
							target.addClass('jstree-hovered')
								.siblings('div').addClass('jstree-wholerow-hovered');
						} else {
							target.addClass('jstree-hovered');
						}
						//console.log('A dragenter');
						break;
					case 'DIV':
						if (!isWholerow) {
							break;
						}
						target.addClass('jstree-wholerow-hovered')
							.siblings('a').addClass('jstree-hovered');
						//console.log('DIV dragenter');
						break;
				}

				return false;
			})
			.on('dragleave', 'li:not([file_type])', function(e) {
				var target = $(e.target);
				if (target.parent().is('[file_type]')) {
					return false;
				}

				var tagName = target.prop('tagName');

				if (tagName === 'A') {
					if (!isWholerow) {
						target.removeClass('jstree-hovered');
						return false;
					}

					target = target.siblings('div');
				}

				var X = e.originalEvent.pageX;
				var Y = e.originalEvent.pageY;
				var offset = target.offset();
				var d_value = 2; // deviation value, chrome browser sends incorrect page position value.
				offset.right = Math.floor(target.width() + offset.left) - d_value;
				offset.bottom = Math.floor(target.height() + offset.top) - d_value;
				offset.left = offset.left + d_value;
				offset.top = offset.top + d_value;

				var isMouseout = X <= offset.left || X >= offset.right || Y <= offset.top || Y >= offset.bottom;

				//console.log("X: " + X + ", Y: " + Y + ", offset(" + offset.left + "," + offset.right + "," + offset.top + "," + offset.bottom + ") out? " + isMouseout);

				if (isMouseout) {
					target.removeClass('jstree-wholerow-hovered')
						.siblings('a').removeClass('jstree-hovered');
				}

				return false;
			});

		// drag n drop file move
		var path_info = {};
		/*
		var handle_callback = $.throttle(function(op, node, parent, pos, more) {
			if(op === 'move_node' && more.ref && !more.ref.li_attr.file_type) {
				path_info.target_path = more.ref.li_attr.path;
				path_info.id = more.ref.id;
				console.log('path : ' + path_info.target_path);
		      }
		      else {
		      	path_info = {};
		      }
		  }, 100, true);
		*/
		self.check_callbacks.push(function(op, node, parent, pos, more) {
			//handle_callback.apply(this, arguments);
			return false;
		});

		$(document)
			.off('dnd_start.vakata').on('dnd_start.vakata', function(e, data, helper, more) {
				$('head').append('<style id="dnd_custom_style">.jstree-er {display:none !important;}</style>');
			})
			.off('dnd_move.vakata').on('dnd_move.vakata', $.throttle(function(e, data) {
				var target_node = $(data.event.target);
				var tag_name = target_node.prop('tagName');

				if (tag_name === 'A' || tag_name === 'I') {
					target_node = target_node.parent();
					tag_name = target_node.prop('tagName');
				}

				var id = target_node.attr('id');
				var path = target_node.attr('path');
				var is_folder = !target_node.is('[file_type]');

				if (tag_name === 'LI' && is_folder) {
					path_info.target_path = path;
					path_info.id = id;
				} else {
					path_info = {};
				}
			}, 250, true))
			.off('dnd_stop.vakata').on('dnd_stop.vakata', function(e, data) {
				//console.log('dnd_stop');
				var target_path = path_info.target_path;
				// var target_id = path_info.id;
				// var target_folder_children = [];
				// var info = { filename : '', exist: false };
				// var info_list = [];

				var ori_path = []; // jeongmin: files' origin

				var msg = core.module.localization.msg;
				$('#dnd_custom_style').remove();

				// if(target_path === undefined || target_id === undefined) return false;
				if (target_path === undefined) {
					return false;
				}
				var nodes = data.data.nodes;
				nodes.sort().reverse();

				// var children = treeview.jstree('get_children_dom', target_id);

				// if(children) {
				// children.each(function(index, child) {
				//console.log(child);
				// var name = $(child).attr('id').split('/').slice(-1)[0];
				// target_folder_children.push(name);
				// });
				// }

				nodes.forEach(function(id, index) {
					var node = $('#' + id.replace(/[\/|\.]/g, '\\$&'));
					// 	var is_folder = !node.is('[file_type]');
					// 	var name = id.split('/').slice(-1)[0];
					var path = node.attr('path');

					ori_path.push(path);

					// 	var i = target_folder_children.indexOf(name);
					// 	var info = {};

					// 	if(i > -1 && node.parent()) {
					// 		var parent = node.parent().parent();
					// 		if(parent && parent.attr('path').split('/').slice(-1)[0] === name) {
					// 			info.cannot_move = true;
					// 			// TODO : localization
					// 			info.error_msg = msg.alert_cannot_overwrite_parent_folder + '<br/>"' + name +'"'; //'annot overwrite to a parent folder has the same name.';
					// 		}
					// 		else if(target_path + '/' + target_folder_children[i] === path) {
					// 			info.cannot_move = true;
					// 			info.error_msg = msg.alert_cannot_overwrite_itself + '<br/>"' + name + '"'; //' cannot overwrite to itself.';
					// 		}
					// 	}
					// 	else if(path.split('/').length === 1) {
					// 		info.cannot_move = true;
					// 		info.error_msg = msg.alert_root_folder_cannot_be_moved; //'Root folder cannot be moved';
					// 	}
					// 	else if(is_folder && target_path.match(path)) {
					// 		info.cannot_move = true;
					// 		info.error_msg = msg.alert_parent_folder_cannot_be_moved_to_its_child_folder; //'Root folder cannot be moved';
					// 	}

					// 	$.extend(info, { path: path, exist: ((i > -1) ? true : false)});
					// 	info_list.push(info);
				});

				//console.log(file_list);

				// var index = info_list.length - 1;
				// info_list.sort(function(a, b) {
				// 	return a > b;
				// });

				var _trigger = function(query, timeout) {
					//console.log(query);

					timeout === undefined ? 0 : timeout;

					setTimeout(function() {
						$(self).trigger(query);
					}, timeout);

				}

				$(self).off('confirm_move_file').on('confirm_move_file', function() {
					confirmation.init({
						message: msg.confirmation_do_you_want_move, //'Do you want move?', //core.module.localization.msg.alert_confirm_invite_co_developer,
						yes_text: msg.yes,
						no_text: msg.no,
						title: msg.confirmation_title,

						yes: function() {
							//confirmation.hide();
							_trigger('check_restriction', 500);
							//setTimeout(_trigger('name_exist_check'), 250);
						},
						no: function() {
							//confirmation.hide();
						}
					});

					confirmation.show();
				});

				$(self).off('check_restriction').on('check_restriction', function() {
					//confirmation.hide();

					// if(index < 0) {
					// self.move_file(target_id, target_path, info_list);
					core.dialog.move_file.send({
						ori_path: ori_path,
						dst_path: target_path
					});
					// return;
					// }

					// var exist = info_list[index].exist;
					// var name = info_list[index].path.split('/').slice(-1)[0];

					// if(info_list[index].cannot_move) {
					// 	alert.show(info_list[index].error_msg, function() {
					// 		info_list.splice(index--, 1);
					// 		_trigger('check_restriction', 250);
					// 	});
					// }
					// else if(exist) {
					// 	confirmation.init({
					// 		message: msg.confirmation_do_you_want_overwrite, //'Already exists, do you want overwrite? : ' + name, //core.module.localization.msg.alert_confirm_invite_co_developer,
					// 		yes_text: msg.confirmation_yes,
					// 		no_text: msg.confirmation_no,
					// 		title: msg.confirmation_title,

					// 		yes: function() {
					// 			//console.log(name + ' will be moved forcely');
					// 			index--;
					// 			//confirmation.hide();
					// 			_trigger('check_restriction', 250);

					// 		},
					// 		no: function() {
					// 			//console.log(name + ' will be ignored');
					// 			info_list.splice(index--, 1);
					// 			//confirmation.hide();
					// 			_trigger('check_restriction', 250);

					// 		}
					// 	});

					// 	confirmation.show();
					// }
					// else {
					// 	//console.log(name + ' will be moved');
					// 	index--;
					// 	_trigger('check_restriction');
					// }
				});

				_trigger('confirm_move_file');

			});

		// var colne;
		// var self = this;
		// var drag_mode = false;
		// var hasColne = false;
		// var target = $('#project_treeview').find('.node');
		// var treeView_Y = $("#project_selector").offset().top - $("#project_selector").height() + 5;
		// var multi_mode = false;
		// target.off('mousedown');
		// target.on('mousedown', function (e) {
		// 	if (e.which != 3) {
		// 		if (self.multi_select || $('#project_treeview').find('.ygtvfocus .node').length > 1) {
		// 			multi_mode = true;
		// 		} else {
		// 			drag_mode = true;
		// 			$('#project_treeview').find('.ygtvfocus').removeClass('ygtvfocus');

		// 		}
		// 		target = this;
		// 	}
		// });
		// $('#project_treeview').off('mousemove');
		// $('#project_treeview').on('mousemove', function (e) {
		// 	if (drag_mode && !self.multi_select) {
		// 		if (!hasColne) {
		// 			colne = $(target).clone();
		// 			$('#project_treeview').append(colne);
		// 			$(colne).css('position', 'absolute');
		// 			hasColne = true;

		// 		}
		// 		$(colne).css('left', e.clientX + 5);
		// 		$(colne).css('top', e.clientY - treeView_Y);
		// 	} else if (multi_mode && !self.multi_select) {
		// 		if (!hasColne) {
		// 			colne = $('#project_treeview').find('.ygtvfocus .node').clone();
		// 			$('#project_treeview').append(colne);
		// 			$(colne).css('position', 'absolute');
		// 			hasColne = true;
		// 			$('#project_treeview').find('.ygtvfocus').removeClass('ygtvfocus');
		// 		}
		// 		$(colne).css('left', e.clientX + 5);
		// 		$(colne).css('top', e.clientY - treeView_Y);
		// 	}
		// });
		// $('#project_treeview').off('mouseup');
		// $('#project_treeview').on('mouseup', function (e) {
		// 	if (drag_mode && !self.multi_select) {
		// 		var drop_position_el = document.elementFromPoint(e.clientX, e.clientY);
		// 		drop_position_el = $(drop_position_el);
		// 		if (drop_position_el.attr('id') != 'project_treeview' && drop_position_el.find('.folder')[0]) {
		// 			var after_path = drop_position_el.find('div').text();
		// 			var current_path = [];
		// 			current_path.push($(target).find('div').text());
		// 			if (after_path != current_path) {
		// 				var getdata = {
		// 					after_path: after_path,
		// 					current_path: current_path
		// 				};
		// 				//$.get('project/move_file', getdata, function (data) {

		// 				core.socket.once('/project/move_file', function(data){
		// 					self.refresh(true);

		// 					getdata.change = "drag_n_drop";
		// 					core.module.layout.workspace.window_manager.synch_with_fs(getdata);

		// 				});
		// 				core.socket.emit('/project/move_file',getdata);
		// 			}
		// 		}
		// 		drag_mode = false;
		// 		$(colne).remove();
		// 		hasColne = false;
		// 	} else if (multi_mode && !self.multi_select && colne) {

		// 		var drop_position_el = document.elementFromPoint(e.clientX, e.clientY);
		// 		drop_position_el = $(drop_position_el);

		// 		if (drop_position_el.attr('id') != 'project_treeview' && drop_position_el.find('.folder')[0]) {
		// 			var current_path = [];
		// 			$(colne).each(function (i, o) {
		// 				current_path.push($(o).find('div').text());
		// 			});
		// 			var after_path = drop_position_el.find('div').text();

		// 			if ($(colne).find('div').text().indexOf(after_path) == -1) {
		// 				var getdata = {
		// 					after_path: after_path,
		// 					current_path: current_path
		// 				};

		// 				core.socket.once('/project/move_file', function(data){
		// 					self.refresh(true);

		// 					getdata.change = "drag_n_drop";
		// 					core.module.layout.workspace.window_manager.synch_with_fs(getdata);

		// 				});
		// 				core.socket.emit('/project/move_file',getdata);
		// 			}
		// 		}

		// 		colne.remove();
		// 		hasColne = false;
		// 	}
		// 	multi_mode = false;

		// });
		// target.on('mouseenter', function (e) {
		// 	if (drag_mode && !self.multi_select) {
		// 		$(this).parent().prev().addClass("ygtvfocus");
		// 		$(this).parent().addClass("ygtvfocus");
		// 	} else if (multi_mode && !self.multi_select) {
		// 		$(this).parent().prev().addClass("ygtvfocus");
		// 		$(this).parent().addClass("ygtvfocus");
		// 	}
		// });
		// target.on('mouseleave', function (e) {
		// 	if (drag_mode && !self.multi_select) {
		// 		$(this).parent().prev().removeClass("ygtvfocus");
		// 		$(this).parent().removeClass("ygtvfocus");
		// 	} else if (multi_mode && !self.multi_select) {
		// 		$(this).parent().prev().removeClass("ygtvfocus");
		// 		$(this).parent().removeClass("ygtvfocus");
		// 	}
		// });

		// ///////////////////
		// var doc = document.getElementById('project_treeview');
		// doc.ondragover = function () { this.className = 'hover'; console.log('hi');return false; };
		// doc.ondragend = function () { this.className = ''; console.log('bye');return false; };
		// doc.ondrop = function (event) {
		// 	event.preventDefault && event.preventDefault();
		// 	this.className = '';

		// 	var drop_position_el = document.elementFromPoint(event.clientX, event.clientY);
		// 	drop_position_el = $(drop_position_el);
		// 	console.log(drop_position_el);
		// 	core.sim=drop_position_el;

		// 	var upload_path='';
		// 	if(drop_position_el.find('.fullpath').length === 1){
		// 		upload_path=drop_position_el.find('.fullpath').text();
		// 		if(drop_position_el.find('.folder').length === 0){
		// 			//file -> parent folder is upload path
		// 			upload_path=upload_path.split('/');
		// 			upload_path.pop();
		// 			upload_path=upload_path.join('/');
		// 		}
		// 	}else{
		// 		upload_path=core.status.current_project_path;
		// 	}

		// 	console.log('');
		// 	console.log(upload_path);
		// 	console.log('');

		// 	// now do something with:
		// 	var files = event.dataTransfer.files;
		// 	console.log(files);

		// 	//size check
		// 	//50MB
		// 	var total_size=0;
		// 	for(var i=0;i<files.length;i++){
		// 		total_size+=parseInt(files[i].size, 10);
		// 	}

		// 	if(total_size>=10000000){
		// 		alert.show('You can not upload files if total size is bigger than 10MB ');
		// 		return false;
		// 	}

		// 	var formData = new FormData();
		// 	for (var i = 0; i < files.length; i++) {
		// 		formData.append('file', files[i]);
		// 	}
		// 	formData.append('file_import_location_path', upload_path);

		// 	// now post a new XHR request
		// 	var xhr = new XMLHttpRequest();
		// 	xhr.open('POST', '/upload');
		// 	xhr.onload = function () {
		// 		console.log(xhr);

		// 		if (xhr.status === 200) {
		// 			console.log('all done: ' + xhr.status);
		// 		} else {
		// 			alert.show('Upload Fail');
		// 			console.log('Something went terribly wrong...');
		// 		}
		// 		setTimeout(function(){
		// 			self.refresh();
		// 		}, 500);

		// 	};

		// 	xhr.send(formData);

		// 	return false;
		// };
		// ////////////////////

	},

	// move_file: function(target_id, target_path, info_list) {
	// 	var self = this;
	// 	var current_path = [];
	// 	var $target = $('#' + target_id.replace(/[\/|\.]/g, '\\$&'));
	// 	info_list.forEach(function(info, index) {
	// 		current_path.push(info.path);
	// 	});

	// 	var getdata = {
	// 		after_path: target_path,
	// 		current_path: current_path
	// 	//	force: true
	// 	};
	// 	//$.get('project/move_file', getdata, function (data) {

	// 	core.socket.once('/project/move_file', function(data){
	// 		self.refresh(function() {
	// 			setTimeout(function() {
	// 				self.treeview.open_node($target);
	// 			}, 250);
	// 		});

	// 		//getdata.change = "drag_n_drop";
	// 		core.module.layout.workspace.window_manager.synch_with_fs(getdata);

	// 	});

	// 	//console.log(getdata);

	// 	core.socket.emit('/project/move_file',getdata);
	// 	// TODO : add processing UI
	// },

	fill_tree_data: function(path, state) {
		if (path === '') {
			return false;
		}

		var self = this;

		//tree init

		var on_mousedown = function(e, node) {
			e.stopPropagation();

			if (e.which == 3) {
				var selected_item = self.get_tree_selected_path();

				if (selected_item.files.length + selected_item.directorys.length > 1) { // multi-select
					var file = self.context_menu_multi.menu.find('.file');
					var directory = self.context_menu_multi.menu.find('.directory');

					file.hide();
					directory.hide();

					if (selected_item.directorys.length === 0) { // only files
						file.show();
					} else if (selected_item.files.length === 0) { // only directorys
						directory.show();
					}

					self.context_menu_multi.show(e);
				} else {
					self.treeview.select_node(node);

					core.status.selected_node = e.target;
					core.status.selected_file = node.li_attr.path;
					core.status.selected_file_type = node.type;
					self.selected_type = node.li_attr.file_type;

					if (core.status.selected_file_type === 'file') {
						self.context_menu_file.show(e);
					} else if (core.status.selected_file_type === 'folder' || core.status.selected_file_type === 'root') {
						var folder_context_container = $('div[id="project.explorer.folder_context"]');

						if (node.state.opened) {
							folder_context_container.find('a[action="folder_open_context"]').parent().hide();
							folder_context_container.find('a[action="folder_close_context"]').parent().show();
						} else {
							folder_context_container.find('a[action="folder_open_context"]').parent().show();
							folder_context_container.find('a[action="folder_close_context"]').parent().hide();
						}

						self.context_menu_folder.show(e);
					}

					
				}
			}
		};

		var on_click = function(e, node) {
			e.stopPropagation();

			core.status.selected_node = e.target;
			core.status.selected_file = node.li_attr.path;
			core.status.selected_file_type = node.type;
			self.selected_type = node.li_attr.file_type;

		};

		var on_dblclick = function(e, node) {
			if (node.type === 'file') {
				var path = node.li_attr.path.split('/');
				var filename = path.pop();
				var filetype = node.li_attr.file_type;
				var filepath = path.join('/') + '/';

				core.status.selected_file = node.li_attr.path;

				core.module.layout.workspace.window_manager.open(filepath, filename, filetype);
			}
		};

		var on_ready = function() {
			if (state) {
				var scroll = state.core.scroll;

				$('#project_treeview').scrollTop(scroll.top);
			}
		};

		var option = {
			project_path: path,
			multiple: true, // jeongmin: for multi selecting item
			dnd: true, // jeongmin: for moving(dragging) treeview item
			on_click: on_click,
			on_dblclick: on_dblclick,
			on_mousedown: on_mousedown,
			on_ready: on_ready,
			check_callback: function(op, node, parent, pos, more) {
				var args = arguments;
				var return_value = true;
				self.check_callbacks.forEach(function(handle_callback, index) {
					return_value = return_value && handle_callback.apply(this, args);
				});

				return return_value;
			}
		};

		if (state) {
			option.state = state;
		}
		this.treeview = new goorm.core.utility.treeview('#project_treeview', option);
	}
};
