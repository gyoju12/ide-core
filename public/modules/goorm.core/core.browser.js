/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.browser = {
	init: function () {
		// Get the Browser Information
		var user_agent = navigator.userAgent.toLowerCase();

		// Figure out what browser is being used
		$.browser = {
			version: (user_agent.match(/.+(?:rv|it|ra|ie|me)[\/: ]([\d.]+)/) || [])[1],
			chrome: /chrome/.test(user_agent),
			safari: /webkit/.test(user_agent) && !/chrome/.test(user_agent),
			opera: /opera/.test(user_agent),
			msie: /msie/.test(user_agent) || /trident/.test(user_agent),
			firefox: /firefox/.test(user_agent)
		};

		var _browser = $.browser;	//jeongmin: access object member less

		if (_browser.firefox)
			this.name = "Firefox";
		else if (_browser.msie)
			this.name = "IE";
		else if (_browser.opera)
			this.name = "Opera";
		else if (_browser.chrome)
			this.name = "Chrome";
		else if (_browser.safari)
			this.name = "Safari";
		else
			this.name = "Unknown";

		this.version = _browser.version;

		$('.browser_name').html([this.name, " ", this.version].join(""));	//jeongmin: array.join() is better than + for concatenating strings
		//attach tooltips --heeje
		$(".browser-icon").attr('title', $('.browser_name').text()).tooltip();
	}
};
