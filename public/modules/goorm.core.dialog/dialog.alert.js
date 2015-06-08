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
	this.message_container = null;
};

goorm.core.dialog.alert.prototype = {
	init: function() {
		var self = this;

		this.panel = $('#dlg_alert');
		this.message_container = this.panel.find('.alert_content_div');
		
		this.panel.find('.modal-footer button:last-child').last().click(function() {
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
			if ($('#dlg_delete_project').attr('class').indexOf('in') >= 0) {
				$('#project_delete_list').focus();
			}

			if (self.callback) {
				self.callback();
			}

		});

		this.panel.on('show.bs.modal', function() { // jeongmin: event should be binded to only one element, not .modal

			$(this).css('display', 'block');
			var $dialog = $(this).find('.modal-dialog');
			var offset_height = (($(window).height() - $dialog.height()) / 2);
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			$(this).css('top', offset_height - 30).css('left', offset_width);
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
		var filtered_msg = core.module.bookmark_list.filtering((message || '').replace(/<br\/?>/g, '\n')).replace(/\n/g, '<br/>'); // jeongmin: replacing is for keeping new line alive

		this.message = filtered_msg;
		this.callback = callback;

		this.message_container.html(this.message);
		
		this.panel.modal('show');
	}
};
