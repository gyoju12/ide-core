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

	get_private_url_markdown: function (language, filename, filepath) {
		// var input;
		// var markdownpath = (filepath === undefined) ? global.__path : global.__path + filepath;

		// var input_ko = '<h1>Private URL & Private Ports</h1>
		//                 <p>이 메뉴얼은 사용자가 PHP/JSP/Node.js을 통하여 자신만의 웹 서버를 구축하여 어떻게 접근하는지에 대해여 적혀있습니다.</p>
		//                 <div id="private_url">
		//                     <h2>Private URL</h2>
		//                     <p><Private URL은 다음과 같은 구조를 갖습니다.</p>
		//                     <p><strong>http://[USER_ID].run.goorm.codes/</strong></p>
		//                     <p>Private URL은 자신의 홈과 연결되어 있으며, 80은 Apache가 8080은 Tomcat이 붙어있습니다.</p>
		//                     <p>예를 들어, goorm_jsp_project 밑에 index.jsp의 내용을 띄우고 싶다면,</p>
		//                     <p>http://[USER_ID].run.goorm.codes:8080/goorm_jsp_project/index.php와 같이 접근할 수 있습니다.</p>
		//                 </div>
		//                 <div id="private_ports">
		//                     <h2>Private Ports</h2>
		//                     <p>Private Ports는 유저가 자유롭게 쓸 수 있는 Port들입니다.</p>
		//                     <p>유저의 Private Ports는 <strong id="private_ports_1" class="private_ports">12345</strong> / 
		//                     <strong id="private_ports_2" class="private_ports">4223</strong> / 
		//                     <strong id="private_ports_3" class="private_ports">5555</strong>입니다.</p>
		//                     <p>예를 들어, Node.js을 통하여 웹 서버를 구축하고 Port 12345를 주어 실행하였다면,</p>
		//                     <p>[USER_ID].run.goorm.codes:12345로 접근하시면 됩니다.</p>
		//                 </div>'

  //       var input_en = '<h1>Private URL & Private Ports</h1>
	 //        			<p>This manual contains how to run your own server using goormIDE, and how to connect the server on the browser.</p>
		// 				<div id="private_url">
	 //                    	<h2>Private URL</h2>

		// 				<p>Private URL is connected to your server, port 80 is to Apache, 8080 is to Tomcat basically.
		// 				<p>For instance, if you want to see index.jsp in goorm_jsp_project directory on your browser, 
		// 				you can reach it by using following url: http://[USER_ID].run.goorm.codes:8080/goorm_jsp_project/index.php

		// 				<div id="private_ports">
		// 					<h2>Private Ports</h2>
		// 					<p>Private Ports are the ports that users can use freely.
		// 					<p>Your Private Ports are here : <strong id="private_ports_1" class="private_ports">12345</strong> / 
		// 					<strong id="private_ports_2" class="private_ports">4223</strong> / 
		// 					<strong id="private_ports_3" class="private_ports">5555</strong>
		// 				</div>'

		// /* file name
		// 	README
		// 	NODEJS_MANUAL
		// 	EXAMPLE_TUTORIAL
		// */
		// if (!filename) filename = 'PRIVATE_URL';

		// if (language == "kor") {
		// 	input = input_ko;
		// } else {
		// 	input = input_en;
		// }
		// // var output = require("markdown").markdown.toHTML(input);

		// return {
		// 	html: input
		// };
	}
};
