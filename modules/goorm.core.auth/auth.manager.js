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
var user_schema = {
	id: String,
	pw: String,
	name: String,
	nick: String,
	email: String,
	deleted: Boolean,
	type: String,
	
	

	

	last_access_time: Date,
	uid: Number,
	gid: Array,
	group: String,
	preference: String,
	service_type: String,
	comment: String,
	image: String,
	workspace: String,
	expires_at: {
		'type': Date,
		expires: expire_date
	}
};

var db = {
	'user': mongoose.model('user', new Schema(user_schema))
}

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

		
		
		
		
		
		self.add(req_body, function(add_result) {
			if (add_result) {

				var sha_pw = crypto.createHash('sha1');
				var sha_pw2 = crypto.createHash('sha1');

				if (req_body.pw) {
					sha_pw.update(req_body.pw);
					var temp_pw = sha_pw.digest('hex');
					sha_pw2.update(temp_pw);
					req_body.pw = sha_pw2.digest('hex');
				}

				self.update_session(req, req_body);
				callback({
					result: true
				});
			} else {
				callback({
					code: 61,
					result: false
				});
			}
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
				var __gid = [];
				__gid.push(content.gid);

				db.user.update({
					'id': content.id
				}, {
					$set: {
						'uid': content.uid,
						'gid': __gid
					}
				}, function() {
					console.log('Complete : sync-uid [', option, ']');

					if (callback) {
						callback({
							result: true
						});
					}
				});
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

	add: function(userdata, callback) {
		var self = this;

		var doc = new db.user();
		var user = userdata;
		var sha_pw = crypto.createHash('sha1');
		var sha_pw2 = crypto.createHash('sha1');

		for (var attrname in user_schema) {
			if (user[attrname]) {
				doc[attrname] = user[attrname];
			}
		}
		doc.deleted = false;
		doc.preference = JSON.stringify({});
		if (doc.pw) {
			sha_pw.update(doc.pw);
			var temp_pw = sha_pw.digest('hex');
			sha_pw2.update(temp_pw);
			doc.pw = sha_pw2.digest('hex');
		}

		doc.save(function(err) {
			if (!err) {
				callback(true);
			} else {
				console.log(err, 'User Adding [fail]');
				callback(false);
			}
		});
	},

	del: function(id, callback) {
		db.user.remove({
			'id': id
		}, function() {
			callback(true);
		});
	},

	// for admin
	user_add: function(user, callback) {
		this.add(user, callback);
	},

	get: function(user, callback) {
		db.user.findOne({
			'id': user.id
		}, function(err, data) {
			callback(data);
		});
	},

	user_get: function(user, callback) {
		var self = this;

		this.get(user, function(user_data) {
			if (user_data) {
				user_data = self.filtering(user_data);
				callback(user_data);
			} else callback(null);
		});
	},

	get_list: function(callback) {
		var self = this;

		db.user.find({}, {
			id: 1,
			name: 1,
			nick: 1,
			email: 1,
			group: 1
		}, function(err, result) {
			if (result && result.length !== 0) {
				for (var i = 0; i < result.length; i++) {
					result[i] = self.filtering(result[i]);
				}

				callback(result);
			} else {
				callback(result);
			}

			// var evt = new EventEmitter();
			// evt.on('get_list_filtering', function(evt, i) {
			// 	if (result[i]) {
			// 		result[i] = self.filtering(result[i]);
			// 		evt.emit('get_list_filtering', evt, ++i);
			// 	} else {
			// 		callback(result);
			// 	}
			// });
			// evt.emit('get_list_filtering', evt, 0);
		});
	},

	get_group_list: function(option, callback) {
		var group = option.group;

		db.user.find({
			'group': group
		}, function(err, data) {
			callback(data);
		});
	},

	get_match_list: function(option, callback) {
		var query = option.query;
		db.user.find({
			$or: [{
				'id': {
					$regex: query,
					$options: 'g'
				}
			}, {
				'name': {
					$regex: query,
					$options: 'g'
				}
			}, {
				'nick': {
					$regex: query,
					$options: 'g'
				}
			}]
		}, {
			id: 1,
			name: 1,
			nick: 1,
			group: 1
		}, function(err, user_list) {
			callback(user_list);
		});
	},

	get_match_list_group: function(option, callback) {
		var query = option.query;
		db.user.find({
			'group': option.group,
			$or: [{
				'id': {
					$regex: query,
					$options: 'g'
				}
			}, {
				'name': {
					$regex: query,
					$options: 'g'
				}
			}, {
				'nick': {
					$regex: query,
					$options: 'g'
				}
			}]
		}, function(err, user_list) {
			callback(user_list);
		});
	},

	// avail_blind: function(users, callback) {
	// 	var self = this;
	// 	var data = users.data;
	// 	var ret = {};

	// 	var evt = new EventEmitter();
	// 	evt.on('blanch_user_avail_blind', function(evt, i) {
	// 		var data_i = data[i]; //jeongmin: access array member less

	// 		if (data_i) {
	// 			if (data_i.deleted == 'true' || data_i.deleted === true) {
	// 				self.blind(data_i, function(blind_data) {
	// 					ret[data_i.id] = blind_data;
	// 					evt.emit('blanch_user_avail_blind', evt, ++i);
	// 				});
	// 			} else if (data_i.deleted == 'false' || data_i.deleted === false) {
	// 				self.avail(data_i, function(avail_data) {
	// 					ret[data_i.id] = avail_data;
	// 					evt.emit('blanch_user_avail_blind', evt, ++i);
	// 				});
	// 			}
	// 		} else {
	// 			callback(ret);
	// 		}
	// 	});
	// 	evt.emit('blanch_user_avail_blind', evt, 0);
	// },

	// avail: function(user, callback) {
	// 	db.user.update({
	// 		'id': user.id
	// 	}, {
	// 		$set: {
	// 			deleted: false
	// 		}
	// 	}, {
	// 		multi: true
	// 	}, function(err) {
	// 		if (!err) callback(true);
	// 		else {
	// 			console.log(err, 'User Availiave [fail]');
	// 			callback(false);
	// 		}
	// 	});
	// },

	// blind: function(user, callback) {
	// 	db.user.update({
	// 		'id': user.id
	// 	}, {
	// 		$set: {
	// 			deleted: true
	// 		}
	// 	}, {
	// 		multi: true
	// 	}, function(err) {
	// 		if (!err) callback(true);
	// 		else {
	// 			console.log(err, 'User Blindng [fail]');
	// 			callback(false);
	// 		}
	// 	});
	// },

	remove: function(user, callback) {
		db.user.remove({
			id: user.id
		}, function(err) {
			if (!err) callback(true);
			else callback(false);
		});
	},

	set: function(user, req, callback) {
		var self = this;

		var member = {};

		for (var attrname in user) {
			
			
				if (attrname == 'id' || attrname == 'type' || attrname == 'deleted' || attrname == 'last_access_time')
				
					continue;

			if (attrname == 'comment' && user[attrname] && user[attrname] !== "") {
				user[attrname] = ((user[attrname].replace(/&/g, '&amp;')).replace(/\"/g, '&quot;')).replace(/\'/g, '&#39;');
				user[attrname] = user[attrname].replace(/</g, '&lt;').replace(/>/g, '&gt;');
			}

			member[attrname] = user[attrname];
		}

		db.user.update({
			'id': user.id
		}, {
			$set: member
		}, null, function(err) {
			if (!err) {
				callback({
					result: true,
					data: member
				});
			} else {
				console.log('member_dao : Member updating [fail]', err);
				callback({
					result: false
				});
			}
		});
	},

	user_set: function(req, callback) {
		var self = this;
		var user = req.body;
		if (user.pw) {

			var crypto = require('crypto');
			var sha_pw = crypto.createHash('sha1');
			var temp_pw = sha_pw.update(user.pw).digest('hex');
			user.pw = sha_pw.update(temp_pw).digest('hex');
		}
		self.set(user, req, function(set_result) {
			if (set_result.result) {
				self.get(user, function(user_data) {
					self.update_session(req, user_data);
					callback(true);
				});
			} else {
				callback(false);
			}
		});
	},

	login: function(user, req, callback) {
		var self = this;
		var sha_pw = crypto.createHash('sha1');
		var sha_pw2 = crypto.createHash('sha1');

		// get user data in db
		self.get(user, function(user_data) {
			if (user_data && !user_data.deleted) {
				if (global.__sso_mode) {
					var post_data = querystring.stringify({
						'id': user_data.id,
						'pw': user.pw,
						'type': 'password',
						'is_duplicate_login': "0",
						'session_id': req.sessionID,
						'session_type': global.__service_config.session_type
					});
					var post_options = {
						'host': 'goorm.io',
						'port': 81,
						'path': '/login',
						'method': 'POST',
						'headers': {
							'Content-Type': 'application/x-www-form-urlencoded',
							'Content-Length': post_data.length
						}
					};

					var content = "";
					var post_req = http.request(post_options, function(res_inner) {
						res_inner.setEncoding('utf8');
						res_inner.on('data', function(chunk) {
							content += chunk;
						});
						res_inner.on('end', function() {
							if (content && content !== "") {
								try { // jeongmin: try catching
									content = JSON.parse(content);

									if (content.result) {
										self.update_session(req, user_data);

										//	Access User
										self.access(user);
										callback({
											result: true
										});
									} else {
										if (content.err_code == 1 || content.err_code == "1") content.err_code = 0;
										else if (content.err_code === 0 || content.err_code == "0") content.err_code = 1;

										callback({
											code: content.err_code,
											result: false
										});
									}
								} catch (e) {
									console.log('login error:', e);
									callback({
										result: false
									});
								}
							}
						});
					});

					post_req.on('error', function(e) {
						console.log(e);
					});

					post_req.write(post_data);
					post_req.end();
				} // For Service Mode
				else if (global.__service_mode) {
					if (user_data.uid && user_data.gid) {
						sha_pw.update(user.pw);
						var temp_pw = sha_pw.digest('hex');
						sha_pw2.update(temp_pw);
						if (user_data.pw == sha_pw2.digest('hex')) {
							// check is_connected
							self.duplicate_login_check(user_data, function(can_be_login) {
								if (can_be_login) {

									// Update Session
									self.update_session(req, user_data);

									//	Access User
									self.access(user);
									callback({
										result: true
									});
								} else {
									// duplicate login (code : 2)
									// call disconnect_user_and_login
									callback({
										code: 2,
										result: false
									});
								}
							});
						} else if (user_data.pw == temp_pw) { // Donguk Kim: temporary 
							// check is_connected
							self.duplicate_login_check(user_data, function(can_be_login) {
								if (can_be_login) {

									// Update Session
									self.update_session(req, user_data);

									//	Access User
									self.access(user);
									callback({
										result: true
									});
								} else {
									// duplicate login (code : 2)
									// call disconnect_user_and_login
									callback({
										code: 2,
										result: false
									});
								}
							});
						} else {
							callback({
								code: 0,
								result: false
							});
						}
					} else {
						callback({
							code: 3,
							result: false
						});
					}
				} else {
					sha_pw.update(user.pw);
					var temp_pw = sha_pw.digest('hex');
					sha_pw2.update(temp_pw);

					if (user_data.pw == sha_pw2.digest('hex')) {
						self.duplicate_login_check(user_data, function(can_be_login) {
							console.log("###can be login: " + can_be_login);
							if (can_be_login) {

								// Update Session
								self.update_session(req, user_data);

								//	Access User
								self.access(user);
								callback({
									result: true
								});
							} else {
								// duplicate login process
								callback({
									code: 2,
									result: false
								});
							}
						});
					} else {
						callback({
							code: 0,
							result: false
						});
					}
				}
			} else {
				callback({
					code: 1,
					result: false
				});
			}
		});
	},

	access: function(user) {
		var member = {
			'last_access_time': new Date()
		};

		db.user.update({
			'id': user.id
		}, {
			$set: member
		}, null, function(err) {
			if (err) console.log(err, 'Access Fail');
		});
	},
	
	
	set_check: function(user, evt) {
		var ret = {};

		if (!user.id) {
			ret.result = false;
			ret.code = 0;

			evt.emit("auth_set_check_user_data", ret);
		} else {
			db.user.findOne({
				'id': user.id
			}, function(err, result) {
				if (err) {
					ret.result = false;
					ret.code = 3;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!user.name) {
					ret.result = false;
					ret.code = 30;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!check_form.regular_expression_name.test(user.name)) {
					ret.result = false;
					ret.code = 31;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!user.nick) {
					ret.result = false;
					ret.code = 40;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!check_form.regular_expression_nick.test(user.nick)) {
					ret.result = false;
					ret.code = 41;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!user.email) {
					ret.result = false;
					ret.code = 20;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!check_form.regular_expression_email.test(user.email)) {
					ret.result = false;
					ret.code = 21;

					evt.emit("auth_set_check_user_data", ret);
				} else {
					if (!user.pw && !user.re_pw) {
						ret.result = true;
						evt.emit("auth_set_check_user_data", ret);
					} else {
						if (!user.re_pw && user.re_pw !== "") {
							ret.result = false;
							ret.code = 11;

							evt.emit("auth_set_check_user_data", ret);
						} else if (user.pw != user.re_pw) {
							ret.result = false;
							ret.code = 12;

							evt.emit("auth_set_check_user_data", ret);
						} else if (!check_form.regular_expression_password.test(user.pw)) {
							ret.result = false;
							ret.code = 13;

							evt.emit("auth_set_check_user_data", ret);
						} else {
							ret.result = true;
							evt.emit("auth_set_check_user_data", ret);
						}
					}
				}
			});
		}
	},
	set_check_pw: function(user, evt) {
		var ret = {};

		if (!user.id) {
			ret.result = false;
			ret.code = 0;

			evt.emit("auth_set_check_user_data", ret);
		} else {
			db.user.findOne({
				'id': user.id
			}, function(err, result) {
				if (err) {
					ret.result = false;
					ret.code = 3;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!user.name) {
					ret.result = false;
					ret.code = 30;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!check_form.regular_expression_name.test(user.name)) {
					ret.result = false;
					ret.code = 31;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!user.nick) {
					ret.result = false;
					ret.code = 40;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!check_form.regular_expression_nick.test(user.nick)) {
					ret.result = false;
					ret.code = 41;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!user.email) {
					ret.result = false;
					ret.code = 20;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!check_form.regular_expression_email.test(user.email)) {
					ret.result = false;
					ret.code = 21;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!user.re_pw && user.re_pw !== "") {
					ret.result = false;
					ret.code = 11;

					evt.emit("auth_set_check_user_data", ret);
				} else if (user.pw != user.re_pw) {
					ret.result = false;
					ret.code = 12;

					evt.emit("auth_set_check_user_data", ret);
				} else if (!check_form.regular_expression_password.test(user.pw)) {
					ret.result = false;
					ret.code = 13;

					evt.emit("auth_set_check_user_data", ret);
				} else {
					ret.result = true;
					evt.emit("auth_set_check_user_data", ret);
				}
			});
		}
	},

	check: function(user, evt) {
		var ret = {};

		if (!user.id) {
			ret.result = false;
			ret.code = 0;

			evt.emit("auth_check_user_data", ret);
		} else if (!check_form.regular_expression_id.test(user.id)) {
			ret.result = false;
			ret.code = 1;

			evt.emit("auth_check_user_data", ret);
		} else {
			db.user.findOne({
				'id': user.id
			}, function(err, result) {
				if (!err && result) {
					ret.result = false;
					ret.code = 2;

					evt.emit("auth_check_user_data", ret);
				} else {
					if (!user.pw) {
						ret.result = false;
						ret.code = 10;

						evt.emit("auth_check_user_data", ret);
					} else if (!user.re_pw) {
						ret.result = false;
						ret.code = 11;

						evt.emit("auth_check_user_data", ret);
					} else if (user.pw != user.re_pw) {
						ret.result = false;
						ret.code = 12;

						evt.emit("auth_check_user_data", ret);
					} else if (!check_form.regular_expression_password.test(user.pw)) {
						ret.result = false;
						ret.code = 13;

						evt.emit("auth_check_user_data", ret);
					} else if (!user.name) {
						ret.result = false;
						ret.code = 30;

						evt.emit("auth_check_user_data", ret);
					} else if (!check_form.regular_expression_name.test(user.name)) {
						ret.result = false;
						ret.code = 31;

						evt.emit("auth_check_user_data", ret);
					} else if (!user.nick) {
						ret.result = false;
						ret.code = 40;

						evt.emit("auth_check_user_data", ret);
					} else if (!check_form.regular_expression_nick.test(user.nick)) {
						ret.result = false;
						ret.code = 41;

						evt.emit("auth_check_user_data", ret);
					} else if (!user.email) {
						ret.result = false;
						ret.code = 20;

						evt.emit("auth_check_user_data", ret);
					} else if (!check_form.regular_expression_email.test(user.email)) {
						ret.result = false;
						ret.code = 21;

						evt.emit("auth_check_user_data", ret);
					} else if (user.id.indexOf('root') > -1) {
						ret.result = false;
						ret.code = 22;

						evt.emit("auth_check_user_data", ret);
					} else {
						ret.result = true;
						evt.emit("auth_check_user_data", ret);

					}
				}
			});
		}
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
	find_id: function(req, evt) {
		var ret = {};
		db.user.findOne({
			'name': req.body.name,
			'email': req.body.email
		}, function(err, result) {

			if (result) {
				ret.result = result.id;
				ret.code = 1;

				evt.emit("auth_find_user_id", ret);
				ret = null;

			} else {
				ret.code = 0;
				evt.emit("auth_find_user_id", ret);
				ret = null;
			}
			if (err) {

				ret.code = 2;
				evt.emit("auth_find_user_id", ret);
				ret = null;
			}
		});

	},
	find_pw: function(req, evt) {
		var req_body = req.body; //jeongmin: access object member less

		var rettmp = {
			code: 0
		};
		// var rettmp = {};
		// rettmp.code = 0;
		//jeongmin: literal is faster

		if (!req_body.id || !req_body.name || !req_body.email) {
			evt.emit("auth_find_user_pw", rettmp);
			return false;
		}
		db.user.findOne({
			'id': req_body.id,
			'name': req_body.name,
			'email': req_body.email
		}, function(err, result) {

			if (result) {
				var randomStringfunc = function(bits) {
					var chars, rand, i, ret;

					chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345678912';
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
				var password_ger = randomStringfunc(54);

				var sha_pw = crypto.createHash('sha1');
				var sha_pw2 = crypto.createHash('sha1');
				sha_pw.update(password_ger);
				var temp_pw = sha_pw.digest('hex');
				sha_pw2.update(temp_pw);
				db.user.update({
					'id': req_body.id,
					'name': req_body.name,
					'email': req_body.email
				}, {
					'pw': sha_pw2.digest('hex')
				}, function(err) {

					if (err) {

						evt.emit("auth_find_user_pw", rettmp);
						return;
					}

				});

				var nodemailer;
				try {
					nodemailer = require('nodemailer');
				} catch (e) {
					console.log('emaile err', e);
					console.log("install by typing [npm install nodemailer ]");
					evt.emit("auth_find_user_pw", rettmp);
					return false;

				}

				// create reusable transport method (opens pool of SMTP connections)
				var smtpTransport = nodemailer.createTransport("SMTP", {
					service: "Gmail",
					auth: {
						user: "contact@goorm.io",
						pass: "aosdbdntmd"
					}
				});

				// setup e-mail data with unicode symbols
				var mailOptions = {
					from: "구름고객센터 <contact@goorm.io>", // sender address
					to: req_body.email, // list of receivers
					subject: "goorm 임시비밀번호 발급 메일입니다", // Subject line
					text: [req_body.name, "님 의 임시비밀번호는 다음과 같습니다. ", password_ger].join("") // plaintext body
					//jeongmin: array.join() is better than + for concatenating strings
					//html: "<b>Hello world ✔</b>" // html body
				};

				// send mail with defined transport object
				smtpTransport.sendMail(mailOptions, function(error, response) {
					if (error) {
						console.log('send mail err', error);
						evt.emit("auth_find_user_pw", rettmp);

					} else {
						rettmp.code = 1;
						rettmp.result = req_body.email;
						console.log("Message sent: " + response.message);

						evt.emit("auth_find_user_pw", rettmp);
					}

					// if you don't want to use this transport object anymore, uncomment following line
					smtpTransport.close(); // shut down the connection pool, no more messages
				});


			} else {
				evt.emit("auth_find_user_pw", rettmp);

			}
			if (err) {
				evt.emit("auth_find_user_pw", rettmp);
				console.log(err);
			}
		});

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
				loggedIn: true
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

		if (global.__sso_mode) {
			var postdata = {
				'user_data': user_data,
				'session_id': req.sessionID,
				'session_type': global.__service_config.session_type
			};

			var post_data = querystring.stringify({
				'data': JSON.stringify(postdata)
			});
			var post_options = {
				'host': 'goorm.io',
				'port': 81,
				'path': '/session/save',
				'method': 'POST',
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': post_data.length
				}
			};

			var content = "";
			var post_req = http.request(post_options);
			post_req.on('error', function(e) {
				console.log(e);
			});

			post_req.write(post_data);
			post_req.end();
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

	duplicate_login_check: function(user, callback) {
		var io = this.g_collaboration.get_io();

		var userdata = [{
			'id': user.id
		}];

		var is_connect = function() {
			callback(false);
		};

		var is_not_connect = function() {
			callback(true);
		};

		this.g_collaboration_chat.is_connected(io, userdata, is_connect, is_not_connect);
	},

	disconnect: function() {

	},

	disconnect_user_and_login: function(req, callback) {
		var self = this;

		if (global.__sso_mode) {
			var post_data = querystring.stringify({
				'id': req.body.id,
				'pw': req.body.pw,
				'type': 'password',
				'is_duplicate_login': "1",
				'session_id': req.sessionID,
				'session_type': global.__service_config.session_type
			});
			var post_options = {
				'host': 'goorm.io',
				'port': 81,
				'path': '/login',
				'method': 'POST',
				'headers': {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': post_data.length
				}
			};

			var content = "";
			var post_req = http.request(post_options, function(res_inner) {
				res_inner.setEncoding('utf8');
				res_inner.on('data', function(chunk) {
					content += chunk;
				});
				res_inner.on('end', function() {
					if (content && content !== "") {
						try { // jeongmin: try catching
							content = JSON.parse(content);

							if (content.result) {
								self.update_session(req, content.data);
								callback({
									result: true
								});
							} else {
								callback({
									code: content.err_code,
									result: false
								});
							}
						} catch (e) {
							console.log('disconnect user and login error:', e);
							callback({
								result: false
							});
						}
					}
				});
			});

			post_req.on('error', function(e) {
				console.log(e);
			});

			post_req.write(post_data);
			post_req.end();
		} else {
			var user = req.body;

			var io = this.g_collaboration.get_io();
			var userdata = [{
				'id': user.id
			}];

			var is_connect = function(data) {

				if (!global.__redis_mode) {
					// store.sessions : express MemoryStore

					var sessions = store.sessions;

					for (var sid in sessions) {
						try { // jeongmin: try catching
							var session = JSON.parse(sessions[sid]);
							var session_auth = session.auth; //jeongmin: access object member less

							if (session_auth && session_auth.loggedIn) {
								//var session_user = session_auth[user.type.toLowerCase()].user;
								var session_uesr = {};

								if (session_user.id == user.id) {
									store.destroy(sid, function() {
										callback(true);
									});
								}
							}
						} catch (e) {
							console.log('connect error:', e);
							callback(false);
						}
					}
				} else {
					var sessionID = req.sessionID;

					//Redis Mode
					// exec('redis-cli KEYS "*" | grep "^sess:"', function (err, stdout, stderr) {
					store.client.keys('*', function(null_obj, stdout) {
						if (stdout && stdout.length > 0) {
							// var sessions = stdout.split("\n");
							var sessions = stdout;
							var evt = new EventEmitter();

							evt.on('get_sessionID', function(evt, i) {
								//jeongmin: access array member less ------- here

								var sessionID = sessions[i];
								var origin_sessionID = (/^sess:/.test(sessionID)) ? sessionID.substring(5) : sessions[i];

								if (sessionID) {
									// sess:[sessionID]

									store.client.get(origin_sessionID, function(null_obj, session) {
										if (session) {
											try { // jeongmin: try catching
												session = JSON.parse(session);

												if (session.id == user.id) {
													io.sockets.sockets[data.client.id].emit("force_disconnect");
													io.sockets.sockets[data.client.id].disconnect();

													store.destroy(origin_sessionID, function() {
														store.client.del('session_' + user.id, function() {
															store.client.del(sessionID, function() {
																callback(true);
															});
														});
													});
												} else {
													evt.emit('get_sessionID', evt, ++i);
												}
											} catch (e) {

												// session is string (is not object)
												//
												store.client.get(session, function(null_obj, inner_session) {
													try {
														inner_session = JSON.parse(inner_session);

														if (inner_session.id == user.id) {
															io.sockets.sockets[data.client.id].emit("force_disconnect");
															io.sockets.sockets[data.client.id].disconnect();

															store.destroy(origin_sessionID, function() {
																store.client.del('session_' + user.id, function() {
																	store.client.del(sessionID, function() {
																		callback(true);
																	});
																});
															});
														} else {
															evt.emit('get_sessionID', evt, ++i);
														}
													} catch (e) {
														console.log('connect error in redis mode:', e);
														callback(false);
													}
												});
											}
										} else {
											evt.emit('get_sessionID', evt, ++i);
										}
									});
								} else {
									callback(true);
								}
							});
							evt.emit('get_sessionID', evt, 0);
						} else {
							callback(true);
						}
					});
					// });
				}
			};

			var is_not_connect = function(data) {
				callback(true);
			};

			this.g_collaboration_chat.is_connected(io, userdata, is_connect, is_not_connect);
		}
	},

	save_preference: function(option, callback) {
		var user = {
			'id': option.id
		};
		var preference = option.preference;

		db.user.update({
			'id': user.id
		}, {
			$set: {
				'preference': preference
			}
		}, null, function(err) {
			if (!err) {
				if (callback) callback(true);
			} else {
				console.log('Save preference Error : ', err);
				if (callback) callback(false);
			}
		});
	},

	load_preference: function(option, callback) {
		var user = {
			'id': option.id
		};

		db.user.findOne({
			'id': user.id
		}, function(err, data) {
			if (!err && data) {
				callback(data.preference);
			} else {
				console.log('Load preference Error : ', err);
				callback(null);
			}
		});
	},

	get_profile: function(id, callback) {
		db.user.findOne({
			'id': id
		}, function(err, data) {
			var src = "";

			if (err) {
				console.log(err);
			}

			if (data && data.image) {
				src = data.image;
			}

			callback(src);
		});
	},

	delete_profile: function(options, callback) {
		var id = options.id;

		db.user.update({
			'id': id
		}, {
			$set: {
				'image': ""
			}
		}, function(err) {
			if (!err) {
				callback(true);
			} else {
				console.log('Delete Profile Image ERR: ' + err);
				callback(false);
			}
		});
	},

	save_profile: function(options, callback) {
		var id = options.id;
		var data = options.data;

		db.user.update({
			'id': id
		}, {
			$set: {
				'image': data
			}
		}, function(err) {
			if (!err) {
				callback(true);
			} else {
				console.log('Upload Profile Image ERR4: ' + err);
				callback(false);
			}
		});
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
							fs.readFile(cropped, function(err, data) {
								if (!err) {
									var uploaded_src = new Buffer(data).toString('base64');

									db.user.update({
										'id': id
									}, {
										$set: {
											'image': uploaded_src
										}
									}, function(err) {
										if (!err) {
											unlink();

											callback(true);
										} else {
											fail('Upload Profile Image ERR4: ' + err);
										}
									});
								} else {
									fail('Upload Profile Image ERR3: ' + err);
								}
							});
						} else {
							fail('Upload Profile Image ERR2: ' + err);
						}
					});
			} else {
				fail('Upload Profile Image ERR1: ' + err);
			}
		});
	},

	get_user_doc: function() {
		return db.user;
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
	
	change_workspace: function(user_id, workspace, callback) {
		db.user.update({
			'id': user_id
		}, {
			$set: {
				'workspace': workspace
			}
		}, function(err) {
			if (!err) {
				callback(true);
			} else {
				console.log('AUTH.MANAGER.JS(change_workspace) Err:', err);
				callback(false);
			}
		});
	},

	get_workspace_users: function(workspace, callback) {
		db.user.find({
			'workspace': workspace
		}, function(err, users) {
			if (!err) {
				callback(users);
			} else {
				console.log('AUTH.MANAGER.JS(get_workspace_users) Err:', err);
				callback([]);
			}
		});
	},

	get_friends: function(user_id, callback) {
		var self = this;

		db.user.findOne({
			'id': user_id
		}, function(err, userdata) {
			if (userdata) {
				// var evt = new EventEmitter();

				var friends = userdata.friends || [];
				var friend_requested = userdata.friend_requested || [];
				var friend_requesting = userdata.friend_requesting || [];

				var friend_list = [];
				var friend_requested_list = [];
				var friend_requesting_list = [];

				var get_friend_data = function(friend_id, callback) {
					db.user.findOne({
						'id': friend_id
					}, function(err, friend_data) {

						// get unread
						//
						self.g_collaboration_chat.get_unread({
							'room': friend_id,
							'user': user_id
						}, function(unread) {
							if (!err && friend_data) {
								friend_data = self.filtering(friend_data);
								friend_data.unread = unread;

								callback(friend_data);
							} else {
								callback(null);
							}
						});
					});
				};

				var g_friend_fn = function(callback) {
					var g = function(friend_id, __callback) {
						get_friend_data(friend_id, function(friend_data) {
							if (friend_data) {
								friend_list.push(friend_data);
							}

							__callback();
						});
					}

					async.map(friends, g, function() {
						callback();
					});
				};

				var g_friend_requested_fn = function(callback) {
					var g = function(friend_id, __callback) {
						get_friend_data(friend_id, function(friend_data) {
							if (friend_data) {
								friend_requested_list.push(friend_data);
							}

							__callback();
						});
					}

					async.map(friend_requested, g, function() {
						callback();
					});
				};

				var g_friend_requesting_fn = function(callback) {
					var g = function(friend_id, __callback) {
						get_friend_data(friend_id, function(friend_data) {
							if (friend_data) {
								friend_requesting_list.push(friend_data);
							}

							__callback();
						});
					}

					async.map(friend_requesting, g, function() {
						callback();
					});
				};

				async.parallel([
					g_friend_fn,
					g_friend_requested_fn,
					g_friend_requesting_fn
				], function() {
					var io = self.g_collaboration.get_io();

					var is_connect = function(data) {
						friend_list = friend_list.map(function(o) {
							if (o.id == data.user.id) {
								o.state = true;
							}

							return o;
						});
					};

					var is_not_connect = function(data) {
						friend_list = friend_list.map(function(o) {
							if (o.id == data.user.id) {
								o.state = false;
							}

							return o;
						});
					};

					self.g_collaboration_chat.is_connected(io, friend_list, is_connect, is_not_connect, function() {
						callback(friend_list, friend_requested_list, friend_requesting_list);
					});
				});

				// evt.on('get_friend_data', function(__evt, i, j, k) {
				// 	var friend_id = friends[i];
				// 	var friend_requested_id = friend_requested[j];
				// 	var friend_requesting_id = friend_requesting[k];

				// 	if (friend_id) {
				// 		get_friend_data(friend_id, function(friend_data) {
				// 			if (friend_data) {
				// 				friend_list.push(friend_data);

				// 				__evt.emit('get_friend_data', __evt, ++i, j, k);
				// 			} else {
				// 				__evt.emit('get_friend_data', __evt, ++i, j, k);
				// 			}
				// 		});
				// 	} else if (friend_requested_id) {
				// 		get_friend_data(friend_requested_id, function(friend_data) {
				// 			if (friend_data) {
				// 				friend_requested_list.push(friend_data);

				// 				__evt.emit('get_friend_data', __evt, i, ++j, k);
				// 			} else {
				// 				__evt.emit('get_friend_data', __evt, i, ++j, k);
				// 			}
				// 		});
				// 	} else if (friend_requesting_id) {
				// 		get_friend_data(friend_requesting_id, function(friend_data) {
				// 			if (friend_data) {
				// 				friend_requesting_list.push(friend_data);

				// 				__evt.emit('get_friend_data', __evt, i, j, ++k);
				// 			} else {
				// 				__evt.emit('get_friend_data', __evt, i, j, ++k);
				// 			}
				// 		});
				// 	} else {
				// 		var io = self.g_collaboration.get_io();

				// 		var is_connect = function(data) {
				// 			friend_list = friend_list.map(function(o) {
				// 				if (o.id == data.user.id) {
				// 					o.state = true;
				// 				}

				// 				return o;
				// 			});
				// 		};

				// 		var is_not_connect = function(data) {
				// 			friend_list = friend_list.map(function(o) {
				// 				if (o.id == data.user.id) {
				// 					o.state = false;
				// 				}

				// 				return o;
				// 			});
				// 		};

				// 		self.g_collaboration_chat.is_connected(io, friend_list, is_connect, is_not_connect, function() {
				// 			callback(friend_list, friend_requested_list, friend_requesting_list);
				// 		});
				// 	}
				// });

				// evt.emit('get_friend_data', evt, 0, 0, 0);
			} else {
				callback(null);
			}
		});
	},

	// user_id --- request ---> friend_id
	//
	add_request_each_other: function(user_id, friend_id, callback) {
		db.user.update({
			'id': user_id
		}, {
			$addToSet: {
				'friend_requesting': friend_id
			}
		}, function(err) {
			if (err) {
				console.log('ADD REQUEST FRIEND ERROR', err);
				callback(false);
			} else {
				db.user.update({
					'id': friend_id
				}, {
					$addToSet: {
						'friend_requested': user_id
					}
				}, function(err) {
					if (err) {
						console.log('ADD REQUEST FRIEND ERROR', err);
						callback(false);
					} else {
						callback(true);
					}
				});
			}
		});
	},

	add_each_other: function(user1, user2, callback) {
		var self = this;

		this.add_friend({
			'user_id': user1,
			'friend_id': user2
		}, function() {
			self.add_friend({
				'user_id': user2,
				'friend_id': user1
			}, function() {
				callback(true);
			});
		});
	},

	del_each_other: function(user1, user2, callback) {
		var self = this;

		this.del_friend({
			'user_id': user1,
			'friend_id': user2
		}, function() {
			self.del_friend({
				'user_id': user2,
				'friend_id': user1
			}, function() {
				callback(true);
			});
		});
	},

	// user_id / friend_id
	//
	is_friend: function(option, callback) {
		var user_id = option.user_id;
		var friend_id = option.friend_id;

		db.user.findOne({
			'id': user_id,
			'friends': {
				$in: [friend_id]
			}
		}, function(err, user) {
			if (err) {
				console.log('is_friend', err);
			}

			if (user) {
				callback(user);
			} else {
				callback(null);
			}
		});
	},

	add_friend: function(option, callback) {
		var user_id = option.user_id;
		var friend_id = option.friend_id;

		db.user.update({
			'id': user_id
		}, {
			$addToSet: {
				'friends': friend_id
			},
			$pull: {
				'friend_requested': friend_id,
				'friend_requesting': friend_id
			}
		}, function(err) {
			if (err) {
				console.log('ADD FRIEND ERROR', err);
				callback(false);
			} else {
				callback(true);
			}
		});
	},

	reject_friend: function(user_id, friend_id, callback) {
		db.user.update({
			'id': user_id
		}, {
			$pull: {
				'friend_requested': friend_id
			}
		}, function(err) {
			if (err) {
				console.log('ADD REQUEST FRIEND ERROR', err);
				callback(false);
			} else {
				db.user.update({
					'id': friend_id
				}, {
					$pull: {
						'friend_requesting': user_id
					}
				}, function(err) {
					if (err) {
						console.log('ADD REQUEST FRIEND ERROR', err);
						callback(false);
					} else {
						callback(true);
					}
				});
			}
		});
	},

	cancel_friend: function(user_id, friend_id, callback) {
		db.user.update({
			'id': user_id
		}, {
			$pull: {
				'friend_requesting': friend_id
			}
		}, function(err) {
			if (err) {
				console.log('ADD REQUEST FRIEND ERROR', err);
				callback(false);
			} else {
				db.user.update({
					'id': friend_id
				}, {
					$pull: {
						'friend_requested': user_id
					}
				}, function(err) {
					if (err) {
						console.log('ADD REQUEST FRIEND ERROR', err);
						callback(false);
					} else {
						callback(true);
					}
				});
			}
		});
	},

	del_friend: function(option, callback) {
		var user_id = option.user_id;
		var friend_id = option.friend_id;

		db.user.update({
			'id': user_id
		}, {
			$pull: {
				'friends': friend_id
			}
		}, function(err) {
			if (err) {
				console.log('ADD FRIEND ERROR', err);
				callback(false);
			} else {
				callback(true);
			}
		});
	},

	get_friend_list: function(options, callback) {
		var user_id = options.user_id;
		var query = options.query;

		var length = (options.length && options.length !== "") ? parseInt(options.length, 10) : 0;
		var seed = (options.seed >= 0) ? options.seed : -1;
		var limit = 3;

		db.user.findOne({
			'id': user_id
		}, function(err, user_data) {
			var idx_array = [];
			var find_query = {
				$nor: []
			};

			var set = function(list) {
				if (list && list.length > 0) {
					for (var i = 0; i < list.length; i++) {
						var t = list[i];

						if (idx_array.indexOf(t) === -1) {
							find_query['$nor'].push({
								'id': t
							});

							idx_array.push(t);
						}
					}
				}
			};

			set(user_data.friends);
			set(user_data.friend_requesting);
			set(user_data.friend_requested);

			find_query['$nor'].push({
				'id': user_id
			});

			if (query === "") {
				db.user.find(find_query).count(function(err, n) {
					var end = false;

					if (n <= length) {
						end = true;
						callback([], end, seed);
					} else {
						var get_random = function(n) {
							var skip = (n - limit < 0) ? 0 : n - limit; // 20 users --> 0 ~ 10 is ok, 11 ~ 20 x
							var r = Math.floor(Math.random() * n);

							if (skip === 0) r = 0;
							else {
								while (skip < r) {
									r = Math.floor(Math.random() * n);
								}
							}

							return r;
						};

						var r = (seed >= 0) ? seed : get_random(n);
						var skip = r + length;

						if (skip >= n) {
							skip = skip - n;
						}

						db.user.find(find_query).limit(limit).skip(skip).exec(function(err, user_list) {
							if (!err) {
								callback(user_list, end, r);
							} else {
								console.log('AUTH.MANAGER.JS ERR: ', err);
								callback([], end, seed);
							}
						});
					}
				});
			} else {
				var keyword_find_query = {
					$or: [{
						'id': {
							$regex: query,
							$options: 'g'
						}
					}, {
						'name': {
							$regex: query,
							$options: 'g'
						}
					}, {
						'nick': {
							$regex: query,
							$options: 'g'
						}
					}, {
						'email': {
							$regex: query,
							$options: 'g'
						}
					}],
					$nor: find_query['$nor']
				};

				db.user.find(keyword_find_query).count(function(err, n) {
					var end = false;

					if (n <= length) {
						end = true;
						callback([], end, seed);
					} else {
						db.user.find(keyword_find_query).limit(limit).skip(length).sort({
							'id': -1
						}).exec(function(err, user_list) {
							if (!err) {
								// if (user_list.length == 0) end = true;
								callback(user_list, end, seed);
							} else {
								console.log('AUTH.MANAGER.JS ERR: ', err);
								callback([], end, seed);
							}
						});
					}
				});
			}
		});
	}
};