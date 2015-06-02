/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/
goorm.core.terminal.background = function(name, target) {
	if (name !== 'background') {
		name = 'background_' + name;
	}

	this.terminal = null;
	this.target = target;
	this.name = name;

	this.configs = {
		on_ready: function() {},
		on_message: function(msg) {
			return msg;
		}
	};

	this.init(name, target);
};
goorm.core.terminal.background.prototype = {
	init: function(name, target) {
		var self = this;

		//if (!target) {
		//	target = $("<div>");
		//}

		this.terminal = new goorm.core.terminal();
		this.terminal.init(null, name, false);

		var buffer = '';
		this.terminal.on_message = function(msg) {
			buffer += msg.stdout;

			if (/<bg\$>complete/.test(buffer)) {
				self.complete();
			}
		};
	},

	get_terminal: function() {
		return this.terminal;
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
		if (!this.terminal) {
			return;
		}
		if (!callback) {
			callback = function() {};
		}

		this.terminal.send_command(cmd + '\r', options, function(data) {
			callback(data);
		}, callback_prompt);
	},
	fs_rm: function(name, callback) {
		var path = this.get_path(name);
		this.command('rm -rf "' + path + '"', callback);
	},
	fs_mkdir: function(name, callback) {
		var path = this.get_path(name);
		this.command('mkdir -p "' + path + '";chmod -R 770 "' + path + '"', callback);
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

	complete: function() {
		var configs = this.configs;

		if (configs.on_message && typeof(configs.on_message) === 'function') {
			this.terminal.on_message = configs.on_message;
		}

		if (configs.on_ready && typeof(configs.on_ready) === 'function') {
			configs.on_ready();
		}
	},

	on_ready: function(on_ready) {
		if (!on_ready) {
			on_ready = function() {};
		}
		this.configs.on_ready = on_ready;
	},

	on_message: function(on_message) {
		if (!on_message) {
			on_message = function(msg) {
				return msg;
			};
		}

		this.configs.on_message = on_message;
	}
};
