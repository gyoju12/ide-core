/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.plugin.manager = {
	plugins: null,
	list: 0,
	interval: null,
	preference: null,
	toolbox_selector: null,

	init: function() {
		this.plugins = {};
		this.list = [];
	},

	get: function() {
		var self = this;

		//useonly(mode=goorm-server,goorm-oss)
		$.ajax({
			url: 'plugin/get_list',
			type: 'GET',
			async: false,
			success: function(data) {
				self.list = data;
				$(core).trigger('plugin_loaded');
			}
		});
		

		
	},

	load: function(index, is_user) {
		// console.log("load");
		var self = this;

		var load_plg = function(plg, callback) {
			var plugin_name = plg.name;

			self.get_plugin_data(plugin_name, is_user, callback);

			// callback(true);	// move into get_plugin_data
		};

		async.map(this.list, load_plg, function() { // now all plugin is loaded
			if (Boolean(is_user)) { //if user plugin is completely init
				$(core).trigger('user_plugin_init_complete'); // 추후 사용을 위해 만들어놓았음. -chw-
				console.log('user_plugin_init_complete');
				return;
			}

			// Sort Plugin Project Menu by youseok.nam
			//
			var plugin_project_container = $('li[id="plugin_new_project"]');
			var plugin_projects = $('li.plugin_project a');

			var sorted = plugin_projects.sort(function(a, b) {
				var string_a = $(a).html();
				var string_b = $(b).html();

				if (string_a > string_b) {
					return 1;
				} else if (string_b > string_a) {
					return -1;
				} else {
					return 0;
				}
			});

			sorted.each(function(i, o) {
				

				//useonly(mode=goorm-oss)
				$(o).appendTo(plugin_project_container.siblings('li:eq(' + (i + 3) + ')'));
				
			});

			if (core.module.localization) {
				core.module.localization.get_plugin_language(core.module.localization.language);
			}
		});

		$(core).one('user_id_loaded', function() {
			$.get('/plugin/load_userplugin', {
				id: core.user.id
			}, function(result) {
				for (var i = 0; i < result.length; i++) {
					var plg_name = result[i].name;

					self.list.push(result[i]);
					external_json.plugins[result[i].name] = {
						'localization.json': result[i].localization,
						'preference.json': result[i].preference,
						'tree.json': result[i].tree
					};

					self.get_plugin_data(plg_name, true);
				}

				// self.load(index, true);
			});
		});

		$(core).trigger('plugin_load_complete'); // load core and plugin at the same time
	},
	get_plugin_data: function(plugin_name, is_user, callback) {
		var self = this;
		is_user = Boolean(is_user);
		var userplugin_path = is_user ? core.user.id + '/plugins/' : '';

		if (plugin_name !== undefined) {

			
			$.post('/plugin/check_css', {
				'type': is_user,
				'path': userplugin_path + plugin_name + '/plug.css'
			}, function(result2) {
				if (result2.check) {
					$('head').append('<link>');
					var css = $('head').children(':last');
					css.attr({
						rel: 'stylesheet',
						type: 'text/css',
						href: userplugin_path + '/' + plugin_name + '/plug.css'
					});
				}

				$.getScript(userplugin_path + '/' + plugin_name + '/plug.js', function() {
					//Plugin initialization
					self.plugins[plugin_name] = goorm.plugin[plugin_name.replace('goorm.plugin.', '')];
					if (self.plugins[plugin_name]) {
						self.plugins[plugin_name].init(userplugin_path);
					}

					var json_string = external_json.plugins[plugin_name]['preference.json'];
					var json = '';

					if (json_string) {
						json = JSON.parse(json_string);
					}

					if (json) {
						core.preference.plugins[plugin_name] || (core.preference.plugins[plugin_name] = {});
						core.preference.plugins[plugin_name] = $.extend(true, json, core.preference.plugins[plugin_name]);

						core.module.preference.preference_default.plugins[plugin_name] = {};
						core.module.preference.preference_default.plugins[plugin_name] = $.extend(true, core.module.preference.preference_default.plugins[plugin_name], json);
					}

					if (!is_user) {
						$(core).trigger('goorm_loading');
					}

					callback();
				});
			});
			

			
		} else {
			callback();
		}
		// }
	},

	

	new_project: function(data) {
		if ($.isFunction(this.plugins['goorm.plugin.' + data.project_type].new_project)) {
			this.plugins['goorm.plugin.' + data.project_type].new_project(data);
		}
	}
};
