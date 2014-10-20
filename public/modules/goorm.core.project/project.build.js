/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.build = function(cmd, options, callback) {

	if (typeof(options) === 'function') {
		callback = options;
		options = null;
	}
	
	//save current project files before save --heeje
	var wm = core.module.layout.workspace.window_manager;
	var current = core.status.current_project_path;
	var project_window = [];

	for (var i = 0; i < wm.window.length; i++) {
		if (wm.window[i].project === current) {
			if (wm.window[i].alive && wm.window[i].editor && !wm.window[i].is_saved) { //sort files that have to be saved
				project_window.push(wm.window[i]);
				// wm.tab[i].set_saved();
			}
		}
	}

	if (project_window && project_window.length > 0) {
		for (var i = 0; i < project_window.length; i++) {

			if (i === project_window.length - 1) {
				//send a build message and call the callback of building project --heeje
				project_window[i].editor.save("build", function() {
					core.module.layout.terminal.send_command(cmd + '\r', options, function(result) {
						core.module.layout.terminal.flush_command_queue();
						if (callback && typeof(callback) === 'function') {
							callback(result);
						}

					});
				});
			} else project_window[i].editor.save();

			// project_window[i].set_saved();
		}
	} else {
		core.module.layout.terminal.send_command(cmd + '\r', options, function(result) {
			core.module.layout.terminal.flush_command_queue();
			if (callback && typeof(callback) === 'function') {
				callback(result);
			}

		});
	}
};

goorm.core.project.build.prototype = {

};