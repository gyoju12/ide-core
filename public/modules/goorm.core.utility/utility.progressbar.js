/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.utility.progressbar = {
	max: 100,
	min: 0,

	set: function(value, id) { //value: progress percentage, id: loading bar's progress bar
		this.container = id ? id : "#goorm_progress_bar"; //jeongmin: decide where this progress bar is in
		if (value < 100) {
			this.be_active();
		} else {
			this.complete();
		}

		$(this.container).attr('aria-valuenow', value);
		$('span.sr-only', this.container).html(value + "% Complete (success)");
		$(this.container).css('width', value + '%');
		if (value == 0) {
			$(this.container).addClass("hide");
			$(this.container).removeClass("active");
		}
	},
	
	str: function(str, title) {
		title = title ? title : "goorm_progress_bar";
		$(title).html(src || core.module.localization.msg.please_wait);
		
	},

	be_active: function() {
		if (!$(this.container).hasClass('active')) {
			$(this.container).addClass('active');
			$(this.container).removeClass("hide");
		}
	},

	complete: function() {
		$(this.container).removeClass('active');
		$(this.container).addClass("hide");
	}
};