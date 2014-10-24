/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var expire_date = 60 * 60 * 2; // 2h
// var expire_date = 180; // 3m



var EventEmitter = require("events").EventEmitter;
var async = require('async');
var crypto = require('crypto');
var http = require('http');
var querystring = require('querystring');

var g_secure = require("../goorm.core.secure/secure");

// var retricon = require('retricon');



var check_form = {
	regular_expression_id: /^[0-9a-zA-Z]{4,15}$/,
	regular_expression_password: /^.*(?=^.{8,15}$)(?=.*\d)(?=.*[a-zA-Z])(?=.*[`!@#$%^&+=\(\)\*\-\_\|\[\]\{\}\<\>\?\,\.\/\;\'\:]).*$/,
	regular_expression_name: /^[가-힣 0-9a-zA-Z._-]{2,15}$/,
	regular_expression_nick: /^[가-힣 0-9a-zA-Z._-]{2,20}$/,
	regular_expression_email: /^([0-9a-zA-Z._-]+)@([0-9a-zA-Z_-]+)(\.[a-zA-Z0-9]+)(\.[a-zA-Z]+)?$/

};

var exec = require('child_process').exec;

module.exports = {
	
	register: function(req, callback) {
		var self = this;

		var req_body = req.body; //jeongmin: access object member less

		
		
		
		
		
		var sha_pw = crypto.createHash('sha1');
		var sha_pw2 = crypto.createHash('sha1');

		if (req_body.pw) {
			sha_pw.update(req_body.pw);
			var temp_pw = sha_pw.digest('hex');
			sha_pw2.update(temp_pw);
			req_body.pw = sha_pw2.digest('hex');
		}

		this.update_session(req, req_body);
		callback({
			result: true
		});
		
	},

	sync_uid: function(option, callback) {
		var content = option;

		content.uid = g_secure.command_filter(content.uid);
		content.id = g_secure.command_filter(content.id);

		//jeongmin: array.join() is better than + for concatenating strings
		//'useradd -u ' + content.uid + ' ' + content.id
		exec(['useradd -u ', content.uid, ' ', content.id].join(""), function(err, stdout, stderr) {
			if (!err) {
				
				
				console.log('Complete : sync-uid [', option, ']');

				if (callback) {
					callback({
						result: true
					});
				}
				
			} else {
				console.log(err, stdout, stderr);
				if (callback) {
					callback({
						result: false,
						code: 1
					});
				}
			}
			//jeongmin: most frequently executable condition should be appeared first
		});
	},
	
	login: function(user, req, callback) {
		var self = this;
		var sha_pw = crypto.createHash('sha1');
		var sha_pw2 = crypto.createHash('sha1');
		
		
		// Update Session
		this.update_session(req, user_data);

		callback({
			result: true
		});
		
	},
	
	
	
	
	filtering: function(data) {
		var user_data = {};
		for (var attr in user_schema) {
			if (attr == 'pw' || attr == 'uid' || attr == 'gid')
				continue;
			user_data[attr] = data[attr];
		}

		return user_data;
	},
	
	update_session: function(req, user) {
		var user_data = {};
		var session = req.session;

		for (var attr in user_schema) {
			if (attr == 'deleted' || attr == 'last_access_time' || attr == 'pw')
				continue;
			user_data[attr] = user[attr];
		}

		// Redis Store
		if (global.__redis_mode) {
			store.client.set('session_' + user_data.id, req.sessionID);
			store.client.set(req.sessionID, JSON.stringify(user_data));
		} else {
			session.auth = {
				loggedIn: true,
			};

			//jeongmin: literal is faster

			store.set('session_' + user_data.id, {
				'cookie': {
					'expires': null
				},
				'session_id': req.sessionID
			});
			store.set(req.sessionID, {
				'cookie': {
					'expires': null
				},
				'user_data': JSON.stringify(user_data)
			});
		}
		
	},

	destroy_session: function(req, callback) {
		var self = this;
		
		var data = req.body.data;
		var list = [];

		if (data) {
			try { // jeongmin: try catching
				data = JSON.parse(data);
				list = data.list;
			} catch (e) {
				console.log('destroy session error:', e);
				callback(false);
			}
		}

		if (list.length > 0) {

			var count = 0;

			var len = list.length; //jeongmin: prevent calculating length at each loop
			for (var i = len - 1; 0 <= i; i--) { //jeongmin: conditional evaluation using 0(false)
				(function(index) {
					var item = list[i];

					var session = item.session_id;

					session = g_secure.command_filter(session);

					if (global.__redis_mode) {
						store.client.del(session);
					}

					
					
				})(i);
			}
		}
	},

	get_user_schema: function() {
		return user_schema;
	},
	
	/* 
	 * id / src / coords
	 */
	upload_profile: function(options, callback) {
		var gm = require('gm').subClass({
			imageMagick: true
		});
		var fs = require('fs');

		var id = options.id;
		var src = options.src;
		var img_data = src.substring(src.indexOf(',') + 1, src.length);
		var coords = options.coords;

		var extension = src.substring(src.indexOf('/') + 1, src.indexOf(';'));

		var path = global.__temp_dir + '/' + options.id + '.' + extension;
		var cropped = global.__temp_dir + '/cropped_' + options.id + '.' + extension;

		var unlink = function() {
			fs.exists(path, function(exists) {
				if (exists) {
					fs.unlink(path);
				}
			});

			fs.exists(cropped, function(exists) {
				if (exists) {
					fs.unlink(cropped);
				}
			});
		};

		var fail = function(err) {
			unlink();

			console.log(err);
			callback(false);
		};

		fs.writeFile(path, img_data, 'base64', function(err) {
			if (!err) {
				gm(path).crop(coords.w, coords.h, coords.x, coords.y)
					.resize(coords.resize_x, coords.resize_y)
					.write(cropped, function(err) {
						if (!err) {
							
							
							unlink();
							callback(true);
							
						} else {
							fail('Upload Profile Image ERR2: ' + err);
						}
					});
			} else {
				fail('Upload Profile Image ERR1: ' + err);
			}
		});
	},
	
	get_guest_expire_date: function() {
		return expire_date;
	},
	
	start: function(io) {
		var self = this;
		self.__io = io;
		io.set('log level', 0);
		io.sockets.on('connection', function(socket) {
			
			socket.on('disconnect', function(socket) {
				console.log('auth disconnect', socket);
			});

		});

	},
	
	
};