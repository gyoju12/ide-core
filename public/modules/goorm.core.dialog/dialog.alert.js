/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog.alert = function() {
	this.panel = null;
	this.message = null;
	this.image_url = null;
};

goorm.core.dialog.alert.prototype = {
	init: function() {
		var self = this;

		this.panel = $('#dlg_alert');

		this.image_url = "data:image/png;base64,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";
		this.panel.find(".modal-footer button:last-child").last().click(function(){
			self.panel.modal('hide');
		});

		this.panel.keydown(function(e) {
			switch (e.keyCode) {
				case 13: // enter key
					self.panel.modal('hide');
			}
		});

		this.panel.on('hidden.bs.modal', function() {
			$('.modal.in').focus();

			//fix deleting project
			if($('#dlg_delete_project').attr('class').indexOf('in') >= 0)
				$("#project_delete_list").focus();

			if(self.callback) self.callback();

		});

		this.panel.on("show.bs.modal", function() {	// jeongmin: event should be binded to only one element, not .modal

			$(this).css('display', 'block');
			var $dialog = $(this).find(".modal-dialog");
			var offset_height = (($(window).height() - $dialog.height()) / 2);
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			$(this).css("top", offset_height - 30).css("left", offset_width);
		});

		// move to Center	//jeongmin: done at dialog.js
		//
		// this.panel.on("show.bs.modal", function (){
		// 	setTimeout(function () {
		// 		self.panel.css('top', '0px');

		// 		var container = self.panel.find('.modal-dialog');

		// 		var window_height = $(window).height();
		// 		var container_height = container.height();

		// 		if (window_height > container_height) {
		// 			container.css('margin-top', ((window_height-container_height)/2) + 'px');
		// 		}
		// 		else {
		// 			container.css('margin-top', '10px');
		// 		}			
		// 	}, 200); // fade animation: 0.15s -> 150
		// });
	},

	show: function(message, callback) {
		var filtered_msg = message || '';
		filtered_msg = core.module.bookmark.filtering(filtered_msg.replace(/<br\/?>/g, '\n')).replace(/\n/g, '<br/>'); // jeongmin: replacing is for keeping new line alive

		this.message = filtered_msg;
		this.callback = callback;

		var panelContainer_bd = this.panel.find("#alert_content_container");

		panelContainer_bd.empty();
		panelContainer_bd.append("<div class='alert_content_div col-md-9'>" + this.message + "</div>").prepend("<div class='alert_image_div col-md-3'><img src='" + this.image_url + "'/></div>");

		this.panel.modal('show');
	}
};
