/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog.confirmation = function () {
	this.panel = null;
	// this.context_menu = null;
	// this.path = null;
	this.title = null;
	// this.type = null;
	// this.left = null;
	// this.top = null;
	// this.width = null;
	// this.height = null;
	this.yes_text = null;
	this.no_text = null;
	this.yes = null;
	this.no = null;
	this.close = null;
	this.first_init = false;
	this.recursive = false;
	this.bt_clicked = false;

	// this.handler_flag = true;
	// this.handler_time = 2500;
};

goorm.core.dialog.confirmation.prototype = {
	init: function (option) {
		var self = this;

		this.panel = $('#dlg_confirmation');

		this.title = option.title;
		this.message = option.message;
		this.zIndex = option.zIndex || 2;

		this.yes_text = core.module.localization.msg.confirmation_yes || "Yes";
		this.no_text = core.module.localization.msg.confirmation_no || "No";

		this.yes_text = option.yes_text || this.yes_text;
		this.no_text = option.no_text || this.no_text;
		// this.yes_localization = option.yes_localization || "confirmation_yes";
		// this.no_localization = option.no_localization || "confirmation_no";

		this.yes = option.yes;
		this.no = option.no;
		this.close = option.close;

		if(this.title !== "" && this.title !== undefined) {
			this.title_id = this.title.replace('?', "");
			$("#confirmation_title").html(this.title);
		}	

		var goorm_dialog_container = this.panel.find('#confirmation_content_container');
		goorm_dialog_container.empty().append(this.message);

		this.panel.on("show.bs.modal", function() {	// jeongmin: event should be binded to only one element, not .modal

			$(this).css('display', 'block');
			var $dialog = $(this).find(".modal-dialog");
			var offset_height = (($(window).height() - $dialog.height()) / 2);
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			$(this).css("top", offset_height - 30).css("left", offset_width);
		});

		var cfrm_btn_yes = this.panel.find(".modal-footer #g_cfrm_btn_yes");	//jeongmin: yes confirm button
		var cfrm_btn_no = this.panel.find(".modal-footer #g_cfrm_btn_no");	//jeongmin: no confirm button
		var cfrm_btn_close = this.panel.find(".modal-header .close");
		// Button Text & Localization
		//
		if (this.yes_text) {
			cfrm_btn_yes.html(this.yes_text);
		}

		// if (this.yes_localization) {
		// 	cfrm_btn_yes.attr("localization_key", this.yes_localization);
		// }

		if (this.no_text) {
			cfrm_btn_no.html(this.no_text);
		}

		// if (this.no_localization) {
		// 	cfrm_btn_no.attr("localization_key", this.no_localization); 
		// }

		cfrm_btn_yes.off('click');
		cfrm_btn_yes.click(function(){
			self.bt_clicked = true;

			self.panel.modal('hide');

			if(typeof option.yes == "function") {
				option.yes.call();
			}
		});

		cfrm_btn_no.off('click');
		cfrm_btn_no.click(function(){
			self.bt_clicked = true;

			self.panel.modal('hide');

			if(typeof option.no == "function") {
				option.no.call();
			}
		});

		cfrm_btn_close.off('click');
		cfrm_btn_close.click(function(){
			self.bt_clicked = true;

			self.panel.modal('hide');

			if(typeof option.no == "function") {
				option.no.call();
			}
		});

		if (!this.first_init) {
			this.first_init = true;
			this.panel.on('hidden.bs.modal', function(){
				
				$('.modal.in').focus();

				if(!self.bt_clicked && typeof option.no == "function")
					cfrm_btn_no.click();
					//option.no.call();

				if(typeof option.close == "function") {
					option.close.call();
				}
				//self.panel.modal('hide');

				self.bt_clicked = false;	//jeongmin: reset 
			});
		}

		this.panel.off("keydown");
		this.panel.on("keydown", function (e) {
			if (e.keyCode == 13) {
				cfrm_btn_yes.click();
			}
			// if(e.keyCode == 27) {
			// 	cfrm_btn_no.click();
			// }
		});

		return this;
	},

	show: function () {
		var self = this;

		if (this.recursive) {
			$('div.modal-backdrop.fade.in').first().remove();

			// window.setTimeout(function() {
        	var temp = $.debounce(function() {
				if (self.panel.modal) {
					self.panel.modal('show');
				}
			}, 500);
			temp();
		}
		else {
			if (this.panel.modal) {
				this.panel.modal('show');
			}
		}
	},

	hide: function () {
		if (this.panel.modal) {
			this.panel.modal('hide');
		}
	},

	set: function (option, value) {
		this[option] = value;
	}
};
