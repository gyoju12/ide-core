/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var list = ["google", "github", "facebook", "twitter", "password"];

var http = require('http');
var querystring = require('querystring')
	// var fs = require('fs');

module.exports = {
	connect: function(__guest) {
		this.g_auth_g = __guest;
	},

	get_list: function() {
		return list;
	},

	get_user_data: function(req, callback) {
		var session = req.session;
		var session_id = req.sessionID;
		var force = false;

		if (req.body.secure_session_id || req.query.secure_session_id) {
			session_id = (req.body.secure_session_id) ? req.body.secure_session_id : ((req.query.secure_session_id) ? req.query.secure_session_id : req.sessionID);
			session_id = session_id.replace(/ /g, "+");
			force = true;
		}

		if (global.__redis_mode) {
			store.client.get(session_id, function(err, data) {
				if (!err && data) {
					try { // jeongmin: try catching
						var redis_session = JSON.parse(data);

						if (force || USE_SSO) {
							callback(redis_session);
						}
						else { // force --> false
							store.client.get('session_'+IDE_HOST+'_' + redis_session.id, function(err, data) {
								// compare ID: session ID 
								if (data === session_id) {
									callback(redis_session);
								} else {
									callback({});
								}
							});
						}
					} catch (e) {
						console.log('get user data error:', e);
						callback({});
					}
				} else {
					callback({});
				}
			});
		} else {
			var session_auth = session.auth;
			var session_auth_pw = session_auth.password;

			var user_session = (session_auth && session_auth.loggedIn && session_auth_pw && session_auth_pw.user) ? session_auth_pw.user : {};
			//jeongmin: access object member less

			callback(user_session);
		}
	},

	// save to redis ssh_[id]:STRING([data])
	// 
	save_auth_data: function(id, data, callback) {
		var ssh_id = 'ssh_' + id;

		store.client.set(ssh_id, JSON.stringify(data), function() {
			if (callback && typeof(callback) === 'function') {
				callback(true);
			}
		});
	},

	load_auth_data: function(id, callback) {
		var ssh_id = 'ssh_' + id;

		store.client.get(ssh_id, function(err, data) {
			if (!err && data) {
				try { // jeongmin: try catching
					var auth_data = JSON.parse(data);
					callback(auth_data);
				} catch (e) {
					console.log('load auth data error:', e);
					callback(false);
				}
			} else {
				callback(false);
			}
		});
	},

	
	

	
};
