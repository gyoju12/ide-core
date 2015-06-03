/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.search = {
	dialog: null,
	buttons: null,
	last_pos: null,
	last_query: null,
	marked: [],
	match_case: false,
	whole_word: false,
	use_regexp: false,
	replace_cursor: null,
	// matched_file_list: [],
	// treeview: null,
	query: null,
	current_options: null,
	last_option: null,
	total_match: 0,
	load_count: 0,
	unload_data: [],

	init: function() {
		var self = this;

		var handle_ok = function() {
			self.search();
		};

		//clear button roles --heeje
		$('#search_clear>.clr-btn').click(function() {
			$('#search_keyword_wrapper').css('display', 'none');
			$('#search_clear .clr-btn').attr('disabled', 'disabled');
			$('#search_clear .refresh-btn').attr('disabled', 'disabled');
			$('#search_result_table').empty();
			$('#search_badge').hide();
			self.last_option = null;
			self.unload_data = [];
			self.load_count = 0;
			self.total_match = 0;
			self.unmark();
		});

		$('#search_clear>.refresh-btn').click(function() {
			$(core).one('event_save_all', function(e) {
				if (self.last_option !== null) {
					self.search(self.last_option);
				} else {
					self.refresh();
				}
			});

			var save_cnt = 0;
			core.module.layout.workspace.window_manager.save_all(function() {
				if (save_cnt === (core.module.layout.workspace.window_manager.window.length - 1)) {
					$(core).trigger('event_save_all');
					$('#south_tab #gLayoutTab_Search').click();
				} else {
					save_cnt++;
				}
			});
		});

		// $('#search_project_selectbox').change(function(e) {
		// 	var selected_option = e.target.selectedOptions[0].value;
		// 	var $input = $('#search_path_input');

		// 	if (selected_option === '/' || selected_option === 'null') {
		// 		$input.val('');
		// 		$input.prop('disabled', true);
		// 	} else {
		// 		$input.prop('disabled', false);
		// 		$input.focus().select();
		// 	}
		// });

		$('#search_query_inputbox').keydown(function(e) {
			var ev = e || event;

			if (ev.keyCode == 13) {
				handle_ok();

				e.stopPropagation();
				e.preventDefault();
				return false;
			}
		});

		$('#search_use_regexp').click(function() {
			if (!$('#search_whole_word').hasClass('disabled')) {
				$('#search_whole_word').addClass('disabled');
				$('#search_match_case').addClass('disabled');
			} else {
				$('#search_whole_word').removeClass('disabled');
				$('#search_match_case').removeClass('disabled');
			}
			if (!$('#search_use_regexp').hasClass('active')) {
				$('#search_use_regexp').addClass('active');
				$('#search_query_inputbox').trigger('change');
			} else {
				$('#search_use_regexp').removeClass('active');
				$('#search_query_inputbox_background').val('');
			}
		});

		$('#search_match_case').mousedown(function() {
			$(this).toggleClass('active');
		});

		$('#search_whole_word').mousedown(function() {
			$(this).toggleClass('active');
		});

		$('#g_far_btn_search').on('click', function() {
			self.search();
		});

		$('#g_s_btn_replace').on('click', function() {
			self.search_replace();
		});

		var inputbox = $('#search_query_inputbox'); //document.getElementById('search_query_inputbox');
		var inputbox_background = $('#search_query_inputbox_background');
		var make_shadow = function() {
			if ($('#search_use_regexp').hasClass('active')) {
				var value = inputbox.val();
				var scroll = inputbox.scrollLeft();
				if (value.length > 0) {
					if (scroll > 0) {
						inputbox_background.css('padding-left', '10px');
					} else {
						inputbox_background.css('padding-left', '6px');
						value = '/' + value;
					}
					value = value + '/';
				}
				inputbox_background.val(value);
				inputbox_background.scrollLeft(scroll);
			}
		};
		inputbox.bind('keydown keyup keypress change select', function(e) {
			setTimeout(make_shadow, 10);
		});

		$(core).on('socket_connected', function() {
			core._socket.on('/file/searching', function(res) {
				if (!res.error && res.data) {
					var LOAD_LIMIT = 5;
					if (($('#search_result').height() > $('#search_result_table').height()) || (self.load_count < LOAD_LIMIT)) {
						self.load_count++;
						self.total_match += parseInt(res.data.match_count, 10);
						self.convert_data_to_table(res.data.nodes);
						// self.attach_table_event();

						$('#search_badge').html(self.total_match);
						$('#search_badge').show();
					} else {
						self.unload_data.push(res);
					}
				}
			});
		});
	},

	
	//useonly(mode=goorm-oss)
	search: $.throttle(function() {
		var search_path;
		var include = null;

		this.match_case = $('#search_match_case').hasClass('active');
		this.use_regexp = $('#search_use_regexp').hasClass('active');
		this.whole_word = $('#search_whole_word').hasClass('active');

		// if ($('#search_project_selectbox option:selected').val() == 'null') { // jeongmin: only 'null' search_path has to be filtered
		// 	alert.show(core.module.localization.msg.alert_project_not_selected);
		// 	return;
		// }
		var keyword = $('#search_query_inputbox').val();
		if (!keyword) {
			alert.show(core.module.localization.msg.alert_input_search_keyword);
			return;
		}
		search_path = '/' + core.status.current_project_path + $('#search_path_input').val();
		if ($('#search_file_extension').val() !== '') {
			include = this.parse_file_extension($('#search_file_extension').val());
		}
		this.current_options = {
			keyword: keyword,
			search_path: search_path,
			match_case: this.match_case,
			use_regexp: this.regexp,
			whole_word: this.whole_word,
			include: include
		};

		var grep_option = {};
		var text = keyword;

		grep_option.use_regexp = this.use_regexp;
		grep_option.match_case = this.match_case;
		grep_option.whole_word = this.whole_word;
		grep_option.include = include;

		if ($('#search_file_extension').val() !== '') {
			grep_option.include = this.parse_file_extension($('#search_file_extension').val());
		}

		this.query = text;

		this.unload_data = [];
		this.load_count = 0;
		this.total_match = 0;

		this.get_matched_file(text, grep_option, search_path);
	}, 1000),
	
	convert_data_to_table: function(data) {
		var string = '';
		var i = 0;
		var parent_node = '';
		var filtering = function(string) {
			string = ((string.replace(/&/g, '&amp;')).replace(/\"/g, '&quot;')).replace(/\'/g, '&#39;');
			string = string.replace(/</g, '&lt;').replace(/>/g, '&gt;').split(/\t/).join('&nbsp;&nbsp;&nbsp;&nbsp;').split(/\s/).join('&nbsp;');
			return string;
		};

		for (var attr in data) {
			var temp = attr.split('/');
			var filename = temp.pop();
			var filepath = temp.join('/') + '/';
			var filetype = filename.split('.').pop();
			if (filetype === '') {
				filetype = 'etc';
			}

			parent_node = $('#search_result_table').treetable('node', attr);
			if (!parent_node) {
				string = '<tr class="search_filename" data-tt-id="' + attr + '" filename="' + filename + '" filepath="' + filepath + '" filetype="' + filetype + '"><td><span>' + attr + '</span></td></tr>';
				$('#search_result_table').treetable('loadBranch', null, string);
			} else {
				$('#search_result_table').treetable('loadBranch', parent_node, '<tr data-tt-id="content-' + attr + '-' + data[attr][0].start_line + '-b" data-tt-parent-id="' + attr + '"><td><div class="search_block"><span class="search_connect" style="margin-left:15px;">...</span></div></td></tr>');
			}

			data[attr].map(function(obj, idx, arr) {
				string = '<tr data-tt-id="content-' + attr + '-' + obj.start_line + '" data-tt-parent-id="' + attr + '"><td><div class="search_block">';
				for (var j = 0; j < obj.code.length; j++) {
					var current_line = obj.start_line + j;
					var separator = ' ';
					if (obj.match_line.indexOf(current_line) > -1) {
						separator = ':';
						string += '<div class="search_line search_match_line" data-line="' + current_line + '">';
					} else {
						string += '<div class="search_line" data-line="' + current_line + '">';
					}

					string += '<span class="search_num">' + current_line + '</span>';
					string += '<span>' + separator + '</span>';
					string += '<span class="search_code">' + filtering(obj.code[j]) + '</span>';
					string += '</div><br>';
				}
				if (idx < arr.length - 1) {
					string += '<tr data-tt-id="content-' + attr + '-' + obj.start_line + '-c" data-tt-parent-id="' + attr + '"><td><div class="search_block"><span class="search_connect" style="margin-left:15px;">...</span></div></td></tr>';
				}
				string += '</div></td></tr>';
				$('#search_result_table').treetable('loadBranch', parent_node, string);
			});
			i++;
		}
	},
	
	
	//useonly(mode=goorm-oss)
	attach_table_event: function() {
		var self = this;
		var window_manager = core.module.layout.workspace.window_manager;
		var search = function(filename, filetype, filepath, matched_line) { // jeongmin: callback is used by refactor module
			window_manager.open(filepath, filename, filetype, null, null, function(__window) {
				var temp = $.debounce(function() {
					var cm = __window.editor.editor;

					if (self.query) {
						var caseFold = true;
						var caseMatch = false;
						var text = self.query;

						if (self.use_regexp) {
							text = RegExp(text, 'g');
						} else if (self.match_case === true) {
							caseFold = false;
						} else if (self.whole_word === true) {
							caseFold = false;
							caseMatch = true;
						}
						self.unmark();
						for (var cursor = cm.getSearchCursor(text, null, caseFold); cursor.findNext();) {
							if (caseMatch) {
								var range = cm.findWordAt(cursor.from());

								// compare query length + caseFold for performance --> Originally, compare query and word
								//
								if (range.head.ch - range.anchor.ch !== self.query.length) {
									continue;
								}
							}

							self.marked.push(
								cm.markText(cursor.from(), cursor.to(), {
									'className': 'cm-matchhighlight'
								})
							);
						}

						// variable 'searching' means this state is showing yellow marker
						__window.searching = true;
					}

					cm.focus();
					cm.setCursor(matched_line - 1);

				}, 400);
				temp();
			});
		};
		/** event **/
		$('.search_match_line').off('dblclick');
		$('.search_match_line').on('dblclick', function(e) {
			var parent_id = $(this).parents('tr').data('ttParentId');
			var $parent_node = $('.search_filename[data-tt-id="' + parent_id + '"]');
			var filename = $parent_node.attr('filename');
			var filepath = $parent_node.attr('filepath');
			var filetype = $parent_node.attr('filetype');
			var matched_line = parseInt($(this).data('line'), 10);

			search(filename, filetype, filepath, matched_line);
		});

		$('.search_match_line').off('mouseover');
		$('.search_match_line').on('mouseover', function(e) {
			$(this).addClass('match_line_over');
			$('.match_line_over').not(this).removeClass('match_line_over');
		});
	},
	
	
	//useonly(mode=goorm-oss)
	get_matched_file: function(text, grep_option, search_path) {
		var self = this;
		var path_arr = search_path.split('/');
		var folder_path = path_arr.slice(2).join('/');

		var window_manager = core.module.layout.workspace.window_manager;
		var firstActivate = window_manager.active_window;

		var postdata = {
			find_query: text,
			project_path: '/' + path_arr[1],
			folder_path: folder_path,
			grep_option: grep_option
		};

		// jeongmin: all projects
		if (search_path === '') {
			postdata.project_path = '';
		}

		var progress_elements = core.module.loading_bar.start({
			now: 0,
			unique: 'search',
			beforeStop: function() {
				$('#g_s_btn_ok').removeAttr('disabled');
			}
		});
		if (!progress_elements) {
			return false;
		}
		this.progress_elements = progress_elements;
		$('#g_s_btn_ok').attr('disabled', 'disabled');
		// this.matched_file_list = [];

		$('#search_result_table').empty();
		$('#search_result_table').treetable({
			expandable: true,
			clickableNodeNames: true,
			initialState: 'expanded',
			indent: 5
		}, true);

		core.module.layout.select('search');

		$('#search_result').off('scroll');
		$('#search_result').on('scroll', $.throttle(function(e) {
			if (self.unload_data.length > 0) {
				var scroll_height = $(this).scrollTop() + $(this).height();
				if ((scroll_height + $(this).height() * 2) > $('#search_result_table').height()) {
					var rows = self.unload_data.shift();
					self.convert_data_to_table(rows.data.nodes);
					self.attach_table_event();
				}
			}
		}, 300));

		core._socket.once('/file/search_on_project', function(res) {
			core.progressbar.set(80, self.progress_elements.bar);

			if (res.error || res.data.total_match === 0) {
				// if it can't search keyword...
				$('#search_badge').html('0').hide();
				$('#search_keyword_wrapper').css('display', 'none');
				core.module.toast.show(core.module.localization.msg.alert_cannot_find_word, null, function() {
					$('#search_query_inputbox').focus();
				});
			} else {
				if (res.data) {
					// self.unload_data.push(res);
					self.convert_data_to_table(res.data.nodes);
				}

				self.attach_table_event();

				self.total_match = parseInt(res.total_match, 10);
				$('#search_badge').html(self.total_match);
				$('#search_badge').show();

				$('#search_clear>.clr-btn').removeAttr('disabled');
				$('#search_clear>.refresh-btn').removeAttr('disabled');

				self.hide();
				if (window_manager.window[firstActivate]) {
					window_manager.window[firstActivate].activate();
				}
			}
			// self.total_match = 0;
			self.progress_elements.stop();
		});
		core._socket.emit('/file/search_on_project', postdata);
	},
	
	unmark: function() {
		var i;
		for (i = 0; i < this.marked.length; ++i) {
			this.marked[i].clear();
		}
		this.marked.length = 0;

		var windows = core.module.layout.workspace.window_manager.window;

		for (i = windows.length - 1; 0 <= i; i--) {
			windows[i].searching = false;
		}
	},

	refresh: function() {
		var self = this;
		var options = this.current_options;

		this.unload_data = [];
		this.load_count = 0;
		this.total_match = 0;

		if (options) {
			self.get_matched_file(options.keyword, {
				use_regexp: options.use_regexp,
				match_case: options.match_case,
				whole_word: options.whole_word,
				include: options.include
			}, options.search_path);
		}
	},

	show: $.debounce(function(path) {
		$('#bar_find_and_replace').show();
		$('.find_row').show();
		// $('#f_input_group').hide();
		// $('#s_input_group').show();

		$('#search_path_input').val(path || '/');

		// $('#search_query_inputbox').val('');
		// Get current active_window's editor
		var window_manager = core.module.layout.workspace.window_manager;
		if (window_manager.window[window_manager.active_window] && window_manager.window[window_manager.active_window].editor !== undefined) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor;

			if (editor) {
				editor = window_manager.window[window_manager.active_window].editor.editor;

				if (editor && editor.getSelection() !== '') {
					$('#search_query_inputbox').val(editor.getSelection());
				}
			}
		}

		if (window_manager.maximized) {
			window_manager.maximize_all();
		}

		$('#search_match_case').tooltip();
		$('#search_whole_word').tooltip();
		$('#search_use_regexp').tooltip();

		$('#far_selector').val('search').change();
	}, 300, true),

	hide: function() {
		core.dialog.find_and_replace.hide();
	},

	make_search_project_selectbox: function() {
		$('#search_project_selectbox').empty();

		$('#search_project_selectbox').append('<option value="null" localization_key="dialog_search_project_select_guide" selected>' + core.module.localization.msg.notice_search_select_project + '</option>');

		var max_num = $('#search_project_selector').width(); //jeongmin: set max_num as selectbox's width

		if (core.module.layout.project_explorer.project_data) {
			for (var project_idx = 0; project_idx < core.module.layout.project_explorer.project_data.length; project_idx++) {
				var temp_name = core.module.layout.project_explorer.project_data[project_idx].name;

				// if (temp_name.length > max_num) {
				// 	temp_name = temp_name.substring(0, max_num - 1);
				// 	temp_name += ' …';
				// }

				if (core.module.layout.project_explorer.project_data[project_idx].name == core.status.current_project_path) {
					$('#search_project_selectbox').append('<option value="/' + core.module.layout.project_explorer.project_data[project_idx].name + '" selected>' + temp_name + '</option>');
				} else {
					$('#search_project_selectbox').append('<option value="/' + core.module.layout.project_explorer.project_data[project_idx].name + '">' + temp_name + '</option>');
				}
			}

			$('#search_project_selectbox').append('<option value="/">All Projects</option>');
		}
	},

	parse_file_extension: function(val) {
		var result = [];
		val.split(',').map(function(name) {
			result.push('--include=' + name.trim());
		});
		return result;
	},

	search_replace: function() {
		var search_path;
		var keyword;
		var replace_word;
		var self = this;

		this.match_case = $('#search_match_case').hasClass('active');
		this.use_regexp = $('#search_use_regexp').hasClass('active');
		this.whole_word = $('#search_whole_word').hasClass('active');

		// if ($('#search_project_selectbox option:selected').val() == 'null') { // jeongmin: only 'null' search_path has to be filtered
		// 	alert.show(core.module.localization.msg.alert_project_not_selected);
		// 	return;
		// }
		keyword = $('#search_query_inputbox').val();
		if (!keyword) {
			alert.show(core.module.localization.msg.alert_input_search_keyword);
			return;
		}
		search_path = '/' + core.status.current_project_path + $('#search_path_input').val();
		replace_word = $('#s_replace_query_inputbox').val();

		this.current_options = {
			keyword: keyword,
			search_path: search_path,
			match_case: this.match_case,
			use_regexp: this.regexp,
			whole_word: this.whole_word
		};

		var grep_option = {};

		grep_option.use_regexp = this.use_regexp;
		grep_option.match_case = this.match_case;
		grep_option.whole_word = this.whole_word;

		if ($('#search_file_extension').val() !== '') {
			grep_option.include = this.parse_file_extension($('#search_file_extension').val());
		}

		this.query = keyword;

		var do_replace = function(old_word, new_word, grep_option, search_path) {
			var path_arr = search_path.split('/');
			var folder_path = path_arr.slice(2).join('/');

			var postdata = {
				find_query: old_word,
				replace_query: new_word,
				project_path: '/' + path_arr[1],
				folder_path: folder_path,
				grep_option: grep_option
			};

			// jeongmin: all projects
			if (search_path === '') {
				postdata.project_path = '';
			}

			if (!new_word) {
				postdata.replace_query = '';
			}

			var progress_elements = core.module.loading_bar.start({
				now: 0,
				unique: 'search.replace',
				kill: function() {
					core._socket.emit('kill_process', {
						kill: 'grep'
					});
				},
				beforeStop: function() {
					$('#g_s_btn_replace').removeAttr('disabled');
				}
			});
			if (!progress_elements) {
				return false;
			}
			self.progress_elements = progress_elements;
			$('#g_s_btn_replace').attr('disabled', 'disabled');

			core._socket.once('/file/search_and_replace', function(res) {

				core.progressbar.set(80, self.progress_elements.bar);

				if (res.error || res.total_match === 0) {
					// if it can't search keyword...
					core.module.toast.show(core.module.localization.msg.alert_cannot_find_word, null, function() {
						$('#search_query_inputbox').focus().select();
					});
				} else {
					// if finding success.
					if (res.data) {
						notice.show(res.total_match + core.module.localization.msg.notice_search_replace_changed + '<br>' + res.data.join('<br>'));

						var window_manager = core.module.layout.workspace.window_manager;
						var opened_window = [];
						for (var i = window_manager.window.length - 1; i >= 0; i--) {
							for (var j = 0; j < res.data.length; j++) {
								if (window_manager.window[i].title === res.data[j]) {
									opened_window.push({
										filepath: window_manager.window[i].filepath,
										filename: window_manager.window[i].filename,
										filetype: window_manager.window[i].filetype,
										title: window_manager.window[i].title
									});
								}
							}
						}
						for (i = 0; i < opened_window.length; i++) {
							window_manager.close_by_title(opened_window[i].title);
							window_manager.open(opened_window[i].filepath, opened_window[i].filename, opened_window[i].filetype);
						}
					}

					self.hide();
				}
				self.progress_elements.stop();
			});
			core._socket.emit('/file/search_and_replace', postdata);
		};

		var msg = '"' + keyword + '" > "' + replace_word + '"<br/>' + core.module.localization.msg.confirmation_search_replace;
		var confirm_option = {
			title: core.module.localization.msg.title_replace_all,
			message: msg,
			yes_text: core.module.localization.msg.yes,
			no_text: core.module.localization.msg.no,
			yes: function() {
				do_replace(keyword, replace_word, grep_option, search_path);
			},
			no: null
		};
		confirmation.init(confirm_option);
		confirmation.show();
	}
};
