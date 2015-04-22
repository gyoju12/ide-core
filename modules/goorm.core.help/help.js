/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var user_comments_schema = {
	user_id: String,
	name: String,
	email: String,
	category: String,
	where: String,
	date: String,
	checked: Boolean,
	msg: String,
	send_msg: String,
	title: String,
	version: String
};

var db = {
	'user_comments': mongoose.model('user_comments', new Schema(user_comments_schema))
};

var http = require('http');
var fs = require("fs");
var querystring = require('querystring');

var g_log = require('../goorm.core.log/log');

module.exports = {
	send_to_bug_report: function (query, evt) {
		var return_data = {};
		return_data.err_code = 0;
		return_data.message = "Process Done";

		/**
		 *  PUSH TO DB
		 */
		var snapshot = new db.user_comments({
			'user_id': query.id,
			'email': query.email,
			'category': query.category || "questions",
			'where': IDE_HOST,
			'date': new Date(),
			'checked': false,
			'title': query.title,
			'version': build_version,
			'msg': query.explanation
		});

		snapshot.save(function (err) {
			if (err) {
				console.log('help.js:send_to_bug_report fail', err);
			}
		});

		/**
		 *  SEND TO EMAIL
		 */
		g_log.report({
			'mail_options': {
				from: query.email, // sender address
				to: "contact@goorm.io", // list of receivers
				subject: query.title, // Subject line
				text: query.explanation // plaintext body
			}
		});

		evt.emit("help_send_to_bug_report", return_data);
	},

	get_readme_markdown: function (language, filename, filepath) {
		var input;
		var markdownpath = (filepath === undefined) ? global.__path : global.__path + filepath;

		/* file name
			README
			NODEJS_MANUAL
			EXAMPLE_TUTORIAL
		*/
		if (!filename) filename = 'README';

		if (language == "kor") {
			input = fs.readFileSync(markdownpath + filename + '_KO.html', 'utf8');
		} else {
			input = fs.readFileSync(markdownpath + filename + '.html', 'utf8');
		}
		// var output = require("markdown").markdown.toHTML(input);

		return {
			html: input
		};
	},

	
};
