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
	manager: null,

	init: function() {
		this.output_manager = goorm.core.layout.tab.output_manager;
		this.terminal_manager = goorm.core.layout.tab.terminal_manager;
	},

	update: function() {
		var self = this;
		var $tab_list = $('.goorm_tab_menu');

		$tab_list.each(function(i, o) {
			var $tab = $(o);
			var position = $tab.attr('position');

			var key = self.tab_key[position] + self.tab_index[position]++;

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

		var options = data || {};

		if (options.tab && options.tab_content) {
			if (!options.localization) {
				options.localization = {};
			}

			if (!this.update_complete) {
				this.queue(position, data);
			} else {
				tab_container = $('#' + position + '_tab');
				tab_content_container = tab_container.siblings('.tab-content');

				var tab_id = options.tab.id;
				var tab_content_id = options.tab_content.id;

				this.del(position, data);

				var content = (core.module.localization && core.module.localization.msg && options.localization.tab && core.module.localization.msg[options.localization.tab]) ? core.module.localization.msg[options.localization.tab] : options.tab.content;
				var localization_replace = (options.tab_content.localization_replace) ? options.tab_content.localization_replace : [];
				var classes = options.tab_content['class'] || '';
				var fade = (options.tab_content.fade === false) ? false : true;

				fade = (fade) ? 'fade' : '';

				$.each(localization_replace, function(i, v) {
					options.tab_content.content = options.tab_content.content.replace('/' + v + '/', core.module.localization.msg[v]);
				});

				tab_container.append('<li><a id="' + tab_id + '" href="#' + tab_content_id + '" data-toggle="tab" localization_key="' + options.localization.tab + '">' + content + '</a></li>');
				tab_content_container.append('<div class="tab-pane ' + fade + ' ' + classes + '" id="' + tab_content_id + '" style="height:100%">' + options.tab_content.content + '</div>');

				this.list[tab_id] = {
					'id': tab_id,
					'pane': position
				};

				options.tab.localization = options.localization;

				this.set_event(options.tab, this.convert_position(position), options.fn);

				if (data.tutorial) {
					if (core.module.tutorial.tab_steps['' + data.tutorial.step_name]) {
						core.module.tutorial.tab_steps['' + data.tutorial.step_name].push(data.tutorial);
					} else {
						core.module.tutorial.tab_steps['' + data.tutorial.step_name] = [];
						core.module.tutorial.tab_steps['' + data.tutorial.step_name].push(data.tutorial);
					}
				}

				goorm.core.terminal.dummy();

			}
		}
	},

	del: function(position, data) {
		var tab_container = null;
		var tab_content_container = null;

		var options = data || {};

		if (options.tab && options.tab_content) {
			tab_container = $('#' + position + '_tab');
			tab_content_container = tab_container.siblings('.tab-content');

			tab_container.find('[id="' + options.tab.id + '"]').parents('li').remove();
			tab_content_container.find('[id="' + options.tab_content.id + '"]').remove();

			this.off_event(options.tab, this.convert_position(position));

			if (data.tutorial) {
				var tab_step = core.module.tutorial.tab_steps['' + data.tutorial.step_name];
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
		var self = this;
		var sm = core.module.shortcut_manager;
		var os = sm.getOStype();
		if (!fn) {
			fn = function() {};
		}

		var action = 'toggle_' + position + '_' + tab.id;

		// var key = ((os === 'mac') ? this.tab_key[position].replace(/Ctrl/g, 'meta') : this.tab_key[position]) + this.tab_index[position]++;
		var key = this.tab_key[position] + this.tab_index[position]++; // jeongmin: other tabs' shortcut is composed by ctrl, so don't have to change ctrl to meta
		var html_key = (os === 'mac') ? sm.replace_hotkey(key).replace(/ /g, '') : key;
		var content = (core.module.localization && core.module.localization.msg && core.module.localization.msg[tab.localization.menu]) ? core.module.localization.msg[tab.localization.menu] : tab.content;
		var select_func = function(e) {
			var index = e.data && parseInt(e.data.slice(-1));

			if (index) { // just toggle nth tab as default
				core.module.layout.select({
					'index': index - 1,
					'position': position
				});
			} else {
				core.module.layout.select(tab.id);
			}

			self.show_showing_icon(tab.id);

			fn(e);
		};
		// Bind Event
		//
		core.module.shortcut_manager.bind(action, key, select_func);

		// Make UI (MainMenu - Perpectives & All ShortCut)
		//
		var li = '<li class="' + action + '" key="' + key + '">' +
			'<a href="#" class="goorm_tab_menu" position="' + position + '" action="' + action + '" localization_key="' + tab.localization.menu + '" applied>' +
			content +
			'<span class="menu-show menu-prepend pull-left">' +
			'<span class="glyphicon glyphicon-ok ' + tab.id + '_showing_icon"></span>' +
			'</span>' +
			'<em class="helptext">' + html_key + '</em>' +
			'</a>' +
			'</li>';

		var span = '<span class="' + action + '" localization_key="' + tab.localization.menu + '">' +
			content +
			'<em class="helptext">' + html_key + '</em>' +
			'</span>';

		$('li.goorm_perspectives_menu_end[position="' + position + '"]').before(li);
		$('span.goorm_perspectives_menu_end[position="' + position + '"]').before(span);

		// Set Action
		//
		$('.' + action).off('click');
		$('.' + action).click(function(e) {
			$('#child_perspectives_menu').hide();

			self.toggle(tab.id, function() {
				select_func(e);
			});
		});
	},

	off_event: function(tab, position) {
		var action = 'toggle_' + position + '_' + tab.id;
		var key = $('li.' + action).attr('key');

		if (key) {
			// Off Action
			//
			$('.' + action).off('click');

			this.tab_index[position]--;

			// decrease other tabs
			var added_tabs = $('li.' + action).nextAll('[key]');
			var added_tabs_len = added_tabs.length - 1;

			for (var i = added_tabs_len; 0 <= i; i--) {
				var added_tab = $(added_tabs[i]);
				var old_key = added_tab.attr('key');
				var index = parseInt(old_key.slice(-1));
				var helptext = added_tab.find('.helptext').html();

				// update shortcut html
				added_tab.attr('key', old_key.replace(index, index - 1));
				$('.' + added_tab.attr('class')).find('.helptext').html(helptext.replace(index, index - 1));

				if (i === added_tabs_len) { // last key
					key = old_key;
				}
			}

			// UnBind Event
			//
			core.module.shortcut_manager.unbind(action, key);

			// Remove UI
			//
			$('li.' + action).remove();
			$('span.' + action).remove();
		}
	},

	make_output_tab: function(plugin_name) {
		var tab_id = 'gLayoutOutput_' + plugin_name;
		var tab_content_id = 'output_tab_' + plugin_name;

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
					element: '#' + tab_id,
					title: '',
					content: core.module.localization.msg.tutorial_output_tab,
					placement: 'top',
					onShow: function() {
						core.module.layout.select(tab_id);
					}
				}
			},
			'localization': { // jeongmin; add localization
				'tab': 'output',
				'menu': 'window_bottom_layout_output'
			}
		});

		this.output_manager.load(tab_content_id);

		if ($('#south_tab .active>a[data-toggle=tab]').attr('localization_key') == 'output' || $('#goorm_inner_layout_bottom>.tab-content .active').length <= 0) {
			core.module.layout.select(tab_id);
		}
	},

	make_background_tab: function() {

	},

	toggle: function(tab_id, show_func) {
		var tab_nav = $('#' + tab_id).parent();

		if (tab_nav.css('display') !== 'none') {
			if (tab_nav.hasClass('active')) {
				var next = tab_nav.next(':not([style*=none])'); // show non-hidden tab

				if (next.length) {
					next.children().click();
				} else {
					tab_nav.prev(':not([style*=none])').children().click();
				}
			}

			tab_nav.hide();

			if (~tab_id.indexOf(',')) { // multiple tabs
				tab_id = tab_id.split(', #').join('_showing_icon, .');
			}

			$('.' + tab_id + '_showing_icon').hide();

			if (tab_nav.siblings().length === tab_nav.siblings('[style*=none]').length) { // all tabs are hidden
				tab_nav.parent().siblings('.tab-content').hide();
			}
		} else {
			tab_nav.parent().siblings('.tab-content').show();
			this.show_showing_icon(tab_id);

			if (show_func) {
				show_func();
			}
		}
	},

	show_showing_icon: function(tab_id) {
		$('.' + tab_id + '_showing_icon').show();
	},

	make_tab_move: function() {
		$('#east_tab').sortable({
			axis: 'x',
			containment: 'parent',
			tolerance: 'pointer',
			distance: 20,
			delay: 100
		});
		$('#west_tab').sortable({
			axis: 'x',
			containment: 'parent',
			tolerance: 'pointer',
			distance: 20,
			delay: 100
		});
		$('#south_tab').sortable({
			axis: 'x',
			containment: 'parent',
			tolerance: 'pointer',
			distance: 20,
			delay: 100
		});
	}
};
