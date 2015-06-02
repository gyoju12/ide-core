/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.localization = {
	language: null,
	before_language: null,
	msg: {},
	tutorial: {},
	title: {},
	plugin: {},
	language_data: {},
	is_first: false,
	is_load: false,
	version: {},

	init: function() {
		this.get_version();
		$(core).trigger('localization_init_complete');
	},

	get_version: function() {
		var self = this;
		var broswer_language = navigator.language || navigator.userLanguage;
		broswer_language = (/ko/.test(broswer_language)) ? 'kor' : 'us';

		var language = (localStorage.getItem('language') && (localStorage.getItem('language') != 'null') && (localStorage.getItem('language') != 'undefined')) ? localStorage.getItem('language') : broswer_language;

		self.language = language;
		self.load_json();

		var get_type_list = ['dialog', 'dict', 'menu', 'msg', 'tutorial', 'title'];

		for (var i = 0; i < get_type_list.length; i++) {
			if (!self.language_data[language]) {
				self.language_data[language] = {};
			}
			if (self.language_data[language][get_type_list[i]]) {
				self.apply_language(language, get_type_list[i]);
			} else {
				self.get_json(language, get_type_list[i]);
			}
		}

		if (Object.keys(core.module.plugin_manager.plugins).length) { // only if there are plugins that can be applied localization
			self.get_plugin_language(language);
		}

		$('[name=select_language_on_start][value=' + this.language + ']').iCheck('check');
	},
	/*
		parse_version: function(data) {
			var version = {};

			if (data) {
				if (data != 'undefined' && data != 'null') {
					return JSON.parse(data);
				} else {
					return version;
				}
			} else {
				return version;
			}
		},

		stringify_version: function(language, data) {
			var current_language_version = this.parse_version(localStorage.getItem('language.version'));
			current_language_version[language] = data;

			return JSON.stringify(current_language_version);
		},
	*/
	get_json: function(language, type, length, callback) { // jeongmin: getJSON is async
		var self = this;

		$.getJSON('configs/languages/' + language + '.' + type + '.json', function(data) {
			self.language_data[language][type] = data;
		}).done(function() {
			self.apply_language(language, type);
			self.get_json_count++;

			if (self.get_json_count == length) { // jeongmin: all jsons are loaded
				callback();
			}
		});
	},

	get_plugin_language: function(language) {

		var self = this;

		if (!self.language_data[language]) {
			self.language_data[language] = {};
		}
		//always initialize plugin language data to apply deleted value of plugin --heeje
		self.language_data[language].plugin = {};

		for (var i = 0; i < core.module.plugin_manager.list.length; i++) {

			var plugin = core.module.plugin_manager.list[i].name;
			var type = plugin.split('.').pop();
			var path = external_json.plugins[plugin]['localization.json'];

			if (path) {
				var data = JSON.parse(external_json.plugins[plugin]['localization.json']);

				if (data && data[language]) {
					self.language_data[language].plugin[type] = {};
					$.each(data[language], function(key, value) {
						self.language_data[language].plugin[type][key] = value;
					});
				}
			}
		}

		self.apply(self.language_data[language].plugin, 'plugin');
		self.apply_message(self.language_data[language].plugin, 'plugin');
		self.store_json();
	},

	apply_language: function(language, type) {
		var self = this;

		if (type == 'plugin') {
			self.apply(self.language_data[language][type], 'plugin');
		} else {
			self.apply(self.language_data[language][type]);
		}

		if (type == 'msg' || type == 'tutorial' || type == 'plugin' || type == 'title') {
			self.apply_message(self.language_data[language][type], type);
		}

		self.store_json();
	},

	load_json: function() {
		var data = (localStorage.getItem('language.data') && localStorage.getItem('language.data') != 'null' && localStorage.getItem('language.data') != 'undefined') ? localStorage.getItem('language.data') : '{}';

		this.language_data = JSON.parse(data);
	},

	store_json: function() {
		var data = this.language_data;

		localStorage.setItem('language.data', JSON.stringify(data));
	},

	change_language: function(language, flag, change_flag) {
		var self = this;
		var broswer_language = navigator.language || navigator.userLanguage;
		broswer_language = (/ko/.test(broswer_language)) ? 'kor' : 'us';

		// var change = function() {
		var __language = (language && language != 'null' && language != 'undefined') ? language : broswer_language;

		self.language = __language;
		localStorage.setItem('language', __language);
		// var current = "";
		// if (__language == "us") {
		// 	current = "English";
		// } else if (__language == "kor") {
		// 	current = "한국어";
		// }
		// $("#language_button-button").text(current);

		// function callback(argument) {
		// preference setting is moved to preference.js
		// $(core).trigger('language_loaded', change_flag);
		// $(core).trigger('language_change');
		// var temp_message = $("div.join_message");	// done at collaboration.chat.js
		// $.each(temp_message, function(i, v) {
		// 	$(v).html($(v).attr('user_name') + " " + core.module.localization.msg.alert_collaboration_chat_join);
		// });
		// temp_message = $("div.leave_message");
		// $.each(temp_message, function(i, v) {
		// 	$(v).html($(v).attr('user_name') + " " + core.module.localization.msg.alert_collaboration_chat_leave);
		// });
		// temp_message = $("div.change_message");
		// $.each(temp_message, function(i, v) {
		// 	$(v).html($(v).attr('before_user_name') + " " + core.module.localization.msg.alert_collaboration_chat_change + $(v).attr('user_name') + " " + core.module.localization.msg.alert_collaboration_chat_change2);
		// });
		// }

		if (self.language_data[__language]) {
			for (var key in self.language_data[__language]) {
				var data = self.language_data[__language][key];

				if (key == 'plugin') {
					self.get_plugin_language(__language);
				} else {
					self.apply(data);
				}

				if (key == 'msg' || key == 'tutorial' || key == 'plugin' || key == 'title') {
					self.apply_message(data, key);
				}
			}

			// core.dialog.help_contents.load();	// done at help.content.js

			// callback();
			$(core).trigger('language_loaded', change_flag);
		} else {
			var get_type_list = ['dialog', 'dict', 'menu', 'msg', 'tutorial', 'title'];
			var length = get_type_list.length;
			self.get_json_count = 0; // jeongmin: get json loading count

			for (var i = 0; i < length; i++) {
				self.get_json(__language, get_type_list[i], length, function() {
					$(core).trigger('language_loaded', change_flag);
				}); // jeongmin: getJSON is async
			}

			self.get_plugin_language(__language);

			//localStorage.setItem('language.version', self.stringify_version(__language, self.version));
			// core.dialog.help_contents.load();
			// $(core).trigger('language_change');
		}
		// };

		// if (!flag) {
		// 	if (this.t) clearTimeout(this.t);
		// 	this.t = setTimeout(function() {
		// 		change();
		// 	}, 3000);
		// } else {
		// change();
		// }
	},

	apply: function(data, type) {
		var self = this;
		var node;

		if (data) {
			for (var key in data) {
				var data_key = data[key];
				var items = data_key.items;
				var value = data_key.value;
				var children = data_key.children;

				if (type && type == 'plugin') {
					for (var k in data_key) {
						var v = data_key[k];

						k = 'plugin.' + key + '.' + k;
						node = $('[localization_key="' + k + '"]');
						if (typeof(node.attr('description')) != 'undefined') {
							node.attr('description', v.value);
						} else {
							node.html(v.value);
						}
					}

					if (items !== null) {
						for (var item_k in items) {
							var item = items[item_k];

							var name = 'plugin.' + key + '.' + item_k + '.name';
							var description = 'plugin.' + key + '.' + item_k + '.description';

							$('[localization_key="' + name + '"]').html(item.name.value);
							$('[localization_key="' + description + '"]').attr('description', item.description.value);
						}
					}

					// $.each(value, function(k, v){
					// 	k = 'plugin.' + key + "." + k;
					// 	node = $("[localization_key='" + k + "']");
					// 			if (typeof(node.attr("description")) != "undefined"){
					// 				node.attr("description", v.value);
					// 			}else{
					// 				node.html(v.value);
					// 			}
					// });
					// if(value['items'] != null){
					// 	$.each(value['items'], function(item_k, item){
					// 		$.each(item, function(k, v){
					// 			k = 'plugin.' + key + "." + item_k + "." + k;
					// 			node = $("[localization_key='" + k + "']");
					// 			if (typeof(node.attr("description")) != "undefined"){
					// 				node.attr("description", v.value);
					// 			}else{
					// 				node.html(v.value);
					// 			}

					// 		});
					// 	});
					// }
				} else {
					var localizations = $('[localization_key="' + key + '"]');
					var helptext = $('[localization_key="' + key + '"] > .helptext');
					var helptext_parent = helptext.parent();
					var placeholder = localizations.attr('placeholder');
					var caret = $('[localization_key="' + key + '"] > .caret')[0];
					var applied = localizations.find('.menu-applied')[0];
					var badge = $('[localization_key="' + key + '"] > .badge')[0];
					var badge_parent = $(badge).parent(); // jeongmin: some element doesn't have badge but have same localization key, so differ badge parent.

					localizations.html(value);

					if (helptext[0]) {
						$(helptext_parent).append(helptext[0].outerHTML);
						// localizations.not(".shortcut_menu").append("<em class='helptext'>" + helptext + "</em>"); //jeongmin: prevent appending helptext to preference shortcut
					}

					if (caret) {
						// hidden: storage is deprecated
						// if (key != "common_target") //jeongmin: if key isn't about target
						$('[localization_key="' + key + '"].dropdown-toggle').append('<b class="caret"></b>');
						// else //jeongmin: if key is about target
						// $("[localization_key='" + key + "'].dropdown-toggle").append("<span>goormIDE Storage</span><b class='caret'></b>"); //jeongmin: add default target
					}

					if (badge) {
						badge_parent.append(badge.outerHTML); //jeongmin: add default target
					}

					if (applied) {
						if ($(applied).hasClass('menu-prepend')) {
							localizations.filter('[applied]').prepend(applied.outerHTML);
						} else {
							localizations.filter('[applied]').append(applied.outerHTML);
						}
					}

					if (placeholder) {
						localizations.attr('placeholder', value);
						localizations.empty();
					}

					// attach tooltip
					//$("[tooltip='" + key + "']").attr("title", value);

					//for bootstrap tooltip
					$('[tooltip="' + key + '"]').attr('data-original-title', value);

					if (children) {
						if (type && type == 'plugin') {
							self.apply(children, 'plugin');
						} else {
							self.apply(children);
						}
					}
					/*
					if(key=="new_project_scm_dialog"){
						console.log(this.value);
						console.log(localizations);
						console.log(localizations.html());
					}//for debug
					*/
				}
			}

			// $.each(data, function(key, value) {
			// 	console.log('1', key, value);

			// 	if(type && type == 'plugin'){
			// 		$.each(value, function(k, v){
			// 			k = 'plugin.' + key + "." + k;
			// 			node = $("[localization_key='" + k + "']");
			// 					if (typeof(node.attr("description")) != "undefined"){
			// 						node.attr("description", v.value);
			// 					}else{
			// 						node.html(v.value);
			// 					}
			// 		});
			// 		if(value['items'] != null){
			// 			$.each(value['items'], function(item_k, item){
			// 				$.each(item, function(k, v){
			// 					k = 'plugin.' + key + "." + item_k + "." + k;
			// 					node = $("[localization_key='" + k + "']");
			// 					if (typeof(node.attr("description")) != "undefined"){
			// 						node.attr("description", v.value);
			// 					}else{
			// 						node.html(v.value);
			// 					}

			// 				});
			// 			});
			// 		}
			// 	}else{
			// 		var localizations = $("[localization_key='" + key + "']");
			// 		var helptext = localizations.find(".helptext").html();
			// 		var placeholder = localizations.attr("placeholder");
			// 		var caret = $("[localization_key='" + key + "'] > .caret")[0];
			// 		var applied = localizations.find('.menu-applied')[0];
			// 		var badge = $("[localization_key='" + key + "'] > .badge")[0];

			// 		localizations.html(this.value);

			// 		if (helptext) {
			// 			localizations.not(".shortcut_menu").append("<em class='helptext'>" + helptext + "</em>"); //jeongmin: prevent appending helptext to preference shortcut
			// 		}

			// 		if (caret) {
			// 			if (key != "common_target") //jeongmin: if key isn't about target
			// 				$("[localization_key='" + key + "'].dropdown-toggle").append("<b class='caret'></b>");
			// 			else //jeongmin: if key is about target
			// 				$("[localization_key='" + key + "'].dropdown-toggle").append("<span>goormIDE Storage</span><b class='caret'></b>"); //jeongmin: add default target
			// 		}

			// 		if (badge) {
			// 			$("[localization_key='" + key + "']").append(badge.outerHTML); //jeongmin: add default target
			// 		}

			// 		if (applied) {
			// 			if ($(applied).hasClass('menu-prepend')) {
			// 				localizations.filter('[applied]').prepend(applied.outerHTML);
			// 			} else {
			// 				localizations.filter('[applied]').append(applied.outerHTML);
			// 			}
			// 		}

			// 		if (placeholder) {
			// 			localizations.attr("placeholder", this.value);
			// 			localizations.empty();
			// 		}

			// 		// attach tooltip
			// 		//$("[tooltip='" + key + "']").attr("title", this.value);

			// 		//for bootstrap tooltip
			// 		$("[tooltip='" + key + "']").attr("data-original-title", this.value);

			// 		if (this.children) {
			// 			if(type && type == 'plugin')
			// 				self.apply(this.children, 'plugin');
			// 			else self.apply(this.children);
			// 		}
			// 		/*
			// 		if(key=="new_project_scm_dialog"){
			// 			console.log(this.value);
			// 			console.log(localizations);
			// 			console.log(localizations.html());
			// 		}//for debug
			// 		*/
			// 	}
			// });
		}
	},

	local_apply: function(area, type) {
		var self = this;
		var language = this.language;

		var replace_value = function(area, data) {
			if (data) {
				if (type && type == 'plugin') {
					key = 'plugin.' + key;
				}

				$.each(data, function(key, value) {
					var localizations = $(area + ' [localization_key="' + key + '"]');
					var helptext = $(area + ' [localization_key="' + key + '"] > .helptext');
					var helptext_parent = helptext.parent();

					var caret = $(area + ' [localization_key="' + key + '"] > .caret')[0];
					var applied = localizations.find('.menu-applied')[0];

					localizations.html(this.value);

					if (helptext[0]) {
						$(helptext_parent).append(helptext[0].outerHTML);
						// localizations.append("<em class='helptext'>" + helptext + "</em>");
					}

					if (caret) {
						$(area + ' [localization_key="' + key + '"]').first().append('<b class="caret"></b>');
					}

					if (applied) {
						if ($(applied).hasClass('menu-prepend')) {
							localizations.filter('[applied]').prepend(applied.outerHTML);
						} else {
							localizations.filter('[applied]').append(applied.outerHTML);
						}
					}

					// attach tooltip
					$(area + ' [tooltip="' + key + '"]').attr('title', this.value);

					if (this.children) {
						replace_value(area, this.children);
					}
				});
			}
		};

		switch (type) {
			case 'dialog':
			case 'dict':
			case 'menu':
			case 'msg':
			case 'tutorial':
			case 'title':
			case 'plugin':
				replace_value(area, self.language_data[language][type]);
				break;

			default:
				replace_value(area, self.language_data[language].dialog);
				replace_value(area, self.language_data[language].dict);
				replace_value(area, self.language_data[language].menu);
				replace_value(area, self.language_data[language].msg);
				replace_value(area, self.language_data[language].tutorial);
				replace_value(area, self.language_data[language].title);
				replace_value(area, self.language_data[language].plugin);
				break;
		}
	},

	apply_message: function(data, lkey) {
		var self = this;

		if (data !== null) {
			if (lkey == 'plugin') {
				$.each(data, function(plugin, data) {
					self.plugin[plugin] = {};
					$.each(data, function(key, value) {
						self.plugin[plugin][key] = (value.value) ? value.value : value;
					});
				});
			} else {
				$.each(data, function(key, value) {
					self[lkey][key] = (value.value) ? value.value : value;
				});
			}

		}

		// if (self.is_first && self.language == "kor" && localStorage) {	// language is selected at login page
		// 	if (!localStorage.getItem('language.confirmation.automatic_change')) {
		// 		confirmation.init({
		// 			message: core.module.localization.msg.confirmation_language_message,
		// 			yes_text: core.module.localization.msg.confirmation_language_message_yes,
		// 			no_text: core.module.localization.msg.confirmation_language_message_no,

		// 			title: "Language Automatic Change",
		// 			yes: function() {
		// 				localStorage.setItem('language.confirmation.automatic_change', true);
		// 				self.change_language('kor');
		// 				self.language = 'kor';
		// 				
		// 			},
		// 			no: function() {
		// 				localStorage.setItem('language.confirmation.automatic_change', true);
		// 				self.change_language('us');
		// 				self.language = 'us';
		// 				
		// 			}
		// 		});

		// 		confirmation.show();
		// 	}
		// } else {
		// 	self.is_first = false;
		// }
	},

	// If user change language on login. Jeong-Min Im.
	select_language_on_start: function() {
		var selected_language = $('[name=select_language_on_start]:checked').val();

		if (this.language !== selected_language) {
			this.change_language(selected_language);
		}
	},

	refresh: function(flag) {
		var self = this;
		var language = '';
		if (flag) {
			if (localStorage.getItem('language') === null) {
				if (core.server_language === 'client') {
					if (navigator.language === 'ko') {
						language = 'kor';
					} else {
						language = 'us';
					}
				} else {
					language = core.server_language;
				}

				self.change_language(language, true);
			} else {
				self.change_language(localStorage.getItem('language'), true);
			}

		} else {
			if (localStorage.getItem('language') === null) {
				if (core.server_language === 'client') {
					if (navigator.language === 'ko') {
						language = 'kor';
					} else {
						language = 'us';
					}
				} else {
					language = core.server_language;
				}

				self.change_language(language);
			} else {
				self.change_language(localStorage.getItem('language'));
			}
		}
	}
};
