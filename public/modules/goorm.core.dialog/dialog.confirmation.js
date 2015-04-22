/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog.confirmation = function() {
	this.panel = null;
	this.yes_bt = null;
	this.no_bt = null;
	this.first_init = false;
	this.bt_clicked = false;
	this.option = null;
	this.queue = [];
};

goorm.core.dialog.confirmation.prototype = {
	init: function(option) {
		var self = this;

		this.queue.push(option);

		if (!this.first_init) {
			this.first_init = true;

			this.panel = $('#dlg_confirmation');
			this.yes_bt = $('#g_cfrm_btn_yes');
			this.no_bt = $('#g_cfrm_btn_no');

			this.yes_bt.click(function() {
				self.bt_clicked = true;

				self.panel.modal('hide');

				if (typeof self.option.yes === 'function') {
					self.option.yes();
				}
			});
			this.no_bt.click(function() {
				self.bt_clicked = true;

				self.panel.modal('hide');

				if (typeof self.option.no === 'function') {
					self.option.no();
				}
			});
			this.panel.find('.close').click(function() {
				this.no_bt.click();
			});

			this.panel.on('show.bs.modal', function() { // jeongmin: event should be binded to only one element, not .modal
				$(this).css('display', 'block');

				var offset_height = ($(window).height() - $(this).find('.modal-dialog').height()) / 2 - 30;
				var offset_width = ($(window).width() - $(this).find('.modal-dialog').width()) / 2;

				$(this).css('top', offset_height).css('left', offset_width).css('z-index', self.option.zIndex);
			}).on('shown.bs.modal', function() {
				$(this).find('.form-control:first').focus();
			}).on('hide.bs.modal', function() {
				if (self.queue.length) {
					self.show();

					return false;
				}
			}).on('hidden.bs.modal', function() {
				$('.modal.in').focus();

				if (!self.bt_clicked && typeof self.option.no === 'function') {
					this.no_bt.click();
				}

				if (typeof self.option.close === 'function') {
					self.option.close();
				}

				self.bt_clicked = false; //jeongmin: reset
			}).on('keydown', function(e) {
				if (e.keyCode === 13) {
					this.yes_bt.click();
				}
			});
		}

		return this;
	},

	show: function() {
		this.option = this.queue.shift();

		if (this.option) {
			var localization_msg = core.module.localization.msg;

			$('#confirmation_title').html(this.option.title || localization_msg.confirmation_title || 'Confirmation')
			$('#confirmation_content_container').empty().append(this.option.message);
			this.yes_bt.html(this.option.yes_text || localization_msg.yes || 'Yes');
			this.no_bt.html(this.option.no_text || localization_msg.no || 'Yes');

			if (this.panel.modal) {
				this.panel.modal('show');
			}
		}
	},

	hide: function() {
		if (this.panel.modal) {
			this.panel.modal('hide');
			this.option = null;
		}
	}
};
