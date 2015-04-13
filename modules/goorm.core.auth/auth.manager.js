/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/



var EventEmitter = require("events").EventEmitter;
var crypto = require('crypto');
var http = require('http');
var querystring = require('querystring');

var g_secure = require("../goorm.core.secure/secure");
var g_log = require("../goorm.core.log/log");

// var retricon = require('retricon');



var check_form = {
	regular_expression_id: /^[0-9a-zA-Z]{4,15}$/,
	regular_expression_password: /^.*(?=^.{8,15}$)(?=.*\d)(?=.*[a-zA-Z])(?=.*[`!@#$%^&+=\(\)\*\-\_\|\[\]\{\}\<\>\?\,\.\/\;\'\:]).*$/,
	regular_expression_name: /^[가-힣 0-9a-zA-Z._-]{2,15}$/,
	regular_expression_email: /^([0-9a-zA-Z._-]+)@([0-9a-zA-Z_-]+)(\.[a-zA-Z0-9]+)(\.[a-zA-Z]+)?$/
};

var exec = require('child_process').exec;

module.exports = {
	
	register: function(req, callback) {
		var self = this;

		var req_body = req.body; //jeongmin: access object member less

		
		
		
		//useonly(mode=goorm-oss)
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
	
	
	login: function(user, req, callback) {
		var self = this;
		var sha_pw = crypto.createHash('sha1');
		var sha_pw2 = crypto.createHash('sha1');

		

		

		//to make correct host --heeje
		if (host.indexOf(':') >= 0) {
			host = host.split(':')[0];
		}

		
		//useonly(mode=goorm-oss)
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
			store.client.set('session_' + IDE_HOST + '_' + user_data.id, req.sessionID);
			store.client.set(req.sessionID, JSON.stringify(user_data));
		} else {
			session.auth = {
				loggedIn: true,
			};

			//jeongmin: literal is faster

			store.set('session_' + IDE_HOST + '_' + user_data.id, {
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

	destroy_session: function(options, callback) {
		var self = this;

		var io = this.g_collaboration.get_io();

		var sessionID = options.session_id;
		var user_id = options.user_id;

		console.log('auth.manager.js:destroy_session try - ', user_id, sessionID);

		store.client.get(sessionID, function(null_obj, session) {
			if (session) {
				try { // jeongmin: try catching
					session = JSON.parse(session);

					if (session.id === user_id) {
						

						

						store.destroy(sessionID, function() {
							store.client.del('session_' + IDE_HOST + '_' + session.id, function() {
								store.client.del('sess:' + sessionID, function() {
									store.client.del('socket_' + sessionID, function() {
										store.client.del('sockets_' + global.__local_ip + "_" + sessionID, function() {
											callback(true);
										});
									});
								});
							});
						});
					} else {
						console.log('auth.manager.js:destroy_session fail user id is not same', session.id, user_id);
						callback(false);
					}
				} catch (e) {

					// session is string (is not object)
					//
					store.client.get(session, function(null_obj, inner_session) {
						try {
							inner_session = JSON.parse(inner_session);

							if (inner_session.id === user_id) {
								

								

								store.destroy(sessionID, function() {
									store.client.del('session_' + IDE_HOST + '_' + inner_session.id, function() {
										store.client.del(sessionID, function() {
											store.client.del('socket_' + sessionID, function() {
												store.client.del('sockets_' + global.__local_ip + "_" + sessionID, function() {
													callback(true);
												});
											});
										});
									});
								});
							} else {
								console.log('auth.manager.js:destroy_session fail user id is not same', inner_session.id, user_id);
								callback(false);
							}
						} catch (e) {
							console.log('auth.manager.js:destroy_session fail', e);
							callback(false);
						}
					});
				}
			} else {
				console.log('auth.manager.js:destroy_session fail - cannot find sessionData', user_id, sessionID);
				callback(false);
			}
		});
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
							
							//useonly(mode=goorm-oss)
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