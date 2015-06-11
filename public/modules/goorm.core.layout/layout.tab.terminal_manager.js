/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.layout.tab.terminal_manager = {
	list: {},

	configs: {
		/**
		 *  Tab Configs
		 */
		tab_manager: {
			position: 'south',
			tab: {
				'content': 'Server Tab'
			},
			tab_content: {
				'content': '',
				'class': 'server_tab',
				'fade': true
			},
			fn: function() {}
		},

		/**
		 *  Terminal Configs
		 */
		terminal: {
			type: 'background',
			fix_scroll: false,
			max_append: false,
			max_contents: 50,

			on_ready: function() {},
			on_message: function(msg) {
				return msg;
			}
		},

		prev: {
			tab_id: 'gLayoutServer_',
			tab_content_id: 'server_tab_'
		}
	},

	load: function(name, options) {
		var configs = this.configs;

		var configs_tab = $.extend({}, configs.tab_manager);
		var configs_terminal = $.extend({}, configs.terminal);

		var tab_manager = (options.tab_manager) ? $.extend(configs_tab, options.tab_manager) : configs_tab;
		var terminal = (options.terminal) ? $.extend(configs_terminal, options.terminal) : configs_terminal;

		var _id = this.get_id(name);

		tab_manager.tab.id = _id.tab_id;
		tab_manager.tab_content.id = _id.tab_content_id;
		tab_manager.localization = {
			tab: _id.tab_localization,
			'menu': _id.menu_localization
		};

		return this.create(name, tab_manager, terminal, {
			'success': options.success,
			'show': options.show,
			'hide': options.hide
		});
	},

	create: function(name, tab_manager, terminal, fn) {
		var self = this;

		var fn_success = fn.success;
		var fn_show = fn.show;
		var fn_hide = fn.hide;

		if (!this.list[name]) {
			var position = tab_manager.position;

			core.module.layout.tab_manager.add(position, tab_manager);

			this.list[name] = {
				'tab': $('#' + tab_manager.tab.id),
				'tab_content': $('#' + tab_manager.tab_content.id),
				'tab_inner_content': $('#' + tab_manager.tab_content.id).find('.inner_content')
			};

			// attach hide badge
			this.list[name].tab.append('<span class="badge hide_tab cursor-pointer" style="margin-bottom: -1px"><span class="glyphicon glyphicon-remove"></span></span>');

			var hide = false;

			// show
			this.list[name].tab.click(function() {
				hide = false;

				self.list[name].tab.show();

				if (fn_show && typeof(fn_show) === 'function') {
					fn_show(self.list[name]);
				}
			});

			// hide
			this.list[name].tab.on('hidden.bs.tab', function() {
				if (hide) {
					self.list[name].tab.hide();

					if (fn_hide && typeof(fn_hide) === 'function') {
						fn_hide(self.list[name]);
					}
				}
				return false;
			});

			this.list[name].tab.on('click', '.hide_tab', function() {
				hide = true;

				if (self.list[name].tab.parent().hasClass('active')) { // --> show another tab
					core.module.layout.select('terminal');
				} else {
					self.list[name].tab.hide();

					if (fn_hide && typeof(fn_hide) === 'function') {
						fn_hide(self.list[name]);
					}
				}

				return false;
			});

			if (terminal.type === 'background') {
				this.list[name].terminal = new goorm.core.terminal.background(name);
				// resize tab
				this.list[name].tab_inner_content.outerHeight($('#goorm_inner_layout_' + this.convert_position(position)).find('.tab-content').height() - 40); // 40 for initial clr_view height

				this.list[name].fix_scroll = true;
				this.list[name].max_append = false;

				var inner = this.list[name].tab_inner_content;
				this.list[name].set_fix_scroll = terminal.fix_scroll;
				this.list[name].set_max_append = terminal.max_append;

				inner.empty();
				// if (this.list[name].set_fix_scroll) {
				// 	inner.scroll($.debounce(function() {
				// 		if (inner.get(0).scrollHeight - inner.scrollTop() == inner.outerHeight()) {
				// 			self.list[name].fix_scroll = true;
				// 		} else {
				// 			self.list[name].fix_scroll = false;
				// 		}
				// 	}, 30, false));
				// }

				if (this.list[name].terminal.on_ready && typeof(this.list[name].terminal.on_ready) === 'function') {
					this.list[name].terminal.on_ready(function() {
						if (terminal.on_ready) {
							terminal.on_ready();
						}

						if (fn_success && typeof(fn_success) === 'function') {
							fn_success(self.list[name]);
						}
					});
				}

				if (this.list[name].terminal.on_message && typeof(this.list[name].terminal.on_message) === 'function') {
					this.list[name].terminal.on_message(function(msg) {
						if (terminal.on_message) {
							msg = terminal.on_message(msg);
						}
						
						if (/\n/.test(msg.stdout)) {
							inner.append(msg.stdout.replace(/\n/g, '<br>').replace(/\[\d+m/g, ''));

							if (self.list[name].set_fix_scroll && self.list[name].fix_scroll) {
								inner.scrollTop(inner[0].scrollHeight);
							}
						} else {
							inner.append(msg.stdout.replace(/\[\d+m/g, ''));
						}

						if (self.list[name].set_max_append) {
							if (!self.list[name].max_append && inner.text().split('\n').length > self.list[name].terminal.max_contents) {
								self.list[name].max_append = true;
							}

							if (self.list[name].max_append) {
								if (inner.contents().get(1)) {
									inner.contents().get(0).remove(); // string
									inner.contents().get(0).remove(); // <br>
								}
							}
						}
					});
				}
			} else {
				this.list[name].terminal = new goorm.core.terminal();
				this.list[name].terminal.init($(terminal.target), name + '_terminal');

				this.list[name].terminal.on_ready = function() {
					if (terminal.on_ready) {
						terminal.on_ready();
					}

					if (fn_success && typeof(fn_success) === 'function') {
						fn_success(self.list[name]);
					}
				};
			}
		}

		return this.list[name];
	},

	get_id: function(name) {
		var configs = this.configs;
		return {
			'tab_id': configs.prev.tab_id + name,
			'tab_content_id': configs.prev.tab_content_id + name,
			'tab_localization': 'tab_title_' + name,
			'menu_localization': 'window_bottom_layout_' + name
		};
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
	}
};
