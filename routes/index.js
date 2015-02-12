/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var fs = require("fs"),
	rimraf = require('rimraf'),
	
	exec = require('child_process').exec,
	xss = require('xss'),
	EventEmitter = require("events").EventEmitter;

//var g_env = require("../configs/env.js");

var g_file = require("../modules/goorm.core.file/file");
var g_preference = require("../modules/goorm.core.preference/preference");
var g_project = require("../modules/goorm.core.project/project");
var g_terminal = require("../modules/goorm.core.terminal/terminal");
var g_plugin = require("../modules/goorm.plugin/plugin");
var g_help = require("../modules/goorm.core.help/help");
var g_search = require("../modules/goorm.core.search/search");
var g_edit = require("../modules/goorm.core.edit/edit");









var check_valid_path = function(str) {
	if (!str) return false;
	return !(/\.\.|~|;|&|\|/.test(str));
};
/*
 * GET home page.
 */

exports.index = function(req, res, options) {
	var use_terminal = true;

	if (options != null) {
		if (options.use_terminal !== undefined) {
			use_terminal = options.use_terminal;
		}
	}

	

	//useonly(mode=goorm-standalone,goorm-oss)
	res.render(__path + 'views/main.html', {
		use_terminal: use_terminal,
		version: VERSION
	});
	
};







/*
 * API : Project
 */

exports.project = function(req, res) {
	res.send(null);
};

// exports.project.do_new = function(req, res) {
// 	var evt = new EventEmitter();

// 	evt.on("project_do_new", function(data) {
// 		res.json(data);
// 	});

// 	

// 	


// 	g_project.do_new(req.query, evt);
// };

exports.project.do_load = function(req, res) {
	res.send(null);
};

exports.project.do_save = function(req, res) {
	res.send(null);
};

// exports.project.do_delete = function(req, res) {
// 	var evt = new EventEmitter();

// 	evt.on("project_do_delete", function(data) {
// 		res.json(data);
// 	});

// 	g_project.do_delete(req.query, evt);

// 	
// };

exports.project.get_list = function(req, res) {
	var evt = new EventEmitter();

	evt.once("project_get_list", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_project.get_list(req.query, evt);
	
};







//useonly(mode=goorm-oss)
exports.project.do_import = function(req, res) {
	var evt = new EventEmitter();

	evt.once("project_do_import", function(data) {
		res.json(data);
	});

	g_project.do_import(req.body, req.files.file, evt);
};


exports.project.do_import_check = function(req, res) {
	var evt = new EventEmitter();
	evt.once("project_do_import_check", function(data) {
		res.json(data);
	});

	req.body.user = req.__user;
	g_project.do_import_check(req.body, req.files.file, evt);
};

exports.project.do_export = function(req, res) {
	var evt = new EventEmitter();
	var data = {};

	//useonly(mode=goorm-standalone,goorm-oss)
	evt.once("project_do_export", function(data) {
		res.json(data);
	});

	

	

	req.query.user = req.__user.id;
	
	//useonly(mode=goorm-oss)
	g_project.do_export(req.query, evt);
	
};
exports.project.do_clean = function(req, res) {
	var evt = new EventEmitter();

	evt.once("project_do_clean", function(data) {
		res.json(data);
	});

	g_project.do_clean(req.query, evt);
};

exports.project.get_property = function(req, res) {
	var evt = new EventEmitter();
	evt.once("get_property", function(data) {
		res.json(data);
	});

	g_project.get_property(req.query, evt);
};

exports.project.set_property = function(req, res) {
	var evt = new EventEmitter();
	evt.once("set_property", function(data) {
		res.json(data);
	});

	g_project.set_property(req.query, evt);
};

exports.project.move_file = function(req, res) {
	var evt = new EventEmitter();
	evt.once("move_file", function(data) {
		res.json(data);
	});
	g_project.move_file(req.query, evt);
};














/*
 * API : Plugin
 */

exports.plugin = function(req, res) {
	res.send(null);
};





exports.plugin.check_css = function(req, res) {

	var plugin_data = req.body;

	var path = (plugin_data.type == 'true') ? (global.__temp_dir) : (global.__path + "/plugins/");

	fs.exists(path + plugin_data.path, function(exists) {
		res.json({
			check: exists
		});
	});

};

exports.plugin.get_dialog = function(req, res) {

	var project_data = req.body;
	var workspace = global.__temp_dir;
	try {
		fs.readFile(workspace + project_data.html, 'utf-8', function(err, file_data) {
			if (err)
				file_data = "";
			var filtered_data = xss(file_data);

			res.json({
				code: 200,
				message: "success",
				file_data: filtered_data
			});
		});
	} catch (e) {
		res.json({
			code: 201,
			message: "fail"
		});
	}

};

exports.plugin.do_create = function(req, res) {
	var self = this;

	var uid = null;
	var gid = null;

	var copy = function() {
		var plugin_name = req.body.plugin;
		var project_data = req.body.data;

		var workspace = global.__workspace + "/" + project_data.project_dir;
		var template_path = global.__path + 'temp_files/' + req.__user.id + '/plugins/' + plugin_name;

		// Default Plugin
		//
		if (global.plugins_list && global.plugins_list.length > 0) {
			var is_default_plg = global.plugins_list.some(function(o) {
				if (o && o.name === plugin_name) return true;
			});

			if (is_default_plg) {
				template_path = global.__path + 'plugins/' + plugin_name;
			}
		}

		var template = template_path + "/template";

		if (project_data.project_detailed_type) {
			try {
				var syncStat = fs.statSync(template + "/" + project_data.project_detailed_type.replace(/\s/g, "\ "));
				if (!syncStat || !syncStat.isDirectory()) {

				} else {
					template += "/" + project_data.project_detailed_type.replace(/\s/g, "\\ ");
				}
			} catch (e) {

			}
		}

		exec('cp -r ' + template + '/* ' + workspace, function(__err) {
			if (__err) {
				console.log("do_create error!:", __err);
			}
			fs.readFile(workspace + "/goorm.manifest", 'utf-8', function(err, file_data) {
				var contents = JSON.parse(file_data);

				contents.plugins = project_data.plugins;
				contents.detailedtype = project_data.project_detailed_type;

				fs.writeFile(workspace + "/goorm.manifest", JSON.stringify(contents), {
					encoding: 'utf-8',
					mode: 0700
				}, function(err) {
					if (err) {
						console.log(err);
					}

					

					

					//useonly(mode=goorm-oss)
					res.json({
						code: 200,
						message: "success"
					});
					
				});
			});
		});
	};

	

	//useonly(mode=goorm-oss)
	copy();
	
};

exports.plugin.do_new = function(req, res) {
	req.query.user = req.__user;

	g_plugin.do_new(req.query, res);
};

exports.plugin.do_web_run = function(req, res) {
	var self = this;
	var uid = null;
	var gid = null;
	var copy = function() {
		var workspace = global.__workspace + "/" + req.body.project_path;

		var target_path = __temp_dir + "plugins/web/" + req.body.project_path;

		var run_path = target_path.split("temp_files").pop();

		if (!fs.existsSync(__temp_dir)) {
			fs.mkdirSync(__temp_dir);
		}
		if (!fs.existsSync(__temp_dir + "/plugins")) {
			fs.mkdirSync(__temp_dir + "/plugins");
		}
		if (!fs.existsSync(__temp_dir + "/plugins/web")) {
			fs.mkdirSync(__temp_dir + "/plugins/web");
		}
		if (!fs.existsSync(target_path)) {
			fs.mkdirSync(target_path);
		}

		exec('cp -r ' + workspace + '/* ' + target_path, function(__err) {
			if (__err) {
				console.log('do_web_run Err:', __err);
			} else {

				

				res.json({
					code: 200,
					message: "success",
					run_path: run_path
				});
			}
		});
	};
	
	//useonly(mode=goorm-oss)
	copy();
	
}

exports.plugin.user_clean = function(req, res) {
	g_plugin.user_clean(req.query, res);
};

exports.plugin.set_property = function(req, res) {
	g_plugin.set_property(req.query, res);
};

exports.plugin.make_template = function(req, res) {

	

	//useonly(mode=goorm-oss)	
	g_plugin.make_template(req.query, res);
	
};

exports.plugin.build = function(req, res) {
	g_plugin.build(req.query, res);
};

exports.plugin.clean = function(req, res) {
	g_plugin.clean(req.query, res);
};

exports.plugin.run = function(req, res) {
	g_plugin.run(req.query, res);
};

exports.plugin.stop = function(req, res) {
	g_plugin.stop(req.query, res);
};



/*
 * API : File System
 */

exports.file = function(req, res) {
	res.send(null);
};

exports.file.do_new = function(req, res) {
	var evt = new EventEmitter();

	evt.once("file_do_new", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_file.do_new(req.query, evt);
	
};

exports.file.do_new_folder = function(req, res) {
	var evt = new EventEmitter();

	evt.once("file_do_new_folder", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_file.do_new_folder(req.query, evt);
	
};

exports.file.do_new_other = function(req, res) {
	var evt = new EventEmitter();

	evt.once("file_do_new_other", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_file.do_new_other(req.query, evt);
	
};


exports.file.do_new_untitled_text_file = function(req, res) {
	var evt = new EventEmitter();

	evt.once("file_do_new_untitled_text_file", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_file.do_new_untitled_text_file(req.query, evt);
	
};

exports.file.do_load = function(req, res) {
	res.send(null);
};

exports.file.do_save_as = function(req, res) {

	var evt = new EventEmitter();

	evt.once("file_do_save_as", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_file.do_save_as(req.query, evt);
	
};

exports.file.do_delete_all = function(req, res) {
	//var evt = new EventEmitter();
	var files = req.query.files;
	var directories = req.query.directorys;

	

	//useonly(mode=goorm-oss)	
	g_file.do_delete_all(req.query, function(result) {
		res.json(result);
	});
	
}
exports.file.do_copy_file_paste = function(req, res) {
	var files = req.query.files || [];
	var directories = req.query.directorys || [];

	

	

	//useonly(mode=goorm-oss)	
	g_file.do_copy_file_paste(req, function(result) {
		res.json(result);
	});
	
}

exports.file.do_delete = function(req, res) {
	var evt = new EventEmitter();
	var user_level = null;
	var author_level = null;

	evt.once("file_do_delete", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_file.do_delete(req.query, evt);
	
};


exports.file.get_contents = function(req, res) {
	var path = req.query.path;
	var abs_path = __path + path;

	var res_type = "json";
	if (req.query.res_type) res_type = req.query.res_type;

	//1. valid path
	console.log(path);
	if (!check_valid_path(path)) {
		console.log('invalid path in get_contents');
		res.json(false);
		return false;
	}

	//2. don't need to check (ex) dialog html
	if (req.query.type !== 'get_workspace_file') {
		fs.readFile(abs_path, "utf8", function(err, data) {
			if (err) {
				res.json(false);
			} else {
				res.json(data);
			}
		});
		return true;
	}

	//from here workspace file!!!!!
	abs_path = __workspace + path;
	//local -> do not check any thing

	//useonly(mode=goorm-oss)	
	fs.readFile(abs_path, "utf8", function(err, data) {
		if (err) {
			res.json(false);
		} else {
			res.json(data);
		}
	});
	

	
};

exports.file.get_contents.send = function(req, res) {
	var path = req.query.path;

	fs.readFile(__workspace + path, "base64", function(err, data) {
		res.send(data);
	});
};

exports.file.put_contents = function(req, res) {

	var evt = new EventEmitter();

	evt.once("file_put_contents", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)
	g_file.put_contents(req.body, evt);
	
};

exports.file.get_nodes = function(req, res) {
	var evt = new EventEmitter();
	var path = req.query.path;
	var type = req.query.type || null;
	path = path.replace(/\/\//g, "/");

	//res.setHeader("Content-Type", "application/json");

	evt.once("got_nodes", function(data) {
		try {
			res.json(data);
			//res.send(JSON.stringify(data));
			//res.end();
		} catch (exception) {
			throw exception;
		}
	});

	

	//useonly(mode=goorm-oss)	
	var nodes_data = {
		path: __workspace + '/' + path
	};

	g_file.get_nodes(nodes_data, evt, type);
	
};

exports.file.get_dir_nodes = function(req, res) {
	var evt = new EventEmitter();
	var path = req.query.path;
	path = path.replace(/\/\//g, "/");


	//res.setHeader("Content-Type", "application/json");

	evt.once("got_dir_nodes", function(data) {
		try {
			//console.log(JSON.stringify(data));
			res.json(data);

			//res.send(JSON.stringify(data));
			//res.end();
		} catch (exception) {
			throw exception;
		}
	});

	

	//useonly(mode=goorm-oss)	
	req.query.path = __workspace + '/' + path;
	g_file.get_dir_nodes(req.query, evt);
	
};

exports.file.get_result_ls = function(req, res) {
	var evt = new EventEmitter();
	//var path = req.query.path;
	//path = path.replace(/\/\//g, "/");

	evt.once("got_result_ls", function(data) {
		res.json(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_file.get_result_ls(req.query, evt);
	
};


exports.file.get_file = function(req, res) {
	var evt = new EventEmitter();
	var filepath = req.query.filepath;
	var filename = req.query.filename;

	//useonly(mode=goorm-standalone,goorm-oss)
	if (filepath) {
		filepath = filepath.replace(/\/\//g, "/");

		evt.once("got_file", function(data) {
			try {
				//console.log(JSON.stringify(data));
				res.json(data);

				//res.send(JSON.stringify(data));
				//res.end();
			} catch (exception) {
				throw exception;
			}
		});

		g_file.get_file(filepath, filename, evt);
	} else {
		res.json({});
	}
	

	
};

exports.file.check_valid_edit = function(req, res) {
	var evt = new EventEmitter();
	var project_path = req.body.project_path;
	var filepath = req.body.filepath;
	var filename = req.body.filename;

	if (project_path && filepath && filename) {
		filepath = filepath.replace(/\/\//g, "/");
		if (!check_valid_path(project_path) || !check_valid_path(filepath) || !check_valid_path(filename)) {
			res.json({});
			return false;
		}
	} else {
		res.json({});
		return false;
	}
	evt.once("check_valid_edit", function(data) {
		if (!data.result) {
			switch (data.code) {
				case 0:
					console.log('Error: check_valid_edit, project not found.', __workspace + project_path);
					break;

				case 1:
					console.log('Error: check_valid_edit, project path is not directory.', __workspace + project_path);

				case 2:
					console.log('Error: check_valid_edit, project path cannot read.', __workspace + project_path);
					
				default:
					break;
			}
		}

		res.json(data);
	});

	g_file.check_valid_edit(project_path, filepath, filename, evt);
};



exports.file.do_move = function(req, res) {
	var evt = new EventEmitter();
	var user_level = null;
	var author_level = null;

	var move_fail = function(msg) {
		var res_data = {
			err_code: 20,
			message: msg,
			path: req.query
		};
		res.json(res_data);
	};
	evt.once("file_do_move", function(data) {
		res.json(data);
	});

	g_file.do_move(req.query, evt);
};

exports.file.do_rename = function(req, res) {
	var evt = new EventEmitter();
	var user_level = null;
	var author_level = null;

	evt.once("file_do_rename", function(data) {
		res.json(data);
	});

	if (req.query.ori_path === '/' || req.query.ori_path === '') {
		var res_data = {
			err_code: 20,
			message: 'alert_deny_rename_folder_in_workspace_root',
			path: req.query.ori_name
		};
		res.json(res_data);
	} else {
		g_file.do_rename(req.query, evt);
	}
};

exports.file.do_export = function(req, res) {
	var evt = new EventEmitter();

	var path = req.query.path.split('/');
	var project_path = (path[0] !== "") ? path[0] : path[1];

	//useonly(mode=goorm-standalone,goorm-oss)
	evt.once("file_do_export", function(data) {
		res.json(data);
	});
	

	

	req.query.user = req.__user.id;

	// validate permission
	

	

	//useonly(mode=goorm-oss)
	g_file.do_export(req.query, evt);
	
};







//useonly(mode=goorm-oss)
exports.file.do_import = function(req, res) {
	var evt = new EventEmitter();

	var path = req.body.file_import_location_path.split('/');
	var project_path = (path[0] !== "") ? path[0] : path[1];

	evt.once("file_do_import", function(data) {
		res.json(data);
	});

	if (req.query.is_overwrite)
		req.body.is_overwrite = req.query.is_overwrite;

	g_file.do_import(req.body, req.files.file, evt);
};


exports.file.do_search_on_project = function(req, res) {
	var evt = new EventEmitter();

	evt.once("file_do_search_on_project", function(data) {
		res.send(data);
	});

	

	//useonly(mode=goorm-oss)	
	g_search.do_search(req.query, evt);
	
};

exports.file.do_open = function(req, res) {
	var query = req.query.q;
	var __atob = function(str) {
		return (new Buffer(str, 'base64').toString('binary'));
	}

	var decode = __atob(query);

	var parser = function(decode) {
		var result = {};

		decode.split("&").forEach(function(part) {
			var item = part.split("=");
			result[__atob(item[0])] = decodeURIComponent(__atob(item[1]));
		});

		return result;
	};

	var decode_data = parser(decode); // id, filepath, filename, filetype
	var filepath = decode_data.filepath.split('/');
	filepath.shift();
	filepath = filepath.join('/');
	
	res.write('<script>setTimeout("window.close();",10)</script>');
	res.end();
}


/*
 * API : Terminal
 */

exports.terminal = function(req, res) {
	res.send(null);
};

exports.terminal.exec = function(req, res) {
	var evt = new EventEmitter();
	var command = req.query.command;

	evt.once("executed_command", function(data) {
		try {
			res.json(data);
		} catch (exception) {
			throw exception;
		}
	});

	g_terminal.exec(command, evt);
};

/*
 * API : Preference
 */

exports.preference = function(req, res) {
	res.send(null);
};

exports.preference.save = function(req, res) {
	res.send(null);
};

exports.preference.ini_parser = function(req, res) {
	res.send(null);
};

exports.preference.ini_maker = function(req, res) {
	res.send(null);
};

exports.preference.get_server_info = function(req, res) {
	var evt = new EventEmitter();

	evt.once("preference_get_server_info", function(data) {
		res.json(data);
	});

	g_preference.get_server_info(req.query, evt);
};

exports.preference.get_goorm_info = function(req, res) {
	var evt = new EventEmitter();

	evt.once("preference_get_goorm_info", function(data) {
		res.json(data);
	});

	g_preference.get_goorm_info(req.query, evt);
};
// exports.preference.put_filetypes = function(req, res) {	// hidden by jeongmin: file type is deprecated
// 	var evt = new EventEmitter();

// 	evt.on("preference_put_filetypes", function(data) {
// 		res.json(data);
// 	});

// 	g_preference.put_filetypes(req.query, evt);
// };


/*
 * API : Help
 */
exports.help = function(req, res) {
	res.send(null);
};

exports.help.get_readme_markdown = function(req, res) {
	var data = g_help.get_readme_markdown(req.query.language, req.query.filename, req.query.filepath);

	res.json(data);
};



exports.help.send_to_bug_report = function(req, res) {
	var evt = new EventEmitter();

	evt.once("help_send_to_bug_report", function(data) {
		res.json(data);
	});

	g_help.send_to_bug_report(req.query, evt);
}



exports.project.get_contents = function(req, res) {
	var path = req.query.path;
	var user = req.query.username;

	var command = exec("cd " + __workspace + path + ";zip -r " + __temp_dir + path + ".zip *", function(error, stdout, stderr) {
		if (error == null) {
			fs.readFile(__temp_dir + path + ".zip", "base64", function(err, data) {
				res.send(data);
			});
		} else {
			console.log("error : " + error);
			res.send("error : " + error);
		}
	});
}



exports.user.project.collaboration.invitation.pull = function(req, res) {
	var project_path = req.body.project_path;

	g_auth_p.can_read_project(req.__user.id, project_path, function(can_read) {
		if (can_read) {
			var user_list = [];

			if (req.body.type != 'other') {
				req.body.target_id = req.__user.id;
				req.body.target_type = req.__user.type;

				user_list = [{
					'id': req.body.target_id
				}];
			} else {
				user_list = [{
					'id': req.__user.id
				}, {
					'id': req.body.target_id
				}];
			}

			g_auth_p.invitation_pull(req.body, function(data) {
				var io = g_collaboration.__io;

				g_collaboration_chat.is_connected(io, user_list, function(__data) {
					g_collaboration_project.refresh_message({
						'user': __data.user.id
					}, function(invitation_list, waiting_list, share_list, sharing_project) {
						io.sockets.sockets[__data.client.id].emit('refresh_project_message', invitation_list, waiting_list, share_list, sharing_project, {
							'refresh': {
								'project': true,
								'terminal': true
							},
							project_path: ''
						});
					});
				});

				res.json(data);
			});
		} else {
			console.log('index.js:exports.user.project.collaboration.invitation.pull fail - permission denied', req.body);
			res.json(false);
		}
	});
}

exports.user.preference = function(req, res) {
	res.json(null);
}

exports.user.preference.save = function(req, res) {
	g_auth.get_user_data(req, function(user_data) {
		req.body.id = user_data.id;
		req.body.type = user_data.type;

		g_auth_m.save_preference(req.body, function(data) {
			res.json(data);
		})
	})
}

exports.user.preference.load = function(req, res) {
	g_auth.get_user_data(req, function(user_data) {
		req.body.id = user_data.id;
		req.body.type = user_data.type;

		g_auth_m.load_preference(req.body, function(data) {
			res.json(data);
		})
	})
}


// exports.message = function(req, res){
// 	res.json(null);
// }

// exports.message.get = function(req, res){
// 	g_auth.get_user_data(req, function(user_data){
// 		req.query.user_id = user_data.id;
// 		req.query.user_type = user_data.type;

// 		g_message.get(req.query, function(data){
// 			res.json(data);
// 		});
// 	})
// }

// exports.message.list = function(req, res){
// 	g_auth.get_user_data(req, function(user_data){
// 		req.query.user_id = user_data.id;
// 		req.query.user_type = user_data.type;

// 		g_message.get_list(req.query, function(data){
// 			res.json(data);
// 		});
// 	})
// }

// exports.message.list.receive = function(req, res){
// 	g_auth.get_user_data(req, function(user_data){
// 		req.query.user_id = user_data.id;
// 		req.query.user_type = user_data.type;

// 		g_message.get_receive_list(req.query, function(data){
// 			res.json(data);
// 		});
// 	})
// }

// exports.message.list.unchecked = function(req, res){
// 	g_auth.get_user_data(req, function(user_data){
// 		req.query.user_id = user_data.id;
// 		req.query.user_type = user_data.type;

// 		g_message.get_unchecked(req.query, function(data){
// 			res.json(data);
// 		});
// 	})
// }

// exports.message.edit = function(req, res){
// 	g_message.edit(req.body, function(data){
// 		res.json(data);
// 	});
// }

// exports.message.check = function(req, res){
// 	req.body.checked = true;

// 	g_message.edit(req.body, function(data){
// 		res.json(data);
// 	});
// }



/*
 * Download and Upload
 */

exports.download = function(req, res) {
	res.download(__temp_dir + '/' + req.query.file, function(err) {
		if (err) {
			console.log('download err', err);
			res.json('download fail try later.');
		}
		rimraf(__temp_dir + '/' + req.query.file, function(err) {

			if (err) {
				console.log('after download, rimraf err', err);
			} else {

				// download and remove complete
			}
		});


	}, function(err) {
		// ...
		console.log('Donwload Error : [' + err + ']');
	});
};
exports.upload = function(req, res) {
	//req.files
	//req.body.file_import_location_path
	// console.log(req.files);
	// console.log(req.body);


	var file_import_location_path = req.body.file_import_location_path;

	if (!req.files) {
		res.json({
			'err_code': 10,
			'message': 'No file to upload'
		});
		return false;
	} else if (!file_import_location_path || file_import_location_path.indexOf('..') > -1) {

		res.json({
			'err_code': 20,
			'message': 'Invalid Query'
		});
		return false;
	}

	var file_list = [];

	if (!Array.isArray(req.files.file)) {
		//one file
		file_list.push(req.files.file);

	} else {
		file_list = req.files.file;
	}


	if (file_list.length == 0) {
		console.log('1-1');
		res.json({
			'err_code': 10,
			'message': 'No file to upload'
		});
		return false;
	}



	var evt = new EventEmitter();

	var do_import_cnt = file_list.length;
	var complete_import_cnt = 0;

	evt.once('file_do_import', function(result) {
		complete_import_cnt++;
		if (result.err_code !== 0) {
			res.json(result);
			return false;

		}
		if (complete_import_cnt === do_import_cnt) {
			evt.emit('all_file_do_import', result);
		}


	});

	evt.once('all_file_do_import', function(result) {
		
		res.json(result);
	});

	for (var i = 0; i < do_import_cnt; i++) {

		g_file.do_import(req.body, file_list[i], evt);
	}



}
exports.send_file = function(req, res) {
	// console.log('__workspace', __workspace)
	// console.log('req.query.file', req.query.file);
	// var path=__workspace+'/'+req.query.file;
	// for(var i=0;i<4;i++){
	// 	path = path.replace(/\/\//g, "/");
	// }
	if (req.query.file.indexOf('..') > -1) {
		console.log('hacking trial!!')
		res.json(null);
		return false;
	}
	//console.log(path);
	res.sendfile(req.query.file, {
		'root': __temp_dir
	}, function(err) {
		if (err) console.log(err);
		rimraf(__temp_dir + '/' + req.query.file, function(err) {
			if (err != null) {} else {
				// send file remove?????????
			}
		});


	}, function(err) {
		// ...
	});
};

exports.download.exe_file = function(req, res) {
	var exe_path = req.query.file;
	res.download(exe_path, function(err) {
		if (err) {
			console.log('download err', err);
		}
	});
};








//useonly(mode=goorm-oss)
exports.upload_file_dd = function(req, res) {
	var evt = new EventEmitter();
	var project_path = req.body.project_path;

	evt.once('upload_finish', function(data) {
		res.json(data);
	});
	g_file.upload_file_dd(req, evt);
};















exports.edit = function(req, res) {
	res.send(null);
}

exports.edit.get_dictionary = function(req, res) {
	// var evt = new EventEmitter();

	// evt.on("edit_get_dictionary", function (data) {
	// 	res.json(data);
	// });

	// g_edit.get_dictionary(req.query, evt);

	res.json({});
};

//useonly(mode=goorm-standalone,goorm-oss)
exports.edit.get_proposal_java = function(req, res) {
	var evt = new EventEmitter();

	evt.once("got_proposal_java", function(data) {
		res.json(data);
	});

	g_edit.get_proposal_java(req.query, evt);
};




exports.edit.get_auto_import_java = function(req, res) {
	var evt = new EventEmitter();

	evt.once("got_auto_import_java", function(data) {
		res.json(data);
	});

	g_edit.get_auto_import_java(req.query, evt);
};


exports.edit.get_object_explorer = function(req, res) {
	var evt = new EventEmitter();

	evt.once("got_object_explorer", function(data) {
		res.json(data);
	});

	
	g_edit.get_object_explorer(req.query, evt);
};




exports.edit.save_tags = function(req, res) {
	var option = req.body;

	

	//useonly(mode=goorm-standalone,goorm-oss)
	g_edit.save_tags_data(option, function() {
		res.json(true);
	});
	
}

exports.edit.load_tags = function(req, res) {
	var option = req.query;

	

	//useonly(mode=goorm-standalone,goorm-oss)
	g_edit.load_tags_data(option, function(response) {
		res.json(response);
	});
	
}






	//useonly(mode=goorm-standalone,goorm-server,goorm-client)
exports.load_userplugin = function(req, res) {
	g_plugin.load_userplugin(req, res, function(has_user_plugin, list) {
		if (has_user_plugin)
			res.json(list);
		else
			res.json([]);
	});
};
exports.share = {}
exports.share.read_share = function(req, res) {
	if (req.params[0]) {

	}
};

exports.share = {}
exports.share.new_share = function(req, res) {
	// if(req.params[0]) {
	g_share.share({
		path: "moyara_kq",
		copy: true,
		priviliges: {
			all: {
				edit: false
			},
			moyara: {
				edit: true
			}
		}
	}, function(result) {
		res.json(result);
	});
	// }
};

exports.share.redirect_share = function(req, res) {
	if (req.params[0]) {
		var hash = req.params[0];
		if (req.path.match(/^\/share-(.*)$/)) {
			exports.index(req, res);
		} else {
			res.redirect('share-' + hash);
		}
	} else {
		res.end("");
	}
};

exports.share.redirect_edu = function(req, res) {
	if (req.params[0]) {
		var hash = req.params[0];
		if (req.path.match(/^\/edu-(.*)$/)) {
			g_auth_p.get_project_from_hash(hash, function(project) {
				//seongho.cha: if err, alert panel showed after loading automatically
				if (project) {
					exports.index(req, res, {
						use_terminal: project.use_terminal
					});
				} else {
					exports.index(req, res);
				}
			});
		} else {
			res.redirect('edu-' + hash);
		}
	} else {
		res.end("");
	}
};