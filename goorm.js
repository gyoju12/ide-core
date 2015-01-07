#!/usr/local/bin/node

/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/
var commander = require('commander'),
	fs = require('fs'),
	colors = require('colors'),
	forever = require('forever'),
	os = require('os')
	// , exec = require('child_process').exec
	,
	http = require('http'),
	querystring = require('querystring');

fs.readFile(__dirname + "/info_goorm.json", "utf8", function(err, contents) {
	if (err != null) {
		console.log("Can not find file:info_goorm.json");
	} else {
		var info = JSON.parse(contents);
		commander.version('goormIDE ' + info.version + '.alpha');

		commander
			.on('--help', function() {
				console.log('Detail Help:');
				console.log('');
				console.log('  Basic Usage:');
				console.log('');
				console.log('   - If you download source-code in your private space:');
				console.log('');
				console.log('    $ node goorm.js [command] [options]');
				console.log('    ex) $ node goorm.js -h');
				console.log('');
				console.log('   - If you installed goorm using npm:');
				console.log('');
				console.log('    $ goorm [command] [options]');
				console.log('    ex) $ goorm -h');
				console.log('');
				console.log('  Command: Start / Restart / Stop');
				console.log('');
				console.log('   - Start goormIDE server:');
				console.log('');
				console.log('    $ node goorm.js start [options]');
				console.log('    $ goorm start [options]');
				console.log('');

				console.log('    + Option:');
				console.log('');
				console.log('      -d, --daemon           run the goorm server as a daemon using the forever module...');
				console.log('      -p, --port [PORT NUM]  run the goorm server with port which you want...');
				console.log('      -h, --home [HOME Directory]  set HOME directory in server');
				console.log('      -w, --workspace [WORKSPACE Directory] set WORKSPACE directory in server');
				
				console.log('      --redis-mode  run the goorm server with redis-server');
				console.log('');
				console.log('      $ node goorm.js start -d');
				console.log('      $ goorm start --daemon');
				console.log('      $ node goorm.js start -p 9999');
				console.log('      $ goorm start --port 9999');
				
				console.log('      $ node goorm.js start --redis-mode');
				console.log('      $ goorm start --redis-mode');
				console.log('');

				console.log('   - Restart goormIDE server:');
				console.log('');
				console.log('    $ node goorm.js restart');
				console.log('    $ goorm restart');
				console.log('');
				console.log('   - Stop goormIDE server:');
				console.log('');
				console.log('    $ node goorm.js stop');
				console.log('    $ goorm stop');
				console.log('');
				console.log('  Command: Set Configs');
				console.log('');
				console.log('   - Set workspace:');
				console.log('');
				console.log('    $ node goorm.js set [options] [value]');
				console.log('    $ goorm set [options] [value]');
				console.log('');
				console.log('   - Set temporary directory:');
				console.log('');
				console.log('    $ node goorm.js set [options] [value]');
				console.log('    $ goorm set [options] [value]');
				console.log('');
				console.log('    + Option:');
				console.log('');
				console.log('      -w, --workspace       set the workspace directory. default value is "workspace"');
				console.log('');
				console.log('      $ node goorm.js set -w workspace');
				console.log('      $ goorm start --workspace my_workspace');
				console.log('');
				console.log('      -t, --temp-directory  set the temporary directory. default value is "temp_files"');
				console.log('');
				console.log('      $ node goorm.js set -t temp');
				console.log('      $ goorm set --temp-directory temp_files');
				console.log('');

				

				console.log('');
				console.log('  Command: Clean Configs');
				console.log('');
				console.log('    $ node goorm.js clean');
				console.log('    $ goorm clean');
				console.log('');
			});

		commander
			.command('start [option]')
			.option('-d, --daemon', 'run the goorm server as a daemon using the forever module...')
			.option('-p, --port [PORT NUM]', 'run the goorm server with port which you want...')
			.option('-h, --home [HOME Directory]', 'set HOME directory in server')
			.option('-w, --workspace [WORKSPACE Directory]', 'set WORKSPACE directory in server')
			.option('--redis-mode', 'run the goorm with redis-server')
			

		.action(function(env, options) {
			var process_options = [];
			process_options.push(options.port);
			process_options.push(options.home);
			process_options.push(options.workspace);
			var redis_mode = false;

			

			

			function start_process() {
				var start = function() {
					if (options.daemon) {
						forever.startDaemon(__dirname + '/server.js', {
							'env': {
								'NODE_ENV': 'production'
							},
							'spawnWith': {
								env: process.env
							},
							'options': process_options
						});
						console.log("goormIDE server is started...");
					} else {
						forever.start(__dirname + '/server.js', {
							'options': process_options
						});
					}
				}

				//useonly(mode=goorm-oss)	
				fs.exists(process.env.HOME + '/.goorm/config.json', function(exists) {
					if (!exists) {
						////prepare config.json
						if (!fs.existsSync(process.env.HOME + '/.goorm/')) {
							fs.mkdirSync(process.env.HOME + '/.goorm/');
							fs.writeFileSync(process.env.HOME + '/.goorm/config.json', "", 'utf8');
						} else if (!fs.existsSync(process.env.HOME + '/.goorm/config.json')) {
							fs.writeFileSync(process.env.HOME + '/.goorm/config.json', "", 'utf8');
						}
					}

					var config_data = {};
					var raw_config_data = fs.readFileSync(process.env.HOME + '/.goorm/config.json', 'utf8');
					if (raw_config_data && typeof(raw_config_data) != 'object') config_data = JSON.parse(raw_config_data);

					if (!config_data.users || config_data.users.length == 0) {
						if (!config_data.users) config_data.users = [];

						var readline = require('readline');
						var crypto = require('crypto');
						var old_write = process.stdout.write;

						var rl = readline.createInterface({
							input: process.stdin,
							output: process.stdout
						});

						console.log('Please initialize your ID & PW ...'.yellow);
						rl.question("id : ", function(user_id) {
							process.stdout.write('password : ')
							process.stdout.write = function() {};

							rl.question("password : ", function(user_pw) {
								process.stdout.write = old_write;
								process.stdout.write('\nconfirm password : ')
								process.stdout.write = function() {};

								rl.question("confirm password : ", function(confirm_pw) {
									process.stdout.write = old_write;

									if (user_pw != confirm_pw) {
										console.log('\nPlease recheck your password. They are not a match.');
										process.exit();
									} else {
										console.log();
									}

									var sha_pw = crypto.createHash('sha1');
									sha_pw.update(user_pw);
									user_pw = sha_pw.digest('hex');

									var user = {
										'id': user_id,
										'pw': user_pw
									}

									config_data.users.push(user);
									fs.writeFileSync(process.env.HOME + '/.goorm/config.json', JSON.stringify(config_data), 'utf8');

									rl.close();
									start();
								})
							});
						});
					} else {
						start();
					}
				});
				

				
			}

			

			if (options.redisMode) {
				redis_mode = true;
			}

			process_options.push(redis_mode);

			start_process();
		});

		commander
			.command('restart')
			.action(function(env, options) {
				forever.list(null, function(format, list) {
					var get_current_project_path = function(raw) {
						var path = raw.parent.rawArgs[1].split('/');
						path.pop();
						path = path.join('/');

						return path;
					}

					var current_project_path = get_current_project_path(env);

					if (list) {
						var target_index = -1;

						for (var i = 0; i < list.length; i++) {
							if (list[i].file.indexOf(current_project_path) > -1) {
								target_index = i;
								break;
							}
						}

						if (target_index != -1) {
							var options = list[i].options;
							var start = function() {
								forever.startDaemon(__dirname + '/server.js', {
									'env': {
										'NODE_ENV': 'production'
									},
									'spawnWith': {
										env: process.env
									},
									'options': options
								});

								console.log("goormIDE server is restarted...");
							}

							forever.stop(target_index);

							//useonly(mode=goorm-oss)	
							fs.exists(process.env.HOME + '/.goorm/config.json', function(exists) {
								if (!exists) {
									////prepare config.json
									if (!fs.existsSync(process.env.HOME + '/.goorm/')) {
										fs.mkdirSync(process.env.HOME + '/.goorm/');
										fs.writeFileSync(process.env.HOME + '/.goorm/config.json', "", 'utf8');
									} else if (!fs.existsSync(process.env.HOME + '/.goorm/config.json')) {
										fs.writeFileSync(process.env.HOME + '/.goorm/config.json', "", 'utf8');
									}
								}

								var config_data = {};
								var raw_config_data = fs.readFileSync(process.env.HOME + '/.goorm/config.json', 'utf8');
								if (raw_config_data && typeof(raw_config_data) != 'object') config_data = JSON.parse(raw_config_data);

								if (!config_data.users || config_data.users.length == 0) {
									if (!config_data.users) config_data.users = [];

									var readline = require('readline');
									var crypto = require('crypto');
									var old_write = process.stdout.write;

									var rl = readline.createInterface({
										input: process.stdin,
										output: process.stdout
									});

									console.log('Please initialize your ID & PW ...'.yellow);
									rl.question("id : ", function(user_id) {
										process.stdout.write('password : ')
										process.stdout.write = function() {};

										rl.question("password : ", function(user_pw) {
											process.stdout.write = old_write;
											process.stdout.write('\nconfirm password : ')
											process.stdout.write = function() {};

											rl.question("confirm password : ", function(confirm_pw) {
												process.stdout.write = old_write;

												if (user_pw != confirm_pw) {
													console.log('\nPlease recheck your password. They are not a match.');
													process.exit();
												} else {
													console.log();
												}

												var sha_pw = crypto.createHash('sha1');
												sha_pw.update(user_pw);
												user_pw = sha_pw.digest('hex');

												var user = {
													'id': user_id,
													'pw': user_pw
												}

												config_data.users.push(user);
												fs.writeFileSync(process.env.HOME + '/.goorm/config.json', JSON.stringify(config_data), 'utf8');

												rl.close();
												start();
											})
										});
									});
								} else {
									start();
								}
							});
							

							
						} else {
							console.log("goormIDE server not found...");
						}
					} else {
						console.log("goormIDE server not found...");
					}
				});
			});

		commander
			.command('stop')
			.action(function(env, options) {
				forever.list(null, function(format, list) {
					var get_current_project_path = function(raw) {
						var path = raw.parent.rawArgs[1].split('/');
						path.pop();
						path = path.join('/');

						return path;
					}

					var current_project_path = get_current_project_path(env);

					if (list) {
						var target_index = -1;

						for (var i = 0; i < list.length; i++) {
							if (list[i].file.indexOf(current_project_path) > -1) {
								target_index = i;
								break;
							}
						}

						if (target_index != -1) {
							var options = list[i].options;

							forever.stop(target_index);
							console.log("goormIDE server is stopped...");
						} else {
							console.log("goormIDE server not started...");
						}
					} else {
						console.log("goormIDE server not started...");
					}
				});
			});

		commander
			.command('set [option]')
			.option('-w, --workspace [dir_name]', 'Set the workspace directory')
			.option('-t, --temp-directory [dir_name]', 'Set the temporary directory')
			.option('-u, --user [user_id]', 'Set the user')
			

			.action(function(env, options) {

				if (!fs.existsSync(process.env.HOME + '/.goorm/')) {
					fs.mkdirSync(process.env.HOME + '/.goorm/');
					fs.writeFileSync(process.env.HOME + '/.goorm/config.json', "", 'utf8');
				} else if (!fs.existsSync(process.env.HOME + '/.goorm/config.json')) {
					fs.writeFileSync(process.env.HOME + '/.goorm/config.json', "", 'utf8');
				}
				////prepare config.json

				if (fs.existsSync(process.env.HOME + '/.goorm/')) {
					var config_data = {};
					var raw_config_data = fs.readFileSync(process.env.HOME + '/.goorm/config.json', 'utf8');
					if (raw_config_data && typeof(raw_config_data) != 'object') config_data = JSON.parse(fs.readFileSync(process.env.HOME + '/.goorm/config.json', 'utf8'));

					var workspace = config_data.workspace || process.env.PWD + '/' + "workspace/";
					var temp_dir = config_data.temp_dir || process.env.PWD + '/' + "temp_files/";

					

					if (options.workspace) {
						workspace = options.workspace || process.env.PWD + '/' + "workspace/";

						if (!fs.existsSync(workspace)) {
							fs.mkdirSync(workspace);
						} else {
							console.log("That directory already exists!");
						}
					}

					if (options['tempDirectory']) {
						temp_dir = options['tempDirectory'] || process.env.PWD + '/' + "temp_files/";

						if (!fs.existsSync(temp_dir)) {
							fs.mkdirSync(temp_dir);
						} else {
							console.log("That directory already exists!");
						}
					}

					

					if (workspace && workspace[workspace.length - 1] != '/') workspace = workspace + '/';
					if (temp_dir && temp_dir[temp_dir.length - 1] != '/') temp_dir = temp_dir + '/';

					//useonly(mode=goorm-oss)	
					var users = config_data.users || [];

					if (options['user']) {
						if (options['user'] === true) {
							console.log('Please input your id'.red);
							console.log('node goorm set (-u/--user) [user_id]');
							console.log('or');
							console.log('goorm set (-u/--user) [user_id]');
							process.exit();
						}

						var user_id = options['user'];

						var readline = require('readline');
						var crypto = require('crypto');
						var old_write = process.stdout.write;

						var rl = readline.createInterface({
							input: process.stdin,
							output: process.stdout
						});

						process.stdout.write('password : ')
						process.stdout.write = function() {};

						rl.question("password : ", function(user_pw) {
							process.stdout.write = old_write;
							process.stdout.write('\nconfirm password : ')
							process.stdout.write = function() {};

							rl.question("confirm password : ", function(confirm_pw) {
								process.stdout.write = old_write;

								if (user_pw != confirm_pw) {
									console.log('\nPlease recheck your password. They are not a match.');
									process.exit();
								} else {
									console.log();
								}

								var sha_pw = crypto.createHash('sha1');
								sha_pw.update(user_pw);
								user_pw = sha_pw.digest('hex');

								var user = {
									'id': user_id,
									'pw': user_pw
								}

								rl.close();

								var config_data = {
									workspace: workspace,
									temp_dir: temp_dir,
									users: [user]
								};


								fs.writeFileSync(process.env.HOME + '/.goorm/config.json', JSON.stringify(config_data), 'utf8');
								console.log("goormIDE: your configs are successfully added!");
							});
						});
					} else {
						var config_data = {
							workspace: workspace,
							temp_dir: temp_dir,
							users: users
						};

						fs.writeFileSync(process.env.HOME + '/.goorm/config.json', JSON.stringify(config_data), 'utf8');
						console.log("goormIDE: your configs are successfully added!");
					}
					

					
				}
			})

		commander
			.command('clean')
			.action(function(env, options) {
				if (fs.existsSync(process.env.HOME + '/.goorm/')) {
					fs.writeFileSync(process.env.HOME + '/.goorm/config.json', "");
					console.log("goormIDE: your configs are successfully removed!");
				}
			});

		// Set argv for commander
		//
		var argv = process.argv;
		if (process.argv && process.argv[0] === 'jx') {
			var load = false;

			argv = ['node']; // init

			for (var i=0; i<process.argv.length; i++) {
				var arg = process.argv[i];

				if (arg && arg.indexOf('goorm.js') > -1) {
					load = true;
				}

				if (load) {
					if (arg.indexOf('mode') > -1) {
						arg = '--' + arg;
					}

					argv.push(arg);
				}
			}

			argv.push('--jx-mode');
		}

		commander.parse(argv);
	}
});

function send_log(title, callback) {

	var ori_data = {};
	ori_data.board_id = 'ide_log';
	ori_data.subject = title;
	ori_data.content = '';
	ori_data.language = 'ko';

	var server_info = {};
	server_info.os = os.type() + " " + os.release();
	var ori_cpus = os.cpus();
	var cpus = [];
	for (k in ori_cpus) {
		cpus.push(ori_cpus[k].model + " : " + ori_cpus[k].speed);
	}
	server_info.cpus = cpus;
	server_info.memory = os.totalmem();
	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (k in interfaces) {
		for (k2 in interfaces[k]) {
			var address = interfaces[k][k2];
			if (address.family == 'IPv4' && !address.internal) {
				addresses.push(address.address);
			}
		}
	}
	server_info.ip_address = addresses;
	server_info.start = new Date();

	var contents = "";
	contents += "<b>OS : </b>" + server_info.os + "<br/>";
	contents += "<b>CPU : </b>" + server_info.cpus + "<br/>";
	contents += "<b>MEMORY : </b>" + server_info.memory + "<br/>";
	contents += "<b>IP : </b>" + server_info.ip_address;
	ori_data.content = contents;

	var post_data = querystring.stringify(ori_data);

	var post_options = {
		host: 'www.goorm.io',
		port: '80',
		path: '/api/article/write',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': post_data.length
		}
	};

	var post_req = http.request(post_options, function(res) {
		res.setEncoding('utf8');

		var data = "";

		res.on('data', function(chunk) {
			data += chunk;
		});

		res.on('end', function() {
			console.log("Information was sent.");
			callback();
		});
	});

	post_req.on('error', function(e) {});

	post_req.write(post_data);
	post_req.end();
}