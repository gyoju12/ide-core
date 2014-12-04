/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.layout.tab = {
	tab_key: {
		'left': 'Alt+Shift+',
		'right': 'Alt+',
		'bottom': 'Ctrl+Shift+' // maybe convert to 'meta' in shortcut module
	},
	tab_index: {
		'left': 1,
		'right': 1,
		'bottom': 1
	},
	list: {},
	buffer: [],
	// output tab in bottom layout
	output_manager: {
		context: null,
		table: null,
		
		init: function(context) {
			var self = this;
			this.context = context;
			
			this.create();
		},

		create: function() {
			$('[id="' + this.context + '"]').addClass('output_tab').html('<table cellpadding="0" cellspacing="0" border="0" class="display table table-hover table-condensed table-striped" id="' + this.context + '_table" ></table>');
			this.table = $('[id="' + this.context + '_table"]').dataTable({
				"aaData": [],
				"aoColumns": [{
					"mData": 'file',
					"sTitle": '<span localization_key="dictionary_file">' + core.module.localization.msg.dictionary_file + '</span>'
				}, {
					"mData": 'line',
					"sTitle": '<span localization_key="dictionary_line">' + core.module.localization.msg.dictionary_line + '</span>'
				}, {
					"mData": 'content',
					"sTitle": '<span localization_key="dictionary_content">' + core.module.localization.msg.dictionary_content + '</span>'
				}, ],
				"sDom": '<"H">Rrt',
				"paging": false,
				"iDisplayLength": -1,
				"oLanguage": {
					"sEmptyTable": '<span localization_key="output_tab_no_error">' + core.module.localization.msg.output_tab_no_error + '</span>'
				}
			});

			//$('[id="' + this.context + '_table"]').dataTable().fnSettings().oLanguage.sEmptyTable = ;
			this.set_event();
		},

		set_event: function() {
			var self = this;

			if (this.context && this.table) {
				$(document).on('click', '[id="' + this.context + '_table"] tbody td', function() {
					var aPos = self.table.fnGetPosition(this);
					var row = self.table.fnGetData(aPos[0]);

					var file = row.file.split('/');
					var line = row.line;
					line = parseInt(line, 10) - 1; // CodeMirror Start Line Number --> 0

					var filename = file.pop();
					filename = filename.split(":")[0];
					var filepath = file.join('/') + '/';

					var w = core.module.layout.workspace.window_manager.get_window(filepath, filename);
					if (w) {
						w.activate();
						w.editor.editor.setCursor(line);
					} else {
						$(core).one(filepath + '/' + filename + 'window_loaded', function() {
							var __w = core.module.layout.workspace.window_manager.get_window(filepath, filename);
							__w.editor.editor.setCursor(line);
						});

						core.module.layout.workspace.window_manager.open(filepath, filename, filename.split('.').pop());
					}
				});
				$(document).on('mousedown', '[id="' + this.context + '_table"] tbody td', function(e) {
					if (e.button == 2) {
						var parent = $(this).parent();
						var filepath = $(parent).children("td:nth-child(1)").text();
						var line = $(parent).children("td:nth-child(2)").text();
						var content = $(parent).children("td:nth-child(3)").text();
						ㅋ
						
					}
				});
			}
		},

		parse: function(raw, type) {
			var data = [];
			var regex = null;
			if (type === "cpp" || type === "c_examples" || type === "java" || type === "java_examples") {
				data = [];
				regex = /(.*)\/([^:]*):(\d+):(\d+)?:?(.*)/; // jeongmin: add (.*) -> contents

				// Cut Build Fail
				//
				raw = raw.substring(0, raw.indexOf('Build Fail'));
				raw = raw.split('\n');
				// raw = raw.split(' ');

				var find_error = function(i, m) {
					if (/:(\d+):/.test(m)) return true;
					else return false;
				};

				var get_content = function(i, msg) { // msg: start of error contents
					// 1. extract only contents
					var m = msg.replace(/\s?\w* error: /, ''); // jeongraw[i]in: not only ' error: ', but also ' fatal error: '
					var before_add = m; // jeongmin: for reverting added string

					// 2. check any other error contents is there
					for (var j = i + 1; j < raw.length; j++) {
						if (find_error(j, raw[j])) { // jeongmin: next error -> Should be ended now
							break;
						} else if (raw[j].indexOf('^') > -1) { // jeongmin: error position -> No need to include to contents
							m = before_add; // jeongmin: before error position, there is error code. We don't need to include error code to contents. So revert contents.

							break;
						}

						before_add = m;
						m += ' ' + raw[j];
					}

					return m;

					// var m = "";

					// for (var j = i + 1; j < raw.length; j++) {
					// 	m += ' ' + raw[j];

					// 	if (/:(\d+):/.test(raw[j])) {
					// 		m = m.substring(0, m.indexOf('/'));
					// 		m = m.replace(/\s?\w* error: /, ''); // jeongmin: not only ' error: ', but also ' fatal error: '
					// 		return m;
					// 	}
					// }

					// return m;
				};

				for (var i = 0; i < raw.length; i++) {
					if (find_error(i, raw[i])) {

						var match = raw[i].match(regex);
						//var content = match.pop()+": ";
						var filename = match[2];
						var line = match[3];
						var filepath = "";
						var temp_path = match[1].split('/');
						var is_path = false;
						var msg = match[5]; // jeongmin: start of error contents

						for (var k = 0; k < temp_path.length; k++) {
							if (temp_path[k] && temp_path[k] == core.status.current_project_path) is_path = true;
							if (!temp_path[k] || !is_path) continue;
							if (temp_path[k] == filename) return;

							filepath += temp_path[k] + '/';
						}

						var content = get_content(i, msg);

						data.push({
							'file': filepath + filename,
							'line': line,
							'content': content
						});
					}
				}

				return data;
			} else {
				return data;
			}
		},

		push: function(data) {

			if (this.table) {
				this.table.fnAddData({
					'file': data.file,
					'line': data.line,
					'content': data.content.split('\r\n')[0]
				});
			}
		},

		clear: function() {
			if (this.table) {
				this.table.fnClearTable();
			}
		}
	},

	update: function() {
		var self = this;
		var $tab_list = $('.goorm_tab_menu');

		$tab_list.each(function(i, o) {
			var $tab = $(o);
			var position = $tab.attr('position');

			var key = self.tab_key[position] + self.tab_index[position] ++;

			$tab.find('.helptext').html(key);
		});

		this.update_complete = true;
	},

	convert_position: function(p) {
		switch (p) {
			case 'west':
				p = 'left';
				break;
			case 'east':
				p = 'right';
				break;
			case 'south':
				p = 'bottom';
				break;
			default:
				break;
		}

		return p;
	},

	add: function(position, data) {
		var tab_container = null;
		var tab_content_container = null;

		var option = data || {};

		if (option.tab && option.tab_content) {
			if (!option.localization) {
				option.localization = {};
			}

			if (!this.update_complete) {
				this.queue(position, data);
			} else {
				tab_container = $('#' + position + '_tab');
				tab_content_container = tab_container.siblings('.tab-content');

				var tab_id = option.tab.id;
				var tab_content_id = option.tab_content.id;

				this.del(position, data);

				var content = (core.module.localization && option.localization.tab) ? core.module.localization.msg[option.localization.tab] : option.tab.content;
				var classes = option.tab_content['class'] || "";

				tab_container.append('<li><a id="' + tab_id + '" href="#' + tab_content_id + '" data-toggle="tab" localization_key="' + option.localization.tab + '">' + content + '</a></li>');
				tab_content_container.append('<div class="tab-pane fade ' + classes + '" id="' + tab_content_id + '" style="height:inherit">' + option.tab_content.content + '</div>');

				this.list[tab_id] = {
					'id': tab_id,
					'pane': position
				};

				option.tab.localization = option.localization;

				this.set_event(option.tab, this.convert_position(position), option.fn);

				if (data.tutorial) {
					if (core.module.tutorial.tab_steps["" + data.tutorial.step_name]) {
						core.module.tutorial.tab_steps["" + data.tutorial.step_name].push(data.tutorial);
					} else {
						core.module.tutorial.tab_steps["" + data.tutorial.step_name] = [];
						core.module.tutorial.tab_steps["" + data.tutorial.step_name].push(data.tutorial);
					}
				}

			}
		}
	},

	del: function(position, data) {
		var tab_container = null;
		var tab_content_container = null;

		var option = data || {};

		if (option.tab && option.tab_content) {
			tab_container = $('#' + position + '_tab');
			tab_content_container = tab_container.siblings('.tab-content');

			tab_container.find('[id="' + option.tab.id + '"]').parents('li').remove();
			tab_content_container.find('[id="' + option.tab_content.id + '"]').remove();

			this.off_event(option.tab, this.convert_position(position));


			if (data.tutorial) {
				var tab_step = core.module.tutorial.tab_steps["" + data.tutorial.step_name];
				if (tab_step) {
					for (var i = 0; i < tab_step.length; i++) {
						if (tab_step[i].plugin === data.tutorial.plugin) {
							tab_step.pop(i);
							break;
						}
					}
				}
			}

		}
	},

	// delete 'tab_name' tabs. Jeong-Min Im.
	// position: east, west, south, north
	// tab_name: debug, terminal, search, output ... (localization_key)
	del_by_tab_name: function(position, tab_name) {
		var tab_nav = $('#' + position + '_tab').find('[localization_key=' + tab_name + ']');

		if (tab_nav.length > 0) {
			var tab_id = tab_nav.attr('id');
			var tab_content_id = tab_nav.attr('href').split('#').pop();

			this.del(position, {
				'tab': {
					'id': tab_id
				},
				'tab_content': {
					'id': tab_content_id
				},
				'tutorial': {
					'step_name': tab_name + '_step'
				}
			});
		}
	},

	queue: function(position, data) {
		var self = this;

		// window.setTimeout(function() {
		var temp = $.debounce(function() {
			self.add(position, data);
		}, 100);
		temp();
	},

	/**
	 * @brief Set Tab Event
	 * @details Bind Tab Event by position
	 *
	 * @param position: west or east or south
	 * @return Nothing
	 */
	set_event: function(tab, position, fn) {
		var sm = core.module.shortcut_manager;
		var os = sm.getOStype();
		if (!fn) fn = function() {};

		var action = 'toggle_' + position + '_' + tab.id;

		// var key = ((os === 'mac') ? this.tab_key[position].replace(/Ctrl/g, 'meta') : this.tab_key[position]) + this.tab_index[position]++;
		var key = this.tab_key[position] + this.tab_index[position] ++; // jeongmin: other tabs' shortcut is composed by ctrl, so don't have to change ctrl to meta
		var html_key = (os === 'mac') ? sm.replace_hotkey(key).replace(/ /g, '') : key;
		var content = (core.module.localization) ? core.module.localization.msg[tab.localization.menu] : tab.content;

		// Bind Event
		//
		core.module.shortcut_manager.bind(action, key, fn);

		// Make UI (MainMenu - Perpectives & All ShortCut)
		//
		var li = '<li class="' + action + '" key="' + key + '"> \
					<a href="#" class="goorm_tab_menu" position="' + position + '" action="' + action + '" localization_key="' + tab.localization.menu + '"> \
						' + content + ' \
						<em class="helptext">' + html_key + '</em> \
					</a> \
				 </li>';

		var span = '<span class="' + action + '" localization_key="' + tab.localization.menu + '"> \
                        ' + content + ' \
                        <em class="helptext">' + html_key + '</em> \
                    </span>'

		$('li.goorm_perspectives_menu_end[position="' + position + '"]').before(li);
		$('span.goorm_perspectives_menu_end[position="' + position + '"]').before(span);

		// Set Action
		//
		$('.' + action).off('click');
		$('.' + action).click(function(e) {
			fn.call(this, e);
		});
	},

	off_event: function(tab, position) {
		var action = 'toggle_' + position + '_' + tab.id;
		var key = $('li.' + action).attr('key');

		if (key) {
			// UnBind Event
			//
			core.module.shortcut_manager.unbind(action, key);

			// Remove UI
			//
			$('li.' + action).remove();
			$('span.' + action).remove();

			// Off Action
			//
			$('.' + action).off('click');

			this.tab_index[position] --;
		}
	},

	set_tab_content: function() {

	},

	make_output_tab: function(plugin_name) {
		var tab_id = 'gLayoutOutput_' + plugin_name,
			tab_content_id = 'output_tab_' + plugin_name;

		// goorm.plugin[plugin_name].add_menu_action();

		////// remove output tab if exists //////
		// if ($('#' + tab_id).length !== 0)	// hidden by jeongmin: tab deletion is done before this function call
		// 	this.del('south', {
		// 		'tab': {
		// 			'id': tab_id
		// 		},
		// 		'tab_content': {
		// 			'id': tab_content_id
		// 		},
		// 		'tutorial': {
		// 			'step_name': 'output_step'
		// 		}
		// 	});

		// if (core.status.current_project_type === plugin_name) {	// hidden by jeongmin: this is decided on project open
		// Make Output Tab
		//	
		this.add('south', {
			'tab': {
				'id': tab_id,
				'content': 'Output'
			},
			'tab_content': {
				'id': tab_content_id,
				'content': ''
			},
			fn: function(e) {
				core.module.layout.select(tab_id);

				e.stopPropagation();
				e.preventDefault();
				return false;
			},
			'tutorial': {
				'step_name': 'output_step',
				'name': 'basic',
				'plugin': plugin_name,
				'element_id': 'goorm_inner_layout_bottom',
				'step': {
					element: '#goorm_inner_layout_bottom',
					title: "",
					content: core.module.localization.msg.tutorial_output_tab,
					placement: 'top',
					onShow: function(tour) {
						$('#south_tab #' + tab_id).tab('show');
					}
				}
			},
			'localization': { // jeongmin; add localization
				'tab': 'output',
				'menu': 'window_bottom_layout_output'
			}
		});

		this.output_manager.init(tab_content_id);

		if ($('#south_tab .active>a[data-toggle=tab]').attr('localization_key') == 'output' || $('#goorm_inner_layout_bottom>.tab-content .active').length <= 0)
			core.module.layout.select(tab_id);
		// }

	},


};