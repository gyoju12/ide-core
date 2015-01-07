/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/
goorm.core.terminal.background = function(name) {
	if (name !== "background") {
		name = "background_" + name;
	}
	this.terminal = null;
	this.name = name;

	this.init(name);
};
goorm.core.terminal.background.prototype = {
	init: function(name) {
		var self = this;
		this.terminal = new goorm.core.terminal();
		this.terminal.init($("<div>"), name, false);

		var buffer = "";
		this.on_message(function on_message(msg) {
			buffer += msg.stdout;
			if (/<bg\$>complete/.test(buffer)) {
// 				console.log(self.name, "complete");
				self.on_message(function() {});
				self.on_ready();
			}
		});
	},

	/**
	 * Wrapping method of terminal.send_command
	 * @method command
	 * @param  {String}   cmd             [a command to execute]
	 * @param  {Function} callback        [callback function to execute after the command]
	 * @param  {String}   options         []
	 * @param  {String}   callback_prompt []
	 */
	command: function(cmd, callback, options, callback_prompt) {
		if (!this.terminal) return;
		if (!callback) callback = function() {};

		this.terminal.send_command(cmd + "\r", options, function(data) {
			callback(data);
		}, callback_prompt);
	},
	fs_rm: function(name, callback) {
		var path = this.get_path(name);
		this.command("rm -rf \"" + path + "\"", callback);
	},
	fs_mkdir: function(name, callback) {
		var path = this.get_path(name);
		this.command("mkdir -p \"" + path + "\";chmod -R 770 \"" + path + "\"", callback);
	},
	fs_move: function(from, to, callback) {
		var from = this.get_path(from);
		var to = this.get_path(to);
		this.command("mv \"" + from + "\" \"" + to + "\"", callback); // jeongmin: remove -n option for overwriting
	},
	
	refresh_terminal: function() {
		if (this.terminal) {
			this.terminal.change_project_dir();
		}
	},

	/**
	 * Return absolute path
	 * @method get_path
	 * @param  {String} name [file/folder name]
	 * @return {String}      [absolute path]
	 */
	get_path: function(name) {
		var workspace = core.preference.workspace_path;
		if (name) {
			return workspace + name;
		} else {
			return workspace;
		}
	},

	on_message: function(on_message) {
		if (!on_message) on_message = function() {};
		this.terminal.on_message = on_message;
	},

	on_ready: function() {}
};