goorm.core.edit.error_manager = function() {
	this.parent = null;
	this.storage = [];
	this.marker = [];
	this.count = 0;
	this.error_message_box = null;
};

goorm.core.edit.error_manager.prototype = {
	init: function(parent) {
		this.parent = parent;
		this.error_message_box = new goorm.core.edit.error_message_box();
	},

	get: function(index) {
		var data = this.storage[index] || null;
		return data;
	},

	add_line: function(error_data) {
		var parent = this.parent;
		var editor = parent.editor;
		var count = this.count;

		var line_number = error_data.line_number;
		var error_syntax = error_data.error_syntax;
		var error_type = (error_data.error_type !== undefined) ? error_data.error_type.toLowerCase() : 'error';

		var marker_icon = '<i class="fa fa-times-circle fa-1"></i>';
		var underline_class = 'cm-underline-error cm-underline-error-line-';

		if (error_syntax !== undefined) { // jeongmin: if error is about whole file, line isn't specified. So, no syntax.
			if (error_type == 'warning') {
				marker_icon = '<i class="fa fa-exclamation-triangle fa-1"></i>';
				underline_class = 'cm-underline-warning cm-underline-warning-line-';
			}
			var make_marker = function(marker_html, option) {
				var marker = document.createElement('div');
				marker.innerHTML = marker_html;
				marker.className = 'exception_error';
				marker.id = 'exception_error' + option.count;
				marker.setAttribute('line_number', line_number);
				return marker;
			};

			editor.setGutterMarker(line_number, 'exception_error', make_marker(marker_icon, {
				'count': count,
				'line_number': line_number
			}));

			var editor_data = editor.getDoc();
			var editor_line = editor_data.getLine(line_number);

			//error_syntax = error_syntax.trim(); // delete whitespace
			if (editor_line) {
				var line_info = editor_line.trim();
				var ch_start = editor_line.indexOf(line_info);
				var ch_end = ch_start + line_info.length;

				var marker = editor_data.markText({
					'line': line_number,
					'ch': ch_start
				}, {
					'line': line_number,
					'ch': ch_end
				}, {
					'className': underline_class + line_number
				});

				this.marker.push(marker);
			}
		}

		this.storage.push(error_data);
		this.count++;
	},

	init_event: function() {
		var self = this;

		$('span.cm-underline-error').off('mouseover');
		$(document).on({
			mouseover: function(e) {
				var __class = $(this).attr('class').split(' ');

				var line_number = -1;
				var message = '';

				__class.map(function(o) {
					if (o && o.indexOf('cm-underline-error-line-') > -1) {
						line_number = o.replace(/cm-underline-error-line-/, '');
					}
				});

				for (var i = 0; i < self.storage.length; i++) {
					var data = self.storage[i];

					if (data && data.line_number == parseInt(line_number, 10)) {
						message += data.error_message + '<br>';
					}
				}
				if (message !== '') {
					self.error_message_box.empty();
					self.error_message_box.bind(message);
					self.error_message_box.show(e);
				}
			},
			mouseout: function() {
				self.error_message_box.hide();
			}
		}, 'span.cm-underline-error');

		$('span.cm-underline-warning').off('mouseover');
		$(document).on({
			mouseover: function(e) {
				var __class = $(this).attr('class').split(' ');

				var line_number = -1;
				var message = '';

				__class.map(function(o) {
					if (o && o.indexOf('cm-underline-warning-line-') > -1) {
						line_number = o.replace(/cm-underline-warning-line-/, '');
					}
				});

				for (var i = 0; i < self.storage.length; i++) {
					var data = self.storage[i];

					if (data && data.line_number == parseInt(line_number, 10)) {
						message += data.error_message + '<br>';
					}
				}
				if (message !== '') {
					self.error_message_box.empty();
					self.error_message_box.bind(message);
					self.error_message_box.show(e);
				}
			},
			mouseout: function() {
				self.error_message_box.hide();
			}
		}, 'span.cm-underline-warning');

		$('div.exception_error').off('mouseover');
		$(document).on({
			mouseover: function(e) {
				var line_number = $(this).attr('line_number');
				var message = '';
				for (var i = 0; i < self.storage.length; i++) {
					var data = self.storage[i];

					if (data && data.line_number == line_number) {
						message += data.error_message + '<br>';
					}
				}

				if (message !== '') {
					self.error_message_box.empty();
					self.error_message_box.bind(message);
					self.error_message_box.show(e);
				}
			},
			mouseout: function() {
				self.error_message_box.hide();
			}
		}, 'div.exception_error');

	},

	clear: function() {
		var parent = this.parent;
		var editor = parent.editor;

		editor.clearGutter('exception_error');
		if (!editor.getDoc().isClean()) {
			editor.getDoc().markClean();
		}

		for (var i = 0; i < this.marker.length; i++) {
			this.marker[i].clear();
		}

		this.error_message_box.clear();
		this.storage = [];
		this.marker = [];
		this.count = 0;
	}

	// error_message_box: {
	//     add: function(container) {
	//         this.container = container;
	//         var html = "<span style='display:none;' id='error_message_box'></span>";svn
	//         $(container).append(html);
	//     },

	//     bind: function(message) {
	//         var container = this.container;
	//         var box = $(container).find("span#error_message_box");

	//         box.append(message);
	//     },

	//     show: function(e) {
	//         var container = this.container;
	//         var box = $(container).find("span#error_message_box");

	//         box.css('left', e.pageX + 5);
	//         box.css('top', e.pageY + 5);

	//         box.show();
	//     },

	//     hide: function() {
	//         var container = this.container;
	//         var box = $(container).find("span#error_message_box");

	//         box.hide();
	//     },

	//     empty: function() {
	//         var container = this.container;
	//         var box = $(container).find("span#error_message_box");

	//         box.empty();
	//     },

	//     clear: function() {
	//         if ($('span#error_message_box')) {
	//             $('span#error_message_box').remove();
	//         }
	//     }
	// }
};
