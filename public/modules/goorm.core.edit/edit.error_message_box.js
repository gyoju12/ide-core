/*
 *
 *
 */


goorm.core.edit.error_message_box = function() {
	this.container = null;
};

goorm.core.edit.error_message_box.prototype = {
	add: function(container) {
		this.container = container;
		var html = "<span style='display:none;' class='error_message_box'></span>";
		$(container).append(html);
	},

	bind: function(message) {
		var container = this.container;
		var box = $(container).find("span.error_message_box");
		box.append(message);
	},

	show: function(e) {
		var container = this.container;
		var box = $(container).find("span.error_message_box");
		box.css('left', e.pageX + 5);
		box.css('top', e.pageY + 5);
		box.show();
	},

	hide: function() {
		var container = this.container;
		var box = $(container).find("span.error_message_box");

		box.hide();
	},

	empty: function() {
		var container = this.container;
		var box = $(container).find("span.error_message_box");
		box.empty();
	},

	clear: function() {
		// if ($('span.error_message_box')) {
			// $('span.error_message_box').remove();
		// }
		if ($(this.container).find('span.error_message_box').remove())
			$(this.container).find('span.error_message_box').remove();
	}
};