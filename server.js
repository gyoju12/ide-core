/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/




// Dependency
//
var express = require('express'),
	fs = require('fs'),
	
	socketio = require('socket.io'),
	http = require('http'),
	colors = require('colors'),
	redis = require('socket.io/node_modules/redis'),
	connect = require('express/node_modules/connect'),
	cookie = require('express/node_modules/cookie'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	methodOverride = require('method-override'),
	multer = require('multer');

// External Variables
//
port = 9999;

Schema = null;
ObjectId = null;
g_cluster = require("./modules/goorm.core.utility/utility.cluster");
RedisStore = null;

VERSION = 3;

SITE_HOST = "goorm.io";
IDE_HOST = "ide.goorm.io";





//useonly(mode=goorm-standalone,goorm-oss)
REDIS_HOST = '127.0.0.1';
REDIS_PORT = 6379;


//useonly(mode=goorm-oss)
MONGO_DB_HOST = 'mongodb://localhost/goorm_ide';






DASHBOARD_HOST = 'dashboard.goorm.io';
DASHBOARD_PORT = 3000;

PROJECT_BUCKET = 'grm-project-bucket';

MODE = null; // IDE MODE --> (default:null), [edu], [cpp,java], ...

LIMIT_FILE_SIZE = 50; // mb

UID = 501;
GID = 501;

// Local Variables
//
var home = null;
var workspace = null;
var goorm = module.exports = express();
var config_data = {};
var users = [];
var server = null;
var io = null;

// GOORM MODULES
//
goorm.start = function() {
	goorm.init();
	
	goorm.config();
	goorm.routing();
	goorm.load();
};

goorm.init = function() {
		var set_global = function() {
			// Set global
			//
			global.__path = __dirname + "/";

			//useonly(mode=goorm-oss)	
			global.__redis_mode = false;
			

			

			

			

			global.__secure = false; // use https ?

			// Session Store
			//
			global.store = null;
		};

		var set_arguments = function() {
			// Set argv for commander
			//
			var argv = process.argv;

			

			//useonly(mode=goorm-oss)	
			if (argv[2] > 0 && argv[2] < 100000) {
				port = argv[2];
			}

			if (fs.existsSync(argv[3])) {
				home = argv[3];
			}

			if (fs.existsSync(argv[4])) {
				workspace = argv[4];
			}

			if (argv[5] && argv[5] == 'true') {
				global.__redis_mode = true;
			}
			
		};

		var set_goorm_config = function() {
			//useonly(mode=goorm-oss)	
			var base = process.env.HOME + "/goorm_workspace/";

			if (!fs.existsSync(base)) {
				fs.mkdir(base, 0755, function(err) {
					if (err) {
						console.log('Cannot make goorm_workspace : ' + base + ' ... ', err);
					}
				});
			}

			global.__workspace = process.env.HOME + "/goorm_workspace/";
			

			

				

			//useonly(mode=goorm-oss)	
			var temp = process.env.HOME + "/goorm_tempdir/";

			if (!fs.existsSync(temp)) {
				fs.mkdir(temp, 0755, function(err) {
					if (err) {
						console.log('Cannot make goorm_tempdir : ' + temp + ' ... ', err);
					}
				});
			}

			global.__temp_dir = process.env.HOME + "/goorm_tempdir/";
			

			

			if (!home) home = process.env.HOME;
			if (fs.existsSync(home + '/.goorm/config.json')) {
				var data = fs.readFileSync(home + '/.goorm/config.json', 'utf8');
				if (data !== "") {
					config_data = JSON.parse(data);
				}

				if (config_data) {
					for (var attr in config_data) {
						if ((attr === 'workspace' && workspace) || (attr === 'home' && home)) {
							continue;
						}

						if (config_data[attr] && config_data[attr] !== 'undefined') {
							global[attr] = config_data[attr];
						}
					}
				}
			}
		}

		set_global();
		set_goorm_config();
		set_arguments();

		// Update Workspace Path 
		//
		if (workspace && workspace !== 'undefined') {
			global.__workspace = workspace;
		}

		if (global.__workspace && global.__workspace !== "") {
			if (global.__workspace[global.__workspace.length - 1] !== '/') {
				global.__workspace = global.__workspace + '/';
			}
		}

		// Update Store
		//
		if (global.__redis_mode) {
			RedisStore = require('connect-redis')(express)
			global.store = new RedisStore({
				'host': REDIS_HOST,
				'port': REDIS_PORT
			});
			// global.store = new RedisStore
		} else {
			global.store = new express.session.MemoryStore;
		}

		global.__set_redis_client = false;
	}
	

		

		

		
	}
	
goorm.config = function() {
	// Configuration
	goorm.set('views', __dirname + '/views');
	goorm.set("jsonp callback", true);
	goorm.set('uploadDir', __temp_dir);
	goorm.set('keepExtensions', true);

	goorm.engine('html', require('ejs').renderFile);

	/**
	 * limit 50mb
	 */
	goorm.use(multer({
		limits: {
			fileSize: 1024 * 1024 * LIMIT_FILE_SIZE
		},
		// rename: function (fieldname, filename) {	// hidden: it causes overlapping files that have same name
		// 	return filename;
		// },
		onFileSizeLimit: function(req, file) {
			req.__upload_err = true;

			if (!req.file) {
				req.__upload_err_files = [];
			}

			req.__upload_err_files.push(file);
		},
		onParseEnd: function(req, res, next) {
			if (req.__upload_err) {
				if (req.files) {
					var files = req.files.file;

					if (files.constructor == Array && files.length > 0) {
						for (var i = files.length - 1; 0 <= i; i--) {
							fs.unlink(files[i].path);
						}
					} else {
						fs.unlink(files.path);
					}
				}

				res.json({
					err_code: 50,
					type: 'check',
					message: "You cannot upload large files with a size bigger than 50MB.",
					file: req.__upload_err_files
				});
			} else {
				next();
			}
		},
		dest: __temp_dir
	}));

	goorm.use(bodyParser.json({
		limit: '50mb'
	}));

	goorm.use(bodyParser.urlencoded({
		limit: '50mb',
		extended: true
	}));

	if (__jx_mode) {
		http.setMaxHeaderLength(1024 * 1024 * 50);
	}

	goorm.use(cookieParser());
	goorm.use(express.session({
		secret: 'rnfmadlek',
		key: 'express.sid',
		store: store
	}));

	


	//goorm.use(express.logger('dev'));

	goorm.use(methodOverride());
	goorm.use(goorm.router);
	goorm.use(express.static(__dirname + '/public'));
	// goorm.use(express.static(__dirname + '/plugins'));

	

	goorm.use(express.static(__temp_dir));


	var env = process.env.NODE_ENV || 'development';
	if ('development' == env) {
		goorm.use(express.errorHandler({
			dumpExceptions: true,
			showStack: true
		}));
	} else { // production
		goorm.use(express.errorHandler());
	}

	process.on('uncaughtException', function(err) {
		if (!fs.existsSync("./error_log/")) fs.mkdirSync("./error_log/", 0777);
		var now = new Date();
		var date_now = (now.getMonth() + 1) + "_" + now.getDate() + "_" + now.getHours() + "_" + now.getMinutes() + "_" + now.getSeconds();
		if (!fs.existsSync('./error_log/' + date_now + ".log")) fs.writeFileSync('./error_log/' + date_now + ".log", 'Caught exception: \n' + err + err.stack + "\n", 'utf8');
		else {
			console.log("come on")
			fs.appendFileSync('./error_log/' + date_now + ".log", 'Caught exception: \n' + err + err.stack + "\n", "utf8");
		}

		console.log('Caught exception: ' + err + err.stack + "\n" + "saved at " + './error_log/' + date_now + ".log");

		
	});

	g_cluster.init();
}

goorm.check_session = function(req, res, next) {
	//useonly(mode=goorm-oss)	
	var user = config_data.users[0];

	req.__user = user;
	req.__user.name = user.id;
	req.__user.nick = user.id;
	req.__user.type = 'password';

	next();
	

	

	

	
}

goorm.set_expires_date = function(req, res, next) {
	var url = req.url;
	var expires_time = 365 * 24 * 60 * 60 * 1000;
	var time = (new Date(new Date().getTime() + expires_time)).toGMTString();

	if (/.css$/.test(url) || /.png$/.test(url) || /.gif$/.test(url) || /.js$/.test(url) || /.ico$/.test(url)) {
		res.setHeader('Cache-Control', 'public, max-age=' + parseInt((expires_time / 1000), 10))
		res.setHeader('Expires', time);
	}

	next();
}

goorm.routing = function() {
	var routes = require('./routes');
	var g_auth_m = require("./modules/goorm.core.auth/auth.manager"); // jeongmin: for update_session
	var g_port_manager = require("./modules/goorm.core.utility/utility.port_manager");
	var g_plugin = require("./modules/goorm.plugin/plugin.js");

	

	goorm.get('/goorm.plugin.*', function(req, res) {
		var params = req.params[0].split('/');

		var plugin_name = params.shift();
		var path = params.join('/');

		g_plugin.get_resource({
			'name': plugin_name,
			'path': path
		}, function(data) {
			if (data) {
				res.sendfile(data);
			} else {
				res.json(false);
			}
		});
	});

	// Routes
	//useonly(mode=goorm-standalone,goorm-oss)
	goorm.get('/', routes.index);
	

	

	

	

	//for project
	// goorm.post('/project/new', goorm.check_session, routes.project.make_project);
	
	// goorm.get('/project/new', goorm.check_session, routes.project.do_new);
	// goorm.get('/project/delete', goorm.check_session, routes.project.do_delete);
	goorm.get('/project/get_list', goorm.check_session, routes.project.get_list);
	goorm.post('/project/import', goorm.check_session, routes.project.do_import);
	goorm.post('/project/import/check', goorm.check_session, routes.project.do_import_check);
	goorm.get('/project/export', goorm.check_session, routes.project.do_export);
	goorm.get('/project/clean', goorm.check_session, routes.project.do_clean);
	goorm.get('/project/get_property', goorm.check_session, routes.project.get_property);
	goorm.get('/project/set_property', goorm.check_session, routes.project.set_property);
	goorm.get('/project/get_contents', routes.project.get_contents);
	goorm.get('/project/move_file', goorm.check_session, routes.project.move_file);
	

	

	

	//for plugin

	

	

	goorm.get('/plugin/new', goorm.check_session, routes.plugin.do_new);
	goorm.post('/plugin/get_dialog', goorm.check_session, routes.plugin.get_dialog);
	goorm.post('/plugin/check_css', routes.plugin.check_css);
	goorm.get('/plugin/make_template', goorm.check_session, routes.plugin.make_template);
	//goorm.get('/plugin/debug',  routes.plugin.debug);
	// goorm.get('/plugin/run', goorm.check_session, function(req,res) {
	// 	console.log("===step1");
	// 	routes.plugin.run(req,res);
	// });
	goorm.post('/plugin/do_web_run', goorm.check_session, routes.plugin.do_web_run);
	goorm.get('/plugin/user_clean', goorm.check_session, routes.plugin.user_clean);
	goorm.get('/plugin/set_property', goorm.check_session, routes.plugin.set_property);

	

	//for filesystem
	goorm.get('/file/new', goorm.check_session, routes.file.do_new);
	goorm.get('/file/new_folder', goorm.check_session, routes.file.do_new_folder);
	goorm.get('/file/new_untitled_text_file', goorm.check_session, routes.file.do_new_untitled_text_file);
	goorm.get('/file/new_other', goorm.check_session, routes.file.do_new_other);
	goorm.get('/file/save_as', goorm.check_session, routes.file.do_save_as);
	goorm.get('/file/delete', goorm.check_session, routes.file.do_delete);
	goorm.get('/file/delete_all', goorm.check_session, routes.file.do_delete_all);
	goorm.get('/file/copy_file_paste', goorm.check_session, routes.file.do_copy_file_paste);
	goorm.get('/file/get_contents', goorm.check_session, routes.file.get_contents);
	goorm.get('/file/get_contents/send', routes.file.get_contents.send);
	
	goorm.post('/file/put_contents', goorm.check_session, routes.file.put_contents);
	goorm.get('/file/get_file', goorm.check_session, routes.file.get_file);
	goorm.get('/file/get_result_ls', goorm.check_session, routes.file.get_result_ls);
	goorm.post('/file/check_valid_edit', goorm.check_session, routes.file.check_valid_edit);
	goorm.post('/file/import', goorm.check_session, routes.file.do_import);
	goorm.get('/file/export', goorm.check_session, routes.file.do_export);
	goorm.get('/file/move', goorm.check_session, routes.file.do_move);
	goorm.get('/file/rename', goorm.check_session, routes.file.do_rename);
	
	goorm.get('/file/search_on_project', goorm.check_session, routes.file.do_search_on_project);
	goorm.get('/file/open', routes.file.do_open);

	//for preference
	goorm.get('/preference/workspace_path', function(req, res) {
		res.json({
			"path": global.__workspace
		});
	});
	goorm.get('/preference/get_server_info', routes.preference.get_server_info);
	goorm.get('/preference/get_goorm_info', routes.preference.get_goorm_info);
	// goorm.get('/preference/put_filetypes', routes.preference.put_filetypes);	// hidden by jeongmin: file type is deprecated

	//for help
	goorm.get('/help/get_readme_markdown', routes.help.get_readme_markdown);
	
	goorm.get('/help/send_to_bug_report', routes.help.send_to_bug_report);

	//useonly(mode=goorm-oss)	
	goorm.post('/local_login', function(req, res) {
		var response = {};
		response.result = false;

		var id = req.body.id;
		var pw = req.body.pw;

		var crypto = require('crypto');
		var sha_pw = crypto.createHash('sha1');
		sha_pw.update(pw);
		pw = sha_pw.digest('hex');

		var users = config_data.users;
		if (users && users.length > 0) {
			for (var i = 0; i < users.length; i++) {
				var user = users[i];

				if (user.id == id && user.pw == pw) {
					g_auth_m.update_session(req, user);

					response.result = true;
				}
			}
		}

		res.json(response);
	});
	goorm.post('/local_logout', function(req, res) {

	});
	

	
	goorm.post('/user/project/collaboration/invitation/pull', goorm.check_session, routes.user.project.collaboration.invitation.pull);
	goorm.post('/user/preference/save', goorm.check_session, routes.user.preference.save);
	goorm.get('/user/preference/load', goorm.check_session, routes.user.preference.load);

	goorm.post('/session/save', routes.session.save);
	goorm.post('/session/destroy', routes.session.destroy);
	

	//for download and upload
	goorm.get('/download', goorm.check_session, routes.download);
	goorm.post('/upload', goorm.check_session, routes.upload);
	goorm.get('/send_file', goorm.check_session, routes.send_file);
	goorm.get('/download/exe_file', goorm.check_session, routes.download.exe_file);

	//file upload by dd
	goorm.post('/upload/file/dd', goorm.check_session, routes.upload_file_dd);
	

	goorm.get('/alloc_port', function(req, res) {
		// req : port, process_name
		res.json(g_port_manager.alloc_port(req.query));
	});

	

	goorm.get('/remove_port', function(req, res) {
		// req : port
		res.json(g_port_manager.remove_port(req.query));
	});

	

	

	

	


	goorm.get('/edit/get_dictionary', routes.edit.get_dictionary);
	goorm.get('/edit/get_object_explorer', goorm.check_session, routes.edit.get_object_explorer);
	
	goorm.post('/edit/save_tags', goorm.check_session, routes.edit.save_tags);
	goorm.get('/edit/load_tags', goorm.check_session, routes.edit.load_tags);
	
	
	
}

goorm.load = function() {
	var g_terminal = require("./modules/goorm.core.terminal/terminal");
	var g_file = require("./modules/goorm.core.file/file");
	var g_plugin = require("./modules/goorm.plugin/plugin");
	var g_utility = require("./modules/goorm.core.utility/utility");
	var g_port_manager = require("./modules/goorm.core.utility/utility.port_manager");

	

	

	var g_ajax = require("./modules/ajax_routing/ajax.js")

	

	g_plugin.get_list('init');

	

	var set_main_log = function() {
		console.log("");
		console.log("             ,'''''',".blue);
		console.log("          ''''''''''''''".blue);
		console.log("        '''''        '''''''''''.".blue);
		console.log("       ''''            ''''''''''''".blue);
		console.log("      ''''              ;'      '''',".blue);
		console.log("      ''':                       :'''".blue);
		console.log("      '':.                       `.;'".blue);
		console.log("      '''''''';             ,''''''''".blue);
		console.log("    ''''''''''''';       .''''''''''''',".blue);
		console.log("  ,''''':   ''''''''   ,'''''''   .''''''".blue);
		console.log("  '''',        ,''''';''''''         '''',".blue);
		console.log(" :''''           `''''''';           ,''''".blue);
		console.log(" :''''            '''''''            ,''''".blue);
		console.log("  ::::`         ;::::::::::`         ::::.".cyan);
		console.log("  ,;;;;;.   .;;;;;;;   ;;;;;;;:    ;;;;;;".cyan);
		console.log("    ;;;;;;;;;;;;;;       :;;;;;;;;;;;;;:".cyan);
		console.log("      ;;;;;;;;;             :;;;;;;;;`".cyan);
		console.log("");

		console.log("--------------------------------------------------------".grey);
		console.log("workspace_path: " + __workspace);
		console.log("temp_dir_path: " + __temp_dir);

		console.log();
		console.log('If you want to change a workspace, use -w option.');
		console.log('node goorm.js start -w [workspace]')
		console.log();
		console.log("goormIDE:: starting...".yellow);
		console.log("--------------------------------------------------------".grey);
		console.log("Open your browser and connect to");
		console.log("'http://localhost:" + port + "' or 'http://[YOUR IP/DOMAIN]:" + port + "'");
		console.log("--------------------------------------------------------".grey);
	};

	// clustering
	//
	var method = g_cluster.get_method();
	if (method === "multi-processing") {
		global.__set_redis_client = true;

		global.__redis = {};
		global.__redis.pub = redis.createClient(REDIS_PORT, REDIS_HOST);
		global.__redis.sub = redis.createClient(REDIS_PORT, REDIS_HOST);
		global.__redis.store = redis.createClient(REDIS_PORT, REDIS_HOST);

		

		

		

		if (g_cluster.is_main()) {
			var cluster = g_cluster.get_cluster();

			set_main_log();

			for (var i = 0; i < g_cluster.get_cpu_numbers(); i++) {
				cluster.fork();
			}

			cluster.on('exit', function(worker, code, signal) {
				var exitCode = worker.process.exitCode;
				console.log('worker ' + worker.process.pid + ' died (' + exitCode + '). restarting...');
				cluster.fork();
			});

			cluster.on('online', function(worker) {
				// console.log("worker %s (%s) online", worker.id, worker.process.pid);
			});

			cluster.on('listening', function(worker, address) {

				

				// console.log("worker %s listening %s:%s", worker.id, address.address, address.port);
			});

			

		} else {
			var set_io = function() {
				io = socketio.listen(server, {
					'heartbeatTimeout': 30 * 1000
				});

				if (global.__redis_mode) {
					io.configure(function() {
						io.set('store', new socketio.RedisStore({
							'redis': redis,
							'redisPub': global.__redis.pub,
							'redisSub': global.__redis.sub,
							'redisClient': global.__redis.store
						}));

						io.set('authorization', function(handshakeData, accept) {
							if (handshakeData.headers.cookie) {
								handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
								handshakeData.sessionID = cookieParser.signedCookie(handshakeData.cookie['express.sid'], 'rnfmadlek');

								if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
									return accept('Cookie is invalid.', false);
								}
							}

							accept(null, true);
						});
					})
				}

				g_terminal.start(io);

				

				//simdj
				g_ajax.start(io);
				//simdjend

				g_port_manager.alloc_port({
					"port": port,
					"process_name": "goorm"
				});

				

				
			};

			

			
		}
	} else {
		set_main_log();

		global.__set_redis_client = true;

		global.__redis = {};
		global.__redis.pub = redis.createClient(REDIS_PORT, REDIS_HOST);
		global.__redis.sub = redis.createClient(REDIS_PORT, REDIS_HOST);
		global.__redis.store = redis.createClient(REDIS_PORT, REDIS_HOST);
		

		

		

		

		
		

		

		

		//useonly(mode=goorm-oss)
		var set_io = function() {
			io = socketio.listen(server, {
				'heartbeatTimeout': 30 * 1000
			});

			if (global.__redis_mode) {
				io.configure(function() {
					io.set('store', new socketio.RedisStore({
						'redis': redis,
						'redisPub': global.__redis.pub,
						'redisSub': global.__redis.sub,
						'redisClient': global.__redis.store
					}));
				});

				io.set('authorization', function(handshakeData, accept) {
					if (handshakeData.headers.cookie) {
						handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
						handshakeData.sessionID = cookieParser.signedCookie(handshakeData.cookie['express.sid'], 'rnfmadlek');

						if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
							return accept('Cookie is invalid.', false);
						}
					}

					accept(null, true);
				});
			}

			g_terminal.start(io);

			//simdj
			g_ajax.start(io);
			//simdjend

			g_port_manager.alloc_port({
				"port": port,
				"process_name": "goorm"
			});
		};

		server = goorm.listen(port, function() {
			global.__serverport = server.address().port;
			// console.log("goorm IDE server listening on port %d in %s mode", server.address().port, goorm.settings.env);
		});

		set_io();
				
	}
}

goorm.start();

// // for grunt
// exports = module.exports = goorm;
// // delegates user() function
// exports.use = function() {
//   goorm.use.apply(goorm, arguments);
// };