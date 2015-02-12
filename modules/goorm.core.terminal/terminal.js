/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var pty = null;

var g_auth_p = require("../goorm.core.auth/auth.project");



//useonly(mode=goorm-oss,goorm-client)
if (/v0.10/.test(process.version)) {
	pty = require('../../libs/core/pty/ver_0.10/pty.js');
} else {
	pty = require('../../libs/core/pty/ver_0.8/pty.js');
}


var utility = require('../../libs/utility.js');
var os = require('os');
var platform = null;
if (/darwin/.test(os.platform())) {
	platform = "darwin";
} else if (/linux/.test(os.platform())) {
	platform = "linux";
} else {}

var spawn = require('child_process').spawn;





module.exports = {
	term: {},
	io: null,

	

	

	start: function(io) {
		var self = this;

		

		//useonly(mode=goorm-oss,goorm-client)	
		self.term = {}; // jeongmin: array -> object for easy management
		

		this.io = io;

		io.set('log level', 0);
		io.sockets.on('connection', function(socket) {
			socket.on('terminal_init', function(msg) {
				try { // jeongmin: try catching
					msg = JSON.parse(msg);
					var data;
					var term_index;

					var name = msg.name;

					var randomStringfunc = function(bits) {
						var chars, rand, i, ret;

						chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzabcdefghijkl';
						ret = '';

						while (bits > 0) {
							// 32-bit integer
							rand = Math.floor(Math.random() * 0x100000000);
							// base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
							for (i = 26; i > 0 && bits > 0; i -= 6, bits -= 6) {
								ret += chars[0x3F & rand >>> i];
							}
						}

						return ret;
					};

					term_index = randomStringfunc(27) + (new Date()).getTime(); //index++; jeongmin: new terminal is created, list++

					//useonly(mode=goorm-oss)	
					var bashrc = global.__path + 'configs/bash.bashrc'
					var command = '--rcfile ' + bashrc;

					self.term[term_index] = {
						pty: pty.spawn('bash', command.split(' '), {
							name: 'xterm-color',
							cols: parseInt(msg.cols, 10),
							rows: 30,
							cwd: process.env.HOME,
							env: process.env
						}),
						workspace: msg.workspace,
						terminal_name: msg.terminal_name,
					};

					self.term[term_index].pty.on('exit', function() {
						io.sockets.in(msg.workspace + '/' + msg.terminal_name + '/' + msg.index).emit("terminal_exited." + msg.terminal_name, {
							index: msg.index
						});
					});


					self.term[term_index].pty.on('data', function(data) {
						var result = {};
						result.stdout = data;
						result.terminal_name = msg.terminal_name;
						result.user = msg.user;
						
						io.sockets.in(msg.workspace + '/' + msg.terminal_name + '/' + msg.index).emit("pty_command_result", result);
					});

					data = {
						index: term_index,
						timestamp: msg.timestamp
					};
					msg.index = data.index;

					socket.join(msg.workspace + '/' + msg.terminal_name + '/' + msg.index);
					socket.to().emit("terminal_index." + name, JSON.stringify(data));
					

					


					
				} catch (e) {
					console.log('terminal start error:', e);
				}
			});

			socket.on('terminal_resize', function(msg) {
				try { // jeongmin: try catching
					msg = JSON.parse(msg);

					

					//useonly(mode=goorm-oss,goorm-client)	
					if (self.term[msg.index] && self.term[msg.index].pty && self.term[msg.index].pty.readable) {
						self.term[msg.index].pty.resize(parseInt(msg.cols, 10), parseInt(msg.rows, 10));
					}
					
				} catch (e) {
					console.log('terminal resize error:', e);
				}
			});

			socket.on('terminal_refresh', function(msg) {
				var target_terminal;

				try { // jeongmin: try catching
					msg = JSON.parse(msg);

					var name = msg.name;

					

					

					//useonly(mode=goorm-oss)	
					if (self.term[msg.index] && self.term[msg.index].pty) {
						target_terminal = self.term[msg.index];

						self.destroy(self.term[msg.index].pty, function () {
							var bashrc = global.__path + 'configs/bash.bashrc'
							var command = '--rcfile ' + bashrc;

							self.term[msg.index] = {
								pty: pty.spawn('bash', command.split(' '), {
									name: 'xterm-color',
									cols: parseInt(msg.cols, 10),
									rows: 30,
									cwd: process.env.HOME,
									env: process.env
								}),
								workspace: msg.workspace,
								terminal_name: msg.terminal_name
							};
							
							self.term[msg.index].pty.on('exit', function() {
								io.sockets.in(msg.workspace + '/' + msg.terminal_name + '/' + msg.index).emit("terminal_exited." + msg.terminal_name, {
									index: msg.index
								});
							});

							self.term[msg.index].pty.on('data', function(data) {
								var result = {};
								result.stdout = data;
								result.terminal_name = msg.terminal_name;
								result.user = msg.user;

								io.sockets.in(msg.workspace + '/' + msg.terminal_name + '/' + msg.index).emit("pty_command_result", result);
							});

							socket.join(msg.workspace + '/' + msg.terminal_name + '/' + msg.index);
							socket.to().emit('terminal_refresh_complete.' + name, {
								index: msg.index
							});
						});

						// self.term[msg.index].pty.destroy();
						// self.term[msg.index].pty.kill('SIGKILL');
					}
					
				} catch (e) {
					console.log('terminal refresh error:', e);
				}
			});

			socket.on('terminal_leave', function(msg) {
				

				

				//useonly(mode=goorm-oss)	
				if (self.term[msg.index] && self.term[msg.index].pty) {
					self.destroy(self.term[msg.index].pty, function () {
						delete self.term[msg.user][msg.index]; // jeongmin
					});

					// self.term[msg.index].pty.destroy();
					// self.term[msg.index].pty.kill('SIGKILL');

					//index--; // jeongmin: terminal is deleted, list--
				}
				
			});

			socket.on('pty_execute_command', function(msg) {

				

				

				//useonly(mode=goorm-oss)
				try { // jeongmin: try catching
					msg = JSON.parse(msg);
					var do_exec = function(msg) {

						if (self.term[msg.index] && self.term[msg.index].pty) {
							self.exec(self.term[msg.index].pty, msg.command, msg.special_key);
						}
					};

					setTimeout(do_exec(msg), 100);
				} catch (e) {
					console.log('terminal pty execute command error:', e);
				}
				
			});

			socket.on('change_project_dir', function(msg) {
				try { // jeongmin: try catching
					msg = JSON.parse(msg);

					var name = msg.name;

					

					

					//useonly(mode=goorm-oss)	
					if (self.term[msg.index] && self.term[msg.index].pty) {
						self.term[msg.index].pty.write("cd " + global.__workspace + msg.project_path + ";clear\r");
						socket.to().emit("on_change_project_dir." + name, msg);
					}
					
				} catch (e) {
					console.log('terminal change project directory error:', e);
				}
			});
		});
	},

	destroy: function (pty, callback) {
		if (pty && pty.socket) {
			pty.socket.once('close', function () {
				if (callback && typeof(callback) === 'function') {
					callback();
				}
			});
			pty.destroy();
		}
		else {
			pty.destroy();
			if (callback && typeof(callback) === 'function') {
				callback();
			}
		}
	},

	exec: function(term, command, special_key) {
		if (term) {
			// if (special_key) { //Special Key
			// 	term.write(command);
			// } else {
			term.write(command);
			// }
		} else {}
	},

	

	

	

	_cpu_limit: function(pid, percent) {
		if (!pid) return;
		if (!percent) percent = 5;
		var child = spawn('cpulimit', ['-l', percent, '-i', '-p', pid]);
		child.on('error', function(data) {
			console.log('Failed to start cpulimit.');
		});
	}

};
