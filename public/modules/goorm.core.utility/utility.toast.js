/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.utility.toast = {
	panel: null,
	default_duration: 0.5,

	init: function () {
		var self = this;

		this.panel = $('#dlg_toast');

		// give focus to current top modal for keyboard events. Jeong-Min Im.
		this.panel.on('hidden.bs.modal', function() {
			$('.modal.in').focus();			
		});

		this.panel.on("show.bs.modal", function() {	// jeongmin: event should be binded to only one element, not .modal

			$(this).css('display', 'block');
			var $dialog = $(this).find(".modal-dialog");
			var offset_height = (($(window).height() - $dialog.height()) / 2);
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			$(this).css("top", offset_height - 30).css("left", offset_width);
		});

		// this.panel.on("show.bs.modal", function (){	//jeongmin: done at dialog.js
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

	show: function (str, duration, callback) {
		var self = this;

		if(!str) str = "";

		this.panel.find('.modal-body').html(str);
		this.panel.modal('show');

		if (duration !== undefined && typeof (duration) == "number") {
			// window.setTimeout(function() {
        	var temp = $.debounce(function() {
				self.panel.modal('hide');

				if (callback) {
					window.setTimeout(function () {
						callback();
					}, self.default_duration*1000 + 100);
				}

				core.restore_prev_focus();

			}, duration);
			temp();

		} else {
			//default
			// window.setTimeout(function() {
        	var temp = $.debounce(function() {
				self.panel.modal('hide');

				if (callback) {
					window.setTimeout(function (){
						callback();
					}, self.default_duration*1000 + 100);
				}

				core.restore_prev_focus();
			}, 1000);
			temp();
		}
	}
};
