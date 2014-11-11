/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var http = require('http');
var fs = require("fs");
var querystring = require('querystring');

module.exports = {
	send_to_bug_report: function (query, evt) {
		var return_data = {};
		return_data.err_code = 0;
		return_data.message = "Process Done";

		var ori_data = {};
		ori_data.id = query.id;
		ori_data.subject = query.title;
		ori_data.email = query.email;
		ori_data.version = query.version;
		ori_data.content = query.explanation;

		var post_data = querystring.stringify(ori_data);
		var post_options = {
			host: 'goorm.io',
			port: '3000',
			path: '/user_comments/add',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': post_data.length
			}
		};

		var post_req = http.request(post_options, function (res) {
			res.setEncoding('utf8');

			var data = "";

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				evt.emit("help_send_to_bug_report", return_data);
			});
		});

		post_req.on('error', function (e) {});

		post_req.write(post_data);
		post_req.end();
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
