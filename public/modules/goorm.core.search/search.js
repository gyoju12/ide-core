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
	matched_file_list: [],
	treeview: null,
	query: null,
	current_options: null,
	last_option: null,

	init: function() {
		var self = this;

		this.panel = $('#dlg_search');

		var handle_ok = function() {
			self.search();
			// self.panel.modal('hide');
		};

		//clear button roles --heeje
		$('#search_clear>.clr-btn').click(function() {
			$('#search_keyword_wrapper').css('display', 'none');
			$('#search_clear .clr-btn').attr('disabled', 'disabled');
			$('#search_clear .refresh-btn').attr('disabled', 'disabled');
			$('#search_result_table').empty();
			$('#gLayoutTab_Search .badge').remove();
			self.last_option = null;
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

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: 'title_search',
			id: 'dlg_search',
			handle_ok: handle_ok,
			success: function() {
				$('#search_project_selectbox').change(function(e) {
					var selected_option = e.target.selectedOptions[0].value;
					var $input = $('#search_path_input');

					if (selected_option === '/' || selected_option === 'null') {
						$input.val('/');
						$input.prop('disabled', true);
					} else {
						$input.prop('disabled', false);
						$input.focus().select();
					}
				});

				$('#search_query_inputbox').keydown(function(e) {
					var ev = e || event;

					if (ev.keyCode == 13) {
						handle_ok();

						e.stopPropagation();
						e.preventDefault();
						return false;
					}
				});

				// focus find inputbox by native javascript
				// var moveCaretToEnd = function(el) {
				// 	if (typeof el.selectionStart == 'number') {
				// 		el.selectionStart = el.selectionEnd = el.value.length;
				// 	} else if (typeof el.createTextRange != 'undefined') {
				// 		el.focus();

				// 		var range = el.createTextRange();
				// 		range.collapse(false);
				// 		range.select();
				// 	}
				// };
				$('#search_use_regexp').click(function() {
					if (!$('#search_whole_word').hasClass('disabled')) {
						$('#search_whole_word').addClass('disabled');
						$('#search_match_case').addClass('disabled');
					} else {
						$('#search_whole_word').removeClass('disabled');
						$('#search_match_case').removeClass('disabled');
					}
					if (!$('#search_use_regexp').hasClass('active')) {
						$('#search_query_inputbox').trigger('change');
					} else {
						$('#search_query_inputbox_background').val('');
					}
				});

				var inputbox = $('#search_query_inputbox'); //document.getElementById('search_query_inputbox');
				var inputbox_background = $('#search_query_inputbox_background');
				var make_shadow = function() {
					if ($('#search_use_regexp').hasClass('active')) {
						var value = inputbox.val();
						var scroll = inputbox.scrollLeft();
						if (value.length > 0) {
							if (scroll > 0) {
								inputbox_background.css('padding-left', '8px');
							} else {
								inputbox_background.css('padding-left', '4px');
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
				// inputbox.on('focus', function() {
				// 	moveCaretToEnd(inputbox);

				// 	// Work around Chrome's little problem
				// 	// window.setTimeout(function() {
				// 	var temp = $.debounce(function() {
				// 		moveCaretToEnd(inputbox);
				// 	}, 5);
				// 	temp();
				// });

				// Checkbox event handler

				// $('#search_match_case_checkbox_name').click(function () {
				// 	if ($('#search_match_case')[0].checked === true) {
				// 		$('#search_match_case')[0].checked = false;
				// 		self.match_case = false;
				// 	} else {
				// 		$('#search_match_case')[0].checked = true;
				// 		self.match_case = true;
				// 	}
				// });

				// $('#search_ignore_whitespace_checkbox_name').click(function () {
				// 	if ($('#search_ignore_whitespace')[0].checked === true) {
				// 		$('#search_ignore_whitespace')[0].checked = false;
				// 		self.ignore_whitespace = false;
				// 	} else {
				// 		$('#search_ignore_whitespace')[0].checked = true;
				// 		self.ignore_whitespace = true;
				// 	}
				// });

				self.panel.on('shown.bs.modal', function() {
					$('#find_query_inputbox').focus();
					$('#find_query_inputbox').select();
					// cut modal fade (dialog size)

					var goorm_dialog_container = $('#dlg_search');
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
						// .css('top', top + 'px')
						// .css('left', left + 'px');

						$(document).off('focusin.bs.modal');
					} else {
						goorm_dialog_container.css('top', '0px');

						if (window_height > container_height) {
							container.css('margin-top', ((window_height - container_height) / 2) + 'px');
						} else {
							container.css('margin-top', '10px');
						}
					}
					$('#search_query_inputbox').focus();
				});
				// $('#search_use_regexp_checkbox_name').click(function () {
				// 	if ($('#search_use_regexp')[0].checked === true) {
				// 		$('#search_use_regexp')[0].checked = false;
				// 		self.use_regexp = false;
				// 		$('#search_match_case')[0].disabled = false;
				// 		$('#search_ignore_whitespace')[0].disabled = false;
				// 	} else {
				// 		$('#search_use_regexp')[0].checked = true;
				// 		self.use_regexp = true;
				// 		$('#search_match_case')[0].checked = false;
				// 		$('#search_match_case')[0].disabled = true;
				// 		$('#search_ignore_whitespace')[0].checked = false;
				// 		$('#search_ignore_whitespace')[0].disabled = true;
				// 	}
				// });
			}
		});

		// $(core).on('on_preference_confirmed', function () {
		// 	self.refresh();
		// });

	},

	
	//useonly(mode=goorm-oss)
	search: $.throttle(function() {
		var search_path;

		this.match_case = $('#search_match_case').hasClass('active');
		this.use_regexp = $('#search_use_regexp').hasClass('active');
		this.whole_word = $('#search_whole_word').hasClass('active');

		if ($('#search_project_selectbox option:selected').val() == 'null') { // jeongmin: only 'null' search_path has to be filtered
			return;
		}
		var keyword = $('#search_query_inputbox').val();
		if (!keyword) {
			alert.show(core.module.localization.msg.alert_input_search_keyword);
			return;
		}
		search_path = $('#search_project_selectbox option:selected').val() + $('#search_path_input').val();
		this.current_options = {
			keyword: keyword,
			search_path: search_path,
			match_case: this.match_case,
			use_regexp: this.regexp,
			whole_word: this.whole_word
		};

		var grep_option = {};
		var text = keyword;

		grep_option.use_regexp = this.use_regexp;
		grep_option.match_case = this.match_case;
		grep_option.whole_word = this.whole_word;

		if ($('#search_file_extension').val() !== '') {
			grep_option.include = this.parse_file_extension($('#search_file_extension').val());
		}

		this.query = text;

		this.get_matched_file(text, grep_option, search_path);
	}, 1000),
	
	
	//useonly(mode=goorm-oss)
	set_search_table: function(data, refactor) {
		var self = this;
		core.module.layout.select('search');

		var window_manager = core.module.layout.workspace.window_manager;
		var firstActivate = window_manager.active_window;

		if (data) {
			var string = '';
			var i = 0;
			var parent_node = '';
			var filtering = function(string) {
				string = ((string.replace(/&/g, '&amp;')).replace(/\"/g, '&quot;')).replace(/\'/g, '&#39;');
				string = string.replace(/</g, '&lt;').replace(/>/g, '&gt;').split(/\t/).join('&nbsp;&nbsp;&nbsp;&nbsp;').split(/\s/).join('&nbsp;');
				return string;
			};
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

			/** draw treetable **/
			$('#search_result_table').empty();
			$('#search_result_table').treetable({
				expandable: true,
				clickableNodeNames: true,
				initialState: 'collapsed',
				indent: 5
			}, true);

			for (var attr in data) {
				var temp = attr.split('/');
				var filename = temp.pop();
				var filepath = temp.join('/') + '/';
				var filetype = filename.split('.').pop();
				if (filetype === '') {
					filetype = 'etc';
				}

				string = '<tr class="search_filename" data-tt-id=file-' + i + ' filename="' + filename + '" filepath="' + filepath + '" filetype="' + filetype + '"><td><span>' + attr + '</span></td></tr>';
				$('#search_result_table').treetable('loadBranch', null, string);
				parent_node = $('#search_result_table').treetable('node', 'file-' + i);

				data[attr].map(function(obj, idx, arr) {
					string = '<tr data-tt-id=content-' + i + '-' + idx + ' data-tt-parent-id=file-' + i + '><td><div class="search_block">';
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
						string += '<span>' + separator + '</span>'
						string += '<span class="search_code">' + filtering(obj.code[j]) + '</span>';
						string += '</div><br>';
					}
					if (idx < arr.length - 1) {
						string += '<tr data-tt-id=content-' + i + '-' + idx + '-c data-tt-parent-id=file-' + i + '><td><div class="search_block"><span class="search_connect" style="margin-left:15px;">...</span></div></td></tr>';
					}
					string += '</div></td></tr>';
					$('#search_result_table').treetable('loadBranch', parent_node, string);
				});
				i++;
			}

			/** event **/
			$('.search_block').off('dblclick');
			$('.search_block').on('dblclick', function(e) {
				if (e.target.className === 'search_connect') {
					return;
				}
				var parent_id = $(this).parents('tr').data('ttParentId');
				var $parent_node = $('.search_filename[data-tt-id="' + parent_id + '"]');
				var filename = $parent_node.attr('filename');
				var filepath = $parent_node.attr('filepath');
				var filetype = $parent_node.attr('filetype');
				var matched_line = parseInt($($(this).find('.search_match_line .search_num')[0]).text(), 10);

				search(filename, filetype, filepath, matched_line, function() {
					var active_window = window_manager.active_window;
					if (active_window > -1) {
						CodeMirror.commands.showInCenter(window_manager.window[active_window].editor.editor);
						window_manager.window[active_window].editor.focus();
					}
				});
			});

			$('.search_match_line').off('mouseover');
			$('.search_match_line').on('mouseover', function(e) {
				$(this).addClass('match_line_over');
				$('.match_line_over').not(this).removeClass('match_line_over');
			});

		} else {
			if (window_manager.window[window_manager.active_window]) {
				window_manager.window[window_manager.active_window].editor.clear_highlight();
				window_manager.window[window_manager.active_window].searching = false;
			}

			$('#search_result').empty();
			var html = '<div class="node" style="padding: 2px 5px;">' + core.module.localization.msg.notice_no_matched_file + '</div>';
			$('#search_result').append(html);
		}

		if (window_manager.window[firstActivate]) {
			window_manager.window[firstActivate].activate();
		}
	},
	
	
	//useonly(mode=goorm-oss)
	get_matched_file: function(text, grep_option, search_path) {
		var self = this;
		var path_arr = search_path.split('/');
		var folder_path = path_arr.slice(2).join('/');

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
		this.matched_file_list = [];

		core._socket.once('/file/search_on_project', function(res) {
			core.progressbar.set(80, self.progress_elements.bar);

			if (res.error || res.data.total_match === 0) {
				// if it can't search keyword...
				core.module.toast.show(core.module.localization.msg.alert_cannot_find_word, null, function() {
					$('#search_query_inputbox').focus();
				});
			} else {
				// if finding success.
				var data = res.data;

				// self.set_search_treeview(data);
				self.set_search_table(data.nodes, refactor);

				if ($('#gLayoutTab_Search .badge').length > 0) { //jeongmin: if already there is badge
					$('#gLayoutTab_Search .badge').html(data.total_match); //then just change number
				} else { //if there isn't badge yet
					$('#gLayoutTab_Search').prepend('<span class="badge pull-right">' + data.total_match + '</span>'); //then attach badge next to the search tab
				}
				$('#search_clear>.clr-btn').removeAttr('disabled');
				$('#search_clear>.refresh-btn').removeAttr('disabled');

				self.hide();
			}
			self.progress_elements.stop();
		});
		core._socket.emit('/file/search_on_project', postdata);
	},
	
	unmark: function() {
		for (var i = 0; i < this.marked.length; ++i) {
			this.marked[i].clear();
		}
		this.marked.length = 0;

		var windows = core.module.layout.workspace.window_manager.window;

		for (var i = windows.length - 1; 0 <= i; i--) {
			windows[i].searching = false;
		}
	},

	refresh: function() {
		var self = this;
		var options = this.current_options;
		if (options) {
			self.get_matched_file(options.keyword, {
				use_regexp: options.use_regexp,
				match_case: options.match_case
			}, options.search_path);
		}
	},

	show: function(path) {
		if (path) {
			$('#search_path_input').val(path.replace(RegExp(core.status.current_project_path + '/', 'g'), ''));
		} else {
			$('#search_path_input').val('/');
		}
		this.make_search_project_selectbox();

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

		$('#search_match_case').tooltip();
		$('#search_whole_word').tooltip();
		$('#search_use_regexp').tooltip();

		this.panel.modal('show');
		$('#search_query_inputbox').focus();
		$('#search_query_inputbox').select();
	},

	hide: function() {
		if (this.panel && this.panel.modal) {
			this.panel.modal('hide');
		}
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
	}
};
