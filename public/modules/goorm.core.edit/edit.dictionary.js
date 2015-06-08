/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.edit.dictionary = function() {
	this.container = null;
	this.target = null;
	this.editor = null;
	this.dictionary_list = null;
	this.contents = [];
	this.result = [];
	this.index = 0;
	this.max_item_count = 4;
	this.completable = false;
};

goorm.core.edit.dictionary.prototype = {
	__box_index: 0,

	init: function(target, editor, filetype) {
		this.dictionary_list = [];
		var self = this;

		this.target = target;
		this.editor = editor;

		this.contents = [];
		this.result = [];

		this.box_index = this.__proto__.__box_index;

		var __target = $(this.target);

		if (__target.length === 0) { // jeongmin: if there isn't __target, below works doesn't mean anything
			return;
		}

		var dict_box_html = '';
		dict_box_html += '<ul id="dictionary_box' + this.box_index + '" class="dictionary_box dropdown-menu">';
		dict_box_html += '<li class="dictionary_list">';
		dict_box_html += '<table class="dictionary_list_table table-condensed" style="width:100%;"></table>';
		dict_box_html += '</li>';
		dict_box_html += '<li class="divider" style="display:none;"></li>';
		// 		dict_box_html += "<li class='dropdown-header dictionary_desc'></li>";
		dict_box_html += '<li class="dictionary_desc"></li>';
		dict_box_html += '</ul>';

		__target.append(dict_box_html);

		this.$container = __target.find('ul.dictionary_box');
		this.$container.hide();

		//load by active
		var active_filename = core.module.layout.workspace.window_manager.active_filename;
		var t_arr = active_filename.split('.');
		var active_filename_type = t_arr[t_arr.length - 1];

		if (t_arr.length > 1) {
			this.load(active_filename_type);
		} else {
			//console.log('odd',filetype);
			this.load(filetype);
		}

		var stored_data = localStorage.getItem('edit.dictionary');
		if (stored_data && stored_data != 'null' && stored_data != 'undefined') {
			stored_data = JSON.parse(stored_data);

			self.list_height = stored_data.list_height;
			self.box_height = stored_data.box_height;

			self.list_width = stored_data.list_width;
			self.box_width = stored_data.box_width;
		}

		this.connect();

		this.__proto__.__box_index++;
	},

	complete: function() {
		var cursor = this.editor.getCursor();
		var token = this.editor.getTokenAt(cursor);

		if (this.result[0].is_not_data) {
			this.result.pop();
		}
		if (this.result.length > 0) {
			var string = this.result[this.index].keyword;

			var from = {
				line: cursor.line,
				ch: token.start
			};
			var to = {
				line: cursor.line,
				ch: token.end
			};
			if (token.string == '.') {
				from.ch += 1;
				to.ch += 1;
			}

			this.editor.replaceRange(string, from, to);
		}

		this.hide();
		this.completable = false;
	},

	load: function(filetype) {
		var self = this;

		$(this.target).find('.dictionary_list_table').empty();

		// if (core.is_optimization) {
		var list_data = JSON.parse(external_json['public'].configs.dictionary['dictionary_list.json']);
		var type;
		var data;

		if (filetype && list_data[filetype]) {
			type = filetype + '.json';
			data = JSON.parse(external_json['public'].configs.dictionary[type]);

			self.contents = data;
		} else {
			type = 'etc.json';
			data = JSON.parse(external_json['public'].configs.dictionary[type]);

			self.contents = data;
		}
	},

	set: function(keyword) {
		var self = this;

		var __target = $(this.target);
		var dictionary_desc = $('li.dictionary_desc', __target);
		var dictionary_list_table = $('ul.dictionary_box table.dictionary_list_table', __target);

		dictionary_list_table.empty();
		dictionary_desc.empty().css('display', 'none');

		var all_words = this.get_words();
		var words = [];

		if (keyword !== '') {
			all_words = all_words.filter(function(o) {
				if (o.indexOf(keyword) === 0) {
					return true;
				} else {
					return false;
				}
			});
		}

		all_words.map(function(o) {
			var is_push = true;

			for (var i = 0; i < self.result.length; i++) {
				var keyword = self.result[i].keyword;

				if (o == keyword) {
					is_push = false;
					break;
				}
			}

			if (is_push) {
				words.push(o);
			}
		});

		var i = 0;

		for (i = 0; i < words.length; i++) {
			// if (!is_duplicated(words[i], this.result)) {
			this.result.push({
				'description': '',
				'keyword': words[i],
				'type': 'key'
			});
			// }
		}

		if (this.result.length === 2) {
			var matched_num = 0;
			for (i = 0; i < this.result.length; i++) {
				var word = this.result[i].keyword;
				if (word === keyword) {
					var content = this.editor.getValue();
					matched_num += content.match(RegExp('[\\W|\\n]' + word + '[\\W|\\n]', 'g')) ? content.match(RegExp('[\\W|\\n]' + word + '[\\W|\\n]', 'g')).length : 0;
					matched_num += content.match(RegExp('^' + word + '[\\W|\\n]', 'g')) ? content.match(RegExp('^' + word + '[\\W|\\n]', 'g')).length : 0;
					matched_num += content.match(RegExp('[\\W|\\n]' + word + '$', 'g')) ? content.match(RegExp('[\\W|\\n]' + word + '$', 'g')).length : 0;
					if (matched_num == 1) {
						this.result.splice(i, 1);
					}
					break;
				}
			}
		}

		if (this.result.length === 1) {
			this.index = 0;
			// 			this.complete();
			this.completable = true;
			this.editor.focus();
			// 			return;
		}

		// 		if (this.result.length === 0) {
		// 			var not_data = {
		// 				'is_not_data': true,
		// 				'keyword': core.module.localization.msg.alert_no_have_data
		// 			};
		// 			this.result.push(not_data);
		// 		}

		if (this.result.length >= 1) {
			var dictionary_list_table_array = [];
			var dictionary_desc_array = [];
			var get_element_image = function(type) {
				var __class;

				switch (type) {
					case 'func':
					case 'local':
					case 'global':
						__class = 'outline-toolbar-local';
						break;
					case 'class':
						__class = 'outline-toolbar-class';
						break;
					case 'method':
						__class = 'outline-toolbar-method';
						break;
					case 'package':
						__class = 'outline-toolbar-package';
						break;
					default:
						__class = 'outline-toolbar-local';
						break;
				}

				return '<div class=' + __class + ' style="width:16px;"></div>';
			};
			display_desc = function(ele_target) {
				if (__target.find('#' + ele_target).hasClass('hovered')) {
					var desc_target = ele_target + '_desc';
					if (__target.find('#' + desc_target + ' div').text() === '') {
						__target.find('.divider').hide();
						dictionary_desc.hide();
						// __target.find('.dictionary_box .yui-resize-handle').hide();
					} else {
						__target.find('.divider').show();
						dictionary_desc.show();
					}

					if (__target.find('#' + desc_target).attr('is_not_data') != 'true') {
						__target.find('#' + desc_target).css('display', '');
					}
				}

			};

			$(this.result).each(function(i) {
				var ele_id = 'dict_' + i;

				//1.empty data
				if (this.is_not_data) {
					this.type = '';
					this.description = '';
				}

				//2.too long keyword
				var print_key = '';
				print_key += this.keyword;

				if (print_key.length > 32) {
					print_key = print_key.substring(0, 27);
					print_key += '...';
				}

				print_key = print_key.replace('<', '&lt').replace('>', '&gt');
				if (keyword && keyword != '.') {
					print_key = print_key.replace(new RegExp(keyword, 'g'), '<span class="text-primary"><b>' + keyword + '</b></span>');
				}

				var ele_html = '';
				ele_html += '<tr class="dictionary_element" id="' + ele_id + '">';
				ele_html += '<td width="20px" style="font-size:11px;" >' + get_element_image(this.type) + '</td><td style="font-size:11px; font-family: ' + core.preference['preference.editor.font_family'] + ', monospace;">' + print_key + '</td>';
				ele_html += '</tr>';

				dictionary_list_table_array.push(ele_html);

				//dictionary_element.last().css('style', '');

				var desc_id = ele_id + '_desc';
				var desc_html = '';
				if (this.is_not_data) {
					desc_html += '<li class="dictionary_desc_list" id="' + desc_id + '" is_not_data="true">';
					desc_html += '</li>';
				} else {
					desc_html += '<li class="dictionary_desc_list" id="' + desc_id + '">';
					desc_html += this.description;
					desc_html += '</li>';
				}

				dictionary_desc_array.push(desc_html);
			});
			dictionary_list_table.empty()[0].innerHTML = (dictionary_list_table_array.join(''));
			dictionary_desc.empty()[0].innerHTML = (dictionary_desc_array.join(''));
			dictionary_list_table_array = null;
			dictionary_desc_array = null; // for garbage collection

			__target.find('tr.dictionary_element').css('border', 'none');
			$('li.dictionary_desc_list', __target).css('display', 'none');

			__target.find('li.dictionary_list tr.dictionary_element').hover(function() {
				$('li.dictionary_desc_list', __target).eq(self.index).hide();
				self.index = $(this).attr('id').split('_').pop();
				__target.find('li.dictionary_list tr.hovered').removeClass('hovered');
				$(this).addClass('hovered');

				var g_ele_target = $(this).attr('id');

				display_desc(g_ele_target);
			});

			var dictionary_element = __target.find('li.dictionary_list tr.dictionary_element');

			if (this.result[0].is_not_data === true) {
				dictionary_element.off();
			}

			dictionary_element.filter('[filter!="not_data"]').mousedown(function() {
				self.complete();
			});
		}
	},

	select: function(direction) {
		var self = this;
		var __target = $(this.target);

		var current_selected_item = this.index; // 0 ~ item.length-1
		var next_item = parseInt(current_selected_item, 10) + parseInt(direction, 10);

		var item = $('tr.dictionary_element', __target);
		var item_count = this.result.length;
		var item_height = item.height();

		var dictionary_list = $('li.dictionary_list', __target);
		var scroll_top = dictionary_list.scrollTop();
		var client_height = dictionary_list.prop('clientHeight');

		var current_location = (next_item + 1) * item_height;

		// next : -1
		var up = function() {
			if (next_item < 0) {
				next_item = item_count - 1;
			}

			if (!(scroll_top < current_location && current_location <= scroll_top + client_height)) {
				dictionary_list.scrollTop(dictionary_list.scrollTop() - item_height);
			}
		};

		// next : 1
		var down = function() {
			if (next_item + 1 > item_count) {
				next_item = 0;
			}

			if (!(scroll_top <= current_location && current_location <= scroll_top + client_height)) {
				dictionary_list.scrollTop(dictionary_list.scrollTop() + item_height);
			}
		};

		switch (direction) {
			case 1:
				down();
				break;

			case -1:
				up();
				break;

			default:
				self.hide();
				self.editor.focus();
				break;
		}

		if (next_item === 0) {
			dictionary_list.scrollTop(0);
		}

		if (next_item == item_count - 1) {
			dictionary_list.scrollTop((next_item + 1) * item_height);
		}

		var dictionary_element = $('tr.dictionary_element', dictionary_list);

		dictionary_element.removeClass('hovered');
		dictionary_element.eq(next_item).mouseover();
	},

	select_top: function() {
		var __target = $(this.target);
		var dictionary_list = $('li.dictionary_list', __target);
		var dictionary_element = $('tr.dictionary_element', dictionary_list);

		dictionary_element.removeClass('hovered');
		// 		if (this.reversed) {
		// 			dictionary_element.eq(this.result.length - 1).mouseover();
		// 		}
		// 		else {
		dictionary_element.eq(0).mouseover();
		// 		}
	},

	get_words: function() {
		var words = [];

		words = CodeMirror.hint.anyword(this.editor, {
			range: this.editor.lineCount()
		}).list;

		return words;
	},

	show: function() {
		var cm = this.editor;
		var __target = $(this.target);

		var cursor = cm.getCursor();
		var cursor_pos = cm.charCoords({
			line: cursor.line,
			ch: cursor.ch
		}, 'local');

		var scroll = cm.getScrollInfo();
		var gutter = cm.getGutterElement();
		// 		var gutter_width = $(gutter).width() + parseInt(core.preference["preference.editor.font_size"]);

		var left = cursor_pos.left + $(gutter).width(); // + parseInt(core.preference["preference.editor.font_size"], 10);
		var top = cursor_pos.top - scroll.top + parseInt(core.preference['preference.editor.font_size'], 10);

		var wrapper = $(cm.getWrapperElement());
		// 		var wrapper_height = wrapper.height();
		// 		var wrapper_width = wrapper.width();
		var dictionary_box = $('ul.dictionary_box', __target);
		var workspace = $('#workspace');
		var dictionary_list = $('li.dictionary_list', __target);
		// 		this.hide();

		var dictionary_box_height = dictionary_box.height();
		var dictionary_box_width = dictionary_box.width();
		var margin = 50;
		// 		this.reversed = false;

		if (workspace.offset().top + workspace.height() < wrapper.offset().top + top + dictionary_box_height + margin) {
			// 			this.reversed = true;

			top = top - dictionary_box_height - parseInt(core.preference['preference.editor.font_size'], 10) * 2;

			// 			var list = $('ul.dictionary_box table.dictionary_list_table tbody');
			// 			var listItems = list.children('tr');
			// 			list.append(listItems.get().reverse());
		}

		if (workspace.offset().left + workspace.width() < wrapper.offset().left + left + dictionary_box_width + margin) {
			left = left - dictionary_box_width;
		}

		dictionary_box.css('left', left);
		dictionary_box.css('top', top);

		// 		if (this.list_height && this.box_height) {}

		if (this.list_width > 0 && this.box_width > 0) {
			//list
			dictionary_box.css('width', this.box_width);
			dictionary_box.find('li.dictionary_list').css('width', this.list_width);

			//desc
			dictionary_box.find('li.dictionary_desc').css('width', this.list_width);
			dictionary_box.find('div.dictionary_desc_list').css('width', this.list_width);
		}

		if (this.result.length > 0) {
			dictionary_box.show();
			this.display = true;
			this.index = 0;
			dictionary_list.scrollTop(0);
			this.completable = true;
		}

		// 		dictionary_box.attr("tabindex", -1).focus();

		// 		__target.find(".divider").hide();
		// 		__target.find("li.dictionary_list tr.hovered").removeClass("hovered");

		// 		if (this.reversed) {
		// 			this.index = this.result.length - 1;
		// 			dictionary_list.scrollTop(29 * this.result.length);
		// 		}
		// 		else {

		// 		}

	},

	hide: function() {
		var __target = $(this.target);
		__target.find('.dictionary_box').hide();
		__target.find('.dictionary_desc').hide();
		this.completable = false;
		this.display = false;
	},

	search: function(keyword) {
		if (keyword == '/*' || /[^\-\+=\[{\]}\\\|\;\:\'\"\,<\.>\/\?\!\@#\$%\^&\*\(\)~\`]+/g.test(keyword) === false) {
			return false;
		}

		var self = this;
		self.result = [];

		var special_characters = ['\\', '!', '@', '#', '$', '%', '^', '&', '*', '[', ']', '(', ')', '-', '+', '=', '`', '~', '{', '}', ':', ';', '"', '\'', '<', '>', '/', '?', '|'];

		$(special_characters).each(function() {
			keyword = keyword.split(this).join('\\' + this);
		});
		// 		if (special_characters.indexOf(keyword) > -1) {
		// 			keyword = '\\' + keyword;
		// 		}

		var reg_exp = new RegExp('^' + keyword, '');
		// 		var keyword_object = {};
		// 		keyword_object.keyword = keyword + "";
		// 		keyword_object.line_content = line_content + "";

		$(self.contents).each(function() {
			if (reg_exp.test(this.keyword)) {
				self.result.push(this);
			}
		});

		self.set(keyword);

		return true;
	},
	// 	get_dictionary: function(keyword_object, callback) {
	// 		var self = this;
	// var reg_exp = new RegExp('^' + keyword_object.keyword, '');

	// var get_description = function(type, item) {
	// 	var description_html = "";
	// 	description_html += "<div>";
	// 	description_html += "<div style='padding:2px;'><b>Type</b> : " + type + "</div>";
	// 	description_html += "</div>";

	// 	return description_html;
	// };

	// $.get('/edit/get_dictionary', {
	// 	workspace: core.module.layout.workspace.window_manager.active_filename.split('/')[0],
	// 	selected_file_path: core.module.layout.workspace.window_manager.active_filename,
	// 	line_content: keyword_object.line_content

	// }, function(data) {
	// 	if (data.v !== undefined) {
	// 		data.v = data.v.unique();

	// 		for (var i = 0; i < data.v.length; i++) {
	// 			if (reg_exp.test(data.v[i])) {
	// 				self.result.push({
	// 					'description': get_description('Global Variable', data.v[i]),
	// 					'keyword': data.v[i],
	// 					'type': 'global'
	// 				});
	// 			}
	// 		}
	// 	} //global var end
	// 	if (data.l !== undefined) {
	// 		data.l = data.l.unique();

	// 		for (var i = 0; i < data.l.length; i++) {
	// 			if (reg_exp.test(data.l[i])) {
	// 				self.result.push({
	// 					'description': get_description('Local Variable', data.l[i]),
	// 					'keyword': data.l[i],
	// 					'type': 'local'
	// 				});
	// 			}
	// 		}
	// 	} //local var end
	// 	if (data.f !== undefined) {
	// 		data.f = data.f.unique();

	// 		for (var i = 0; i < data.f.length; i++) {
	// 			if (reg_exp.test(data.f[i])) {
	// 				self.result.push({
	// 					'description': get_description("Function", data.f[i]),
	// 					'keyword': data.f[i],
	// 					'type': 'func'
	// 				});
	// 			}
	// 		}
	// 	} //function end
	// 	if (data.m !== undefined) {
	// 		data.m = data.m.unique();

	// 		for (var i = 0; i < data.m.length; i++) {
	// 			if (reg_exp.test(data.m[i])) {
	// 				self.result.push({
	// 					'description': get_description("Method", data.m[i]),
	// 					'keyword': data.m[i],
	// 					'type': 'method'
	// 				});
	// 			}
	// 		}
	// 	} //method end
	// 	if (data.c !== undefined) {
	// 		data.c = data.c.unique();

	// 		for (var i = 0; i < data.c.length; i++) {
	// 			if (reg_exp.test(data.c[i])) {
	// 				self.result.push({
	// 					'description': get_description("Class", data.c[i]),
	// 					'keyword': data.c[i],
	// 					'type': 'class'
	// 				});
	// 			}
	// 		}
	// 	} //class
	// 	if (data.p !== undefined) {
	// 		data.p = data.p.unique();

	// 		for (var i = 0; i < data.p.length; i++) {
	// 			if (reg_exp.test(data.p[i])) {
	// 				self.result.push({
	// 					'description': get_description("package", data.p[i]),
	// 					'keyword': data.p[i],
	// 					'type': 'package'
	// 				});
	// 			}
	// 		}
	// 	} //package
	// 	if (typeof callback === "function") {
	// 				callback();
	// 	}
	// });
	// 	},

	connect: function() {
		var self = this;

		var $target = $(this.target);
		var cm_editor = this.editor;

		// 		if (dictionary_box.get(0)) {	// jeongmin: if there isn't container, error will be occured
		// 			CodeMirror.on(dictionary_box.get(0), "keydown", function(e) {
		// 				var code = e.keyCode;

		// 			});
		// 		}

		// 		cm_editor.on("keyup", function(i, e) {
		// 			if (self.autokey_down) {
		// 				$("a[action=do_autocomplete]:first").click();
		// 				self.autokey_down = false;
		// 			}
		// 		});

		cm_editor.on('keydown', function(i, e) {
			var code = e.keyCode;

			if (code == 91 || code == 93) {
				self.metaKey = true;
			}
			if (code == 18) {
				self.ctrlKey = true;
			}
			if (code == 17) {
				self.altKey = true;
			}

			if (self.display) {

				if (code == 186) {

					self.hide();
					//cm_editor.focus();

				} else if (code == 38) { // key 'up arrow'
					CodeMirror.e_stop(e);

					self.select(-1);
					cm_editor.focus();
				} else if (code == 40) { // key 'down arrow'
					CodeMirror.e_stop(e);

					self.select(1);
					cm_editor.focus();
				} else if (code == 13 || code == 9) { // key 'enter' and 'tab'
					CodeMirror.e_stop(e);

					self.complete();

					cm_editor.focus();
				}
			}
		});

		cm_editor.on('keyup', $.throttle(function(i, e) {
			//seongho.cha: because of throttle, active_window can be different when click in 0.2sec.
			if (cm_editor !== goorm.core.window.manager.window[goorm.core.window.manager.active_window].editor.editor) {
				self.hide();
				return;
			}
			var code = e.keyCode;
			var cursor = cm_editor.getCursor();
			var token = cm_editor.getTokenAt(cursor);

			if (token.type === null || token.type === 'comment' || code === 186) {
				self.hide();
				cm_editor.focus();
				return;
			}

			/*
						if (((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 219 && code <= 222) || (code > 186 && code <= 192) || code == 32) && !self.metaKey && !self.ctrlKey && !self.altKey) {
							console.log("keycode = " + code);
							console.log(self.search(token.string));
							if (self.result.length > 0) {
								self.show();
								cm_editor.focus();
								self.select_top();
							}
							else {
								self.hide();
								cm_editor.focus();
							}

						}
						else if ((self.metaKey || self.ctrlKey || self.altKey) && ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || code == 189)) {
							self.metaKey = false;
							self.ctrlKey = false;
							self.altKey = false;
							cm_editor.focus();
						}
						else { //if (code < 36 && code > 40 && code != 8 && code != 46 && code != 27 && code != 13 && code != 32 && code != 17 && code != 16) {
							self.hide();
							cm_editor.focus();
						}
			*/
			// 			console.log(token.string);

			//All new code...
			if (code != 38 && code != 40) { //key 'up', 'down'
				if (self.search(token.string) && code != 13 && code != 9 && !self.metaKey && !self.ctrlKey && !self.altKey) {
					//console.log("keycode = " + code);
					if (self.result.length > 0) {
						self.show();
						cm_editor.focus();
						self.select_top();
					} else {
						self.hide();
						cm_editor.focus();
					}
				} else if ((self.metaKey || self.ctrlKey || self.altKey) && ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || code == 189 || code == 32)) {
					self.metaKey = false;
					self.ctrlKey = false;
					self.altKey = false;
					cm_editor.focus();
				} else {
					self.hide();
					cm_editor.focus();
				}
			}

			if (self.display) {
				if (code == 27) { // key 'escape'
					CodeMirror.e_stop(e);

					self.hide();

					cm_editor.focus();
					// 				}  else if (code == 32 && self.ctrlKey) {
					// 					self.complete();

					// 					cm_editor.focus();
				} else if (code == 37 || code == 39) { // key 'left arrow'||'right arrow'
					self.hide();
					cm_editor.focus();
				} else if (code == 8 || code == 46) { // key 'backspace' || 'delete'
					if (token && token.string.trim() !== '') {
						// 						token.string = token.string.slice(0, -1);

						if (token.string === '') {
							self.hide();
						} else {
							self.search(token.string);
							self.show();
							self.select_top();
						}
					} else {
						self.hide();
					}

					// 					cm_editor.triggerOnKeyDown(e);
					cm_editor.focus();
					// 				} else if (code == 17 || code == 32) { //control & space (in mac)
					// 					self.hide();
					// 					cm_editor.focus();
					// 				} else {
					// 					cm_editor.focus();
					// 					self.autokey_down = true;
				}
			}
		}, 200));

		cm_editor.on('scroll', $.throttle(function() {
			if (self.display) {
				self.hide();
				cm_editor.focus();
			}
		}, 200));

		//         cm_editor.on("cursorActivity", function() {
		//             if (cm_editor.history_mode == "history") return;

		//             var cur = cm_editor.getCursor();
		//             var line = cur.line + 1;
		//             var ch = cur.ch;

		//             if (!(line == self.history_line && ch == self.history_ch + 1)) {
		// 				console.log("wtf?");
		//                 dictionary_box.hide();
		//             }
		//         });

		//         $target.on('keydown', function(e) {
		// 			var cursor = cm_editor.getCursor();
		// 			var token = cm_editor.getTokenAt(cursor);

		//             if (dictionary_box.css("display") == "block" && e.keyCode == 8) {

		//                 if (token && token.string.trim() !== "") {
		//                     token.string = token.string.slice(0, -1);

		//                     if (token.string === "") {
		//                         self.hide();
		//                     } else {
		//                         self.search(token.string);
		//                         self.show();
		//                     }
		//                 } else {
		//                     self.hide();
		//                 }
		//             }
		//         });

		$target.mousedown(function() {
			self.hide();
		});

		// $target.on("keyup", function(e) {
		//     if (dictionary_box.css("display") == "block" && e.keyCode != 8 && e.keyCode != 32) {
		//         var cursor = self.editor.getCursor();
		//         var token = self.editor.getTokenAt(cursor);

		//         self.search(token.string);
		//         self.show(self.editor);
		//     }
		// });
	}
};
