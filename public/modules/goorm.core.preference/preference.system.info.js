/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.preference.info = {
	version: 1.0,
	is_ipad: false,
	os: null,
	

	init: function() {
		$(core).on('goorm_login_complete', function() {
			// _$.get("/preference/get_server_info", null, function(data) {
			// 	if (data.err_code === 0) {
			// 		$("#server_os").append(data.info.os_version);
			// 		$("#node_version").append(data.info.node_version);

			// 		core.dialog.help_license.set_version(data.info.node_version);

			// 		
			// 	}
			// });

			$.get('/preference/get_goorm_info', null, function(data) {
				if (data.err_code === 0) {
					core.env.version = data.info.version;
					$('.goorm_version').html('goorm-core ' + core.env.version);
					//attach tooltips --heeje
					$('.version-icon').attr('title', $('.goorm_version').text()).tooltip();
					// $("#core_version").append(data.info.version);

					// $.each(data.info.lib, function(index, lib) {
					// 	var version = lib.version;
					// 	switch (lib.name) {
					// 		case "jQuery":
					// 			$("#jquery_version").append(version);
					// 			$("#jquery_oss_version").html('jQuery ' + version);
					// 			break;
					// 		case "jQuery UI":
					// 			$("#jqueryui_version").append(version);
					// 			break;
					// 		case "CodeMirror":
					// 			$("#codemirror_version").append(version);
					// 			$("#codemirror_oss_version").html('CodeMirror ' + version);
					// 			break;
					// 		case "GCC":
					// 			$("#gcc_version").append(version);
					// 			$("#gcc_version").css('display', '');
					// 			break;
					// 		case "GDB":
					// 			$("#gdb_version").append(version);
					// 			$("#gdb_version").css('display', '');
					// 			break;
					// 		case "Java":
					// 			$("#java_version").append(version);
					// 			$("#java_version").css('display', '');
					// 			break;
					// 		case "Node":
					// 			$("#node_version_preference").append(version);
					// 			$("#node_version_preference").css('display', '');
					// 			break;
					// 		case "Python":
					// 			$("#python_version").append(version);
					// 			$("#python_version").css('display', '');
					// 			break;
					// 	}
					// });

					core.dialog.help_license.set_version(data.info.lib);
				}
			});
		});

		if (navigator.appVersion.indexOf('Win') != -1) {
			this.os = 'windows';
		} else if (navigator.appVersion.indexOf('Mac') != -1) {
			this.os = 'MacOS';
		} else if (navigator.appVersion.indexOf('X11') != -1) {
			this.os = 'UNIX';
		} else if (navigator.appVersion.indexOf('Linux') != -1) {
			this.os = 'Linux';
		} else {
			this.os = 'Unknown';
		}

		if ($.browser.mozilla) {
			this.browser = 'Firefox';
		} else if ($.browser.msie) {
			this.browser = 'IE';
		} else if ($.browser.opera) {
			this.browser = 'Opera';
		} else if ($.browser.chrome) {
			this.browser = 'Chrome';
		} else if ($.browser.safari) {
			this.browser = 'Safari';
		} else {
			this.browser = 'Unknown';
		}

		this.version = $.browser.version;

		//Need for device identification
		this.is_ipad = navigator.userAgent.match(/iPad/i) !== null;

		$('#cos').append(this.os);
		$('#browser').append(this.browser + ' (' + this.version + ')');
		if (this.is_ipad) {
			$('#device').append('iPad');
		} else {
			$('#device').append('PC');
		}

		
	}
};
