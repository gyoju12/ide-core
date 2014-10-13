/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

 goorm.core.project.background_build = function (cmd, options, callback) {
 	// If parameter number is 2, only cmd and callback. options is null
 	if (typeof(options) === 'function') {
 		callback = options;
 		options = null;
 	}

 	var background_terminal = core.module.terminal.terminal;

 	background_terminal.send_command(cmd + '\r', options, function (result) {
 		if (callback && typeof(callback) === 'function') {
 			callback(result);
 		}
 	});
 };