/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog.confirmation.save = function () {
	this.panel = null;
	// this.context_menu = null;
	// this.path = null;
	this.title = null;
	this.type = null;
	this.left = null;
	this.top = null;
	// this.width = null;
	// this.height = null;
	this.yes_text = null;
	this.no_text = null;
	this.yes = null;
	this.no = null;

	this.first_init = false;
	// this.handler_flag = true;
	// this.handler_time = 2500;
};

goorm.core.dialog.confirmation.save.prototype = {
	init: function (option) {
		var self = this;

		this.panel = $('#dlg_confirmation_save');

		this.title = option.title;
		this.message = option.message;

		this.yes_text = option.yes_text;
		this.cancel_text = option.cancel_text;
		this.no_text = option.no_text;

		this.yes = option.yes;
		this.cancel = option.cancel;
		this.no = option.no;

		this.title = this.title.split(" ").join("_");
		this.title_id = this.title.replace('?', "");
		// this.timestamp = new Date().getTime();

		var goorm_dialog_container = this.panel.find('#confirmation_save_content_container');
		goorm_dialog_container.empty().append(this.message);

		if(typeof option.yes == "function") {
			this.panel.find(".modal-footer #g_cfrm_s_btn_yes").off('click');
			this.panel.find(".modal-footer #g_cfrm_s_btn_yes").click(function(){
				option.yes.call();

				self.panel.modal('hide');
			});
		}

		if(typeof option.cancel == "function") {
			this.panel.find(".modal-footer #g_cfrm_s_btn_cancel").off('click');
			this.panel.find(".modal-footer #g_cfrm_s_btn_cancel").click(function(){
				option.cancel.call();

				self.panel.modal('hide');
			});
		}

		if(typeof option.no == "function") {
			this.panel.find(".modal-footer #g_cfrm_s_btn_no").off('click');
			this.panel.find(".modal-footer #g_cfrm_s_btn_no").click(function(){
				option.no.call();

				self.panel.modal('hide');
			});
		}

		if (!this.first_init) {
			this.first_init = true;
			this.panel.on('hidden.bs.modal', function(){
				self.panel.modal('hide');
			});
		}

		this.panel.keydown(function (e) {
			switch (e.keyCode) {
				case 13: 	// 'enter' key
					self.panel.find(".modal-footer #g_cfrm_s_btn_yes").click();
					break;
			}
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
	
	show: function () {
		if (this.panel.modal) {
			this.panel.modal('show');
		}
	},

	hide: function () {
		if (this.panel.modal) {
			this.panel.modal('hide');
		}
	}
};
