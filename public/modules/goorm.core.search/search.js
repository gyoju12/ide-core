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
	ignore_whitespace: false,
	use_regexp: false,
	replace_cursor: null,
	matched_file_list: [],
	treeview: null,
	query: null,
	current_options: null,
	last_option: null,

	init: function() {
		var self = this;

		this.panel = $("#dlg_search");

		var handle_ok = function() {
			self.search();
			// self.panel.modal('hide');
		};


		//clear button roles --heeje
		$('#search_clear>.clr-btn').click(function () {

			$("#search_clear .clr-btn").attr('disabled', 'disabled');
			$("#search_clear .refresh-btn").attr('disabled', 'disabled');
			$('#search_result').empty();
			$("#gLayoutTab_Search .badge").remove();
			self.last_option = null;
			self.unmark();
		});

		$('#search_clear>.refresh-btn').click(function () {
			$(core).one("event_save_all", function(e) {
				if(self.last_option != null) {
					self.search(self.last_option);
				} else {
					self.refresh();
				}
			});

			var save_cnt = 0;
			core.module.layout.workspace.window_manager.save_all(function() {
				if(save_cnt === (core.module.layout.workspace.window_manager.window.length-1)) {
					$(core).trigger("event_save_all");
					$('#south_tab #gLayoutTab_Search').click();
				} else {
					save_cnt++;
				}
			});
		});

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_search",
			id: "dlg_search",
			handle_ok: handle_ok,
			success: function() {
				$("#search_project_selector").append("<select id='search_project_selectbox' class='form-control'></select>");
				$("#search_project_selector").append("<label id='search_path_input' class='control-label' style='display:none'>hi</label>");

				$("#search_project_selectbox").change(function() {});

				$("#search_query_inputbox").keydown(function (e) {
					var ev = e || event;

					if (ev.keyCode == 13) {
						handle_ok();

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

				var input_box = document.getElementById("search_query_inputbox");
				input_box.onfocus = function() {
					moveCaretToEnd(input_box);

					// Work around Chrome's little problem
					// window.setTimeout(function() {
					var temp = $.debounce(function() {
						moveCaretToEnd(input_box);
					}, 5);
					temp();
				};

				// Checkbox event handler

				// $("#search_match_case_checkbox_name").click(function () {
				// 	if ($("#search_match_case")[0].checked === true) {
				// 		$("#search_match_case")[0].checked = false;
				// 		self.match_case = false;
				// 	} else {
				// 		$("#search_match_case")[0].checked = true;
				// 		self.match_case = true;
				// 	}
				// });

				// $("#search_ignore_whitespace_checkbox_name").click(function () {
				// 	if ($("#search_ignore_whitespace")[0].checked === true) {
				// 		$("#search_ignore_whitespace")[0].checked = false;
				// 		self.ignore_whitespace = false;
				// 	} else {
				// 		$("#search_ignore_whitespace")[0].checked = true;
				// 		self.ignore_whitespace = true;
				// 	}
				// });

				self.panel.on('shown.bs.modal', function() {
					$("#find_query_inputbox").focus();
					$("#find_query_inputbox").select();
					// cut modal fade (dialog size)

					var goorm_dialog_container = $("#dlg_search");
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
					$("#search_query_inputbox").focus();
				});
				// $("#search_use_regexp_checkbox_name").click(function () {
				// 	if ($("#search_use_regexp")[0].checked === true) {
				// 		$("#search_use_regexp")[0].checked = false;
				// 		self.use_regexp = false;
				// 		$("#search_match_case")[0].disabled = false;
				// 		$("#search_ignore_whitespace")[0].disabled = false;
				// 	} else {
				// 		$("#search_use_regexp")[0].checked = true;
				// 		self.use_regexp = true;
				// 		$("#search_match_case")[0].checked = false;
				// 		$("#search_match_case")[0].disabled = true;
				// 		$("#search_ignore_whitespace")[0].checked = false;
				// 		$("#search_ignore_whitespace")[0].disabled = true;
				// 	}
				// });
			}
		});

		// $(core).on("on_preference_confirmed", function () {
		// 	self.refresh();
		// });

	},
	
	//useonly(mode=goorm-oss)
	search: $.throttle(function() {
	
		var self = this;
		var search_path;
		

		this.match_case = $("#search_match_case").hasClass("active");
		this.use_regexp = $("#search_use_regexp").hasClass("active");
		this.ignore_whitespace = $("#search_ignore_whitespace").hasClass("active");
		
		//useonly(mode=goorm-oss)
		if ($("#search_path_input").css('display') != 'none') {
				search_path = $("#search_path_input").text();
			} else {
				search_path = $("#search_project_selectbox option:selected").attr("value");
			}
			if (search_path == 'null') { // jeongmin: only 'null' search_path has to be filtered
				return;
			}
			var keyword = $("#search_query_inputbox").val();
			if (!keyword) {
				alert.show(core.module.localization.msg.alert_input_search_keyword);
				return;
			}
		
		this.current_options = {
			keyword: keyword,
			search_path: search_path,
			match_case: this.match_case,
			use_regexp: this.regexp,
			ignore_whitespace: this.ignore_whitespace
		};

		// var grep_option = " -r -n -R";
		// var text = keyword;
		// var caseFold = true;

		// if (this.use_regexp === true) {
		// 	grep_option += " -E";
		// } else {
		// 	if (this.match_case === true) {
		// 		caseFold = false;
		// 	} else {
		// 		grep_option += " -i";
		// 	}

		// 	if (this.ignore_whitespace === true)
		// 		text = text.replace(/\s*/g, '');
		// }
		var grep_option = {};
		var text = keyword;

		grep_option.use_regexp = this.use_regexp;
		grep_option.match_case = this.match_case;

		if (this.ignore_whitespace === true)
			text = text.replace(/\s*/g, '');

		this.query = text;
		// text = "\"" + text + "\"";	// jeongmin: exec is changed to spawn, so "" is no need on keyword.

		// grep_option += " --exclude={.*,bin,file.list,goorm.manifest}";
		
		//useonly(mode=goorm-oss)
		self.get_matched_file(text, grep_option, search_path);
		
		//this.panel.modal('hide');	//jeongmin: when search is done, hide modal
	}, 1000),

	convert_data_to_tree: function (json) {
		var data = [];

		for (var key in json) {

			//check if manifest file is there -- heeje
			// if (key.match('.(goorm.manifest)'))	// hidden by jeongmin: done at server part
			// 	continue;

			var obj = json[key];
			if (!obj.filepath) continue;
			var d = {};

			if (obj.badge) {
				d.type = "root";
				d.parent = "#";
				d.text = key + "<span class=\"badge\">" + obj.badge + "</span>";
			} else {
				var split_key = key.split(':');
				d.type = "file";
				d.parent = obj.parent;
				// Set 'filepath:linenumber'
				// 'line number' is first_line_number + mached_line
				// d.text = split_key[0] + ":" + (parseInt(split_key[1]) + parseInt(core.preference["preference.editor.first_line_number"]) - 1);
				d.text = key;
			}
			d.id = key;
			d.li_attr = {
				filename: obj.filename,
				filepath: obj.filepath,
				filetype: obj.filetype,
				matched_line: obj.matched_line,
				badge: obj.badge
			};
			d.icon = false;
			data.push(d);
		}
		return data;
	},
	
	//useonly(mode=goorm-oss)
	set_search_treeview: function (data) {
	
		var self = this;

		//activate tab
		//core.module.layout.select('search');
		// $("#gLayoutTab_Search").click();

		// //south pane should be expand....
		// //core.module.layout.inner_layout.getUnitByPosition("bottom").expand();
		// $("#goorm_center_inner_layout .ui-layout-toggler-south-closed").click()
		core.module.layout.select('search');

		var window_manager = core.module.layout.workspace.window_manager;
		var firstActivate = window_manager.active_window;
		
		//useonly(mode=goorm-oss)
		var search = function(filename, filetype, filepath, matched_line) {
		
			window_manager.open(filepath, filename, filetype, null, null, function(__window) {
				// setTimeout(function() {
				var temp = $.debounce(function() {
					var cm = __window.editor.editor;
					cm.focus();
					cm.setCursor(matched_line - 1);

					if (self.query) {
						var caseFold = true;

						if (self.use_regexp !== true && self.match_case === true) {
							caseFold = false;
						}
						self.unmark();
						for (var cursor = cm.getSearchCursor(self.query, null, caseFold); cursor.findNext();) {
							self.marked.push(
								cm.markText(cursor.from(), cursor.to(), {
									'className': 'cm-matchhighlight'
								})
							);
						}

						// variable 'searching' means this state is showing yellow marker
						__window.searching = true;
					}
					
				}, 400);
				temp();
			});
		};

		if (data) {
			// console.log(data);
			// console.log(this.convert_data_to_tree(data));
			var project_root = this.convert_data_to_tree(data);

			var on_dblclick = function (e, node) {
				if (node.li_attr) {

					var filename = node.li_attr.filename;
					var filetype = node.li_attr.filetype;
					var filepath = node.li_attr.filepath;
					var matched_line = node.li_attr.matched_line;
					if(node.li_attr.badge === undefined) {
						search(filename, filetype, filepath, matched_line, function() {
							var window_manager = core.module.layout.workspace.window_manager;
							var active_window = window_manager.active_window;
							if (active_window > -1) {
								CodeMirror.commands.showInCenter(window_manager.window[active_window].editor.editor);
								window_manager.window[active_window].editor.focus();
							}
						});	
					}
					
				}
			};
			
			if (this.treeview) self.treeview.destroy();
			this.treeview = null;

			this.treeview = new goorm.core.utility.treeview("#search_result", {
				project_path: "search",
				// on_select: on_select,
				root_node: project_root,
				// wholerow: false,	// hidden: want to show wholerow
				sort: false,
				auto_load_root: false,
				on_ready: function() {},
				on_dblclick: on_dblclick,
				
				fetch: function (path, callback) {
					callback(null);
				}
			});

			var active_window = window_manager.window[window_manager.active_window];

			if (active_window && active_window.editor) {
				CodeMirror.commands.clearSearch(window_manager.window[window_manager.active_window].editor.editor); // jeongmin: initialize highlight
				window_manager.window[window_manager.active_window].searching = false;
			}
		} else {
			if (window_manager.window[window_manager.active_window]) {
				window_manager.window[window_manager.active_window].editor.clear_highlight();
				window_manager.window[window_manager.active_window].searching = false;
			}

			$("#search_result").empty();
			var html = "<div class='node' style='padding: 2px 5px;'>" + core.module.localization.msg.notice_no_matched_fild + "</div>";
			$("#search_result").append(html);
		}

		if (window_manager.window[firstActivate])
			window_manager.window[firstActivate].activate();
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
		if (search_path == '')
			postdata.project_path = '';
		
		var progress_elements = core.module.loading_bar.start({
			now: 0,
			unique: "search",
			beforeStop: function(){
				$("#g_s_btn_ok").removeAttr("disabled");
			}
		});
		if(!progress_elements){
			return false;
		}
		this.progress_elements = progress_elements;
		$("#g_s_btn_ok").attr("disabled", "disabled");
		self.matched_file_list = [];
		//var progress_elements = core.module.loading_bar.start();

		core._socket.once("/file/search_on_project", function(res) {
			// console.log("A");
			// console.log(self.progress_elements.bar);
			core.progressbar.set(80, self.progress_elements.bar);

			// var length = 0;
			// if (!res.error) {
			// 	for(var attr in res.data) {length++;}
			// }

			if (res.error || res.data.total_match === 0) {
				//		core.module.toast.show(res.error, null, function (){
				//			$('#search_query_inputbox').focus();
				//		});
				// if it can't search keyword...
				core.module.toast.show(core.module.localization.msg.alert_cannot_find_word, null, function() {
					$('#search_query_inputbox').focus();
				});
			}
			// if (length === 0) {
			// 	console.log(core.module.localization.msg.alert_cannot_find_word);
			// 	core.module.toast.show(core.module.localization.msg.alert_cannot_find_word, null, function (){
			// 		$('#search_query_inputbox').focus();
			// 	});
			// }
			else {
				// if finding success.
				var data = res.data;
				
				//useonly(mode=goorm-oss)
				self.set_search_treeview(data);
				

				if ($("#gLayoutTab_Search .badge").length > 0) //jeongmin: if already there is badge
					$("#gLayoutTab_Search .badge").html(data.total_match); //then just change number
				else //if there isn't badge yet
					$("#gLayoutTab_Search").prepend("<span class='badge pull-right'>" + data.total_match + "</span>"); //then attach badge next to the search tab

				$("#search_clear>.clr-btn").removeAttr('disabled');
				$("#search_clear>.refresh-btn").removeAttr('disabled');

				self.hide();
			}
			self.progress_elements.stop();
			//progress_elements.stop();
		});
		core._socket.emit("/file/search_on_project", postdata);


	},

	unmark: function () {
		for (var i = 0; i < this.marked.length; ++i) this.marked[i].clear();
		this.marked.length = 0;

		var windows = core.module.layout.workspace.window_manager.window;

		for (var i = windows.length - 1; 0 <= i; i--) {
			windows[i].searching = false;
		}
	},

	refresh: function () {
		var self = this;
		var options = this.current_options;
		if (options) {
			self.get_matched_file(options.keyword, {
				use_regexp: options.use_regexp,
				match_case: options.match_case
			}, options.search_path);
		}
	},

	show: function (path) {
		if (path) {
			$("#search_project_selectbox").css('display', 'none');
			$("#search_path_input").css('display', '');
			$("#search_path_input").text(path);
		} else {
			$("#search_project_selectbox").css('display', '');
			$("#search_path_input").css('display', 'none');
		}
		this.make_search_project_selectbox();

		$("#search_query_inputbox").val("");
		// Get current active_window's editor
		var window_manager = core.module.layout.workspace.window_manager;
		if (window_manager.window[window_manager.active_window] && window_manager.window[window_manager.active_window].editor !== undefined) {
			// Get current active_window's CodeMirror editor
			var editor = window_manager.window[window_manager.active_window].editor;

			if(editor) {
				editor = window_manager.window[window_manager.active_window].editor.editor;

				if (editor && editor.getSelection() !== "") {
					$("#search_query_inputbox").val(editor.getSelection());
				}
			}
		}

		$("#search_match_case").tooltip();
		$("#search_ignore_whitespace").tooltip();
		$("#search_use_regexp").tooltip();

		this.panel.modal('show');
		$("#search_query_inputbox").focus();
	},

	hide: function() {
		if (this.panel && this.panel.modal) {
			this.panel.modal('hide');
		}
	},

	make_search_project_selectbox: function() {
		$("#search_project_selectbox").empty();

		$("#search_project_selectbox").append("<option value='null' localization_key='dialog_search_project_select_guide' selected>" + core.module.localization.msg.notice_search_select_project + "</option>");

		var max_num = $("#search_project_selector").width(); //jeongmin: set max_num as selectbox's width

		if (core.module.layout.project_explorer.project_data) {
			for (var project_idx = 0; project_idx < core.module.layout.project_explorer.project_data.length; project_idx++) {
				var temp_name = core.module.layout.project_explorer.project_data[project_idx].name;

				// if (temp_name.length > max_num) {
				// 	temp_name = temp_name.substring(0, max_num - 1);
				// 	temp_name += " …";
				// }

				if (core.module.layout.project_explorer.project_data[project_idx].name == core.status.current_project_path) {
					$("#search_project_selectbox").append("<option value='/" + core.module.layout.project_explorer.project_data[project_idx].name + "' selected>" + temp_name + "</option>");
				} else {
					$("#search_project_selectbox").append("<option value='/" + core.module.layout.project_explorer.project_data[project_idx].name + "'>" + temp_name + "</option>");
				}
			}

			$("#search_project_selectbox").append("<option value=''>All Projects</option>");
		}
	}
};