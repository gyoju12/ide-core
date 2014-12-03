/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog.notice = function() {
	this.panel = null;
	// this.context_menu = null;
	// this.path = null;
	// this.title = null;
	this.message = null;
	this.icon = null;
	// this.type = null;
	// this.left = null;
	// this.top = null;
	// this.width = null;
	// this.height = null;
};

goorm.core.dialog.notice.prototype = {
	init: function() {
		var self = this;

		// this.title = "Notice";
		this.panel = $('#dlg_notice');

		// this.title = "Alert";
		this.icon = "<i class=\"fa fa-bullhorn fa-3x\"></i>";
		this.panel.find(".modal-footer button:last-child").last().click(function() {
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

	show: function(message, option_icon, no_image) {
		var filtered_msg = message || '';
		filtered_msg = core.module.bookmark.filtering(filtered_msg.replace(/<br\/?>/g, '\n')).replace(/\n/g, '<br/>'); // jeongmin: replacing is for keeping new line alive

		this.message = filtered_msg;
		//this.title="Notice";
		var panelContainer_bd = this.panel.find("#notice_content_container");
		panelContainer_bd.empty().append("<div class='notice_content_div col-md-10'>" + this.message + "</div>");

		if (!no_image) {
			panelContainer_bd.css('text-align', 'left');

			if (!option_icon) {
				panelContainer_bd.prepend("<div class='notice_image_div col-md-2'>" + this.icon + "</div>");
			} else {
				panelContainer_bd.prepend("<div class='notice_image_div col-md-2'><img style='width:80%; height:80%' src='" + option_icon + "'/></div>");
			}
		} else {
			panelContainer_bd.css('text-align', 'center');
		}

		this.panel.modal('show');
	}
};