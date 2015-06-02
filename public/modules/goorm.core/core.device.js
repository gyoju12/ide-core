/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.device = {
	init: function() {
		// Get the device type / osType / is_touchable_device

		var nav_agent = navigator.userAgent; //jeongmin: access object member less

		var is_ipad = nav_agent.match(/iPad/i) !== null;
		var is_iphone = nav_agent.match(/iPhone/i) !== null;
		var is_ipod = nav_agent.match(/iPod/i) !== null;
		var is_android = nav_agent.match(/Android/i) !== null;
		var is_webos = nav_agent.match(/webOS/i) !== null;

		var device_type = $('.device_type');

		if (is_ipad) {
			device_type.html('iPad');

			this.type = 'iPad';
			this.os = 'iOS';
		} else if (is_iphone) {
			device_type.html('iPhone');

			this.type = 'iPhone';
			this.os = 'iOS';
		} else if (is_ipod) {
			device_type.html('iPod');

			this.type = 'iPod';
			this.os = 'iOS';
		} else if (is_android) {
			device_type.html('Android');

			this.type = 'Android';
			this.os = 'Android';
		} else if (is_webos) {
			device_type.html('webOS');

			this.type = 'webOS';
			this.os = 'webOS';
		} else {
			device_type.html('PC');

			this.type = 'PC';

			var nav_appVer = navigator.appVersion; //jeongmin: access object member less

			if (nav_appVer.indexOf('Win') != -1) {
				this.os = 'windows';
			}
			if (nav_appVer.indexOf('Mac') != -1) {
				this.os = 'MacOS';
			}
			if (nav_appVer.indexOf('X11') != -1) {
				this.os = 'UNIX';
			}
			if (nav_appVer.indexOf('Linux') != -1) {
				this.os = 'Linux';
			}
		}

		//attach tooltips --heeje
		$('.device-icon').attr('title', this.type).tooltip();
	}
};
