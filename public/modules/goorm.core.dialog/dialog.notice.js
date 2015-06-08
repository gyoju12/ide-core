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
	this.message = null;
	this.icon = null;
	this.options = {
		'image': true
	};
	this.message_container = null;
};

goorm.core.dialog.notice.prototype = {
	init: function() {
		var self = this;

		// this.title = "Notice";
		this.panel = $('#dlg_notice');

		this.message_container = this.panel.find('.notice_content_div');
		this.icon_container = this.panel.find('.notice_image_div');
		
		this.panel.find('.modal-footer button:last-child').last().click(function() {
			self.panel.modal('hide');
		});

		this.panel.bind('keydown', function(e) {
			switch (e.keyCode) {
				case 13: // enter key
					$('#dlg_notice').modal('hide');
					e.stopPropagation();
					e.preventDefault();
					break;
			}
		});

		this.panel.on('hidden.bs.modal', function() {
			$('.modal.in').focus();

			//fix deleting project
			if ($('#dlg_delete_project').attr('class').indexOf('in') >= 0) {
				$('#project_delete_list').focus();
			}
		});

		this.panel.on('show.bs.modal', function() { // jeongmin: event should be binded to only one element, not .modal
			$(this).css('display', 'block');
			
			var $dialog = $(this).find('.modal-dialog');
			var offset_height = (($(window).height() - $dialog.height()) / 2);
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			
			$(this).css('top', offset_height - 30).css('left', offset_width);
		});

		this.panel.on('shown.bs.modal', function() {
			$('#project_delete_list').blur();
			
			$(this).focus();
		});
	},
	
	left: function () {
		this.panel.find('#notice_content_container').css('text-align', 'left');
	},

	center: function () {
		this.panel.find('#notice_content_container').css('text-align', 'center');
	},
	
	show: function(message, options) {
		var filtered_msg = core.module.bookmark_list.filtering((message || '').replace(/<br\/?>/g, '\n')).replace(/\n/g, '<br/>');
		var _options = options || this.options;
		
		this.message = filtered_msg;
		this.message_container.empty().html(this.message);
		
		if (!_options.image) {
			this.center();
			this.icon_container.hide();
		} else {
			this.left();
			this.icon_container.show();
		}

		this.panel.modal('show');
	}
};
