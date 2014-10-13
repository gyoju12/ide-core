/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


var common = require(global.__path+"plugins/goorm.plugin.python/modules/common.js");
var EventEmitter = require("events").EventEmitter

module.exports = {
	do_new: function(req, res) {
		var evt = new EventEmitter();
		var new_project = require(common.path+"modules/project/new_project.js");
		/* req.data = 
		   { 
			project_type,
			project_detailed_type,
			project_author,
			project_name,
			project_desc,
			use_collaboration
		   }
		*/
		
		evt.on("do_new_complete", function (data) {
			res.json(data);
		});
		
		new_project.do_new(req, evt);
	},

	emit: function (io, msg) {
		if(msg.channel == "list_up"){
			var exec = require('child_process').exec;
			var evt = new EventEmitter();
			var compiler_list = [];
			evt.on('get_compiler_type', function (evt, i){
				var type = msg.test_data[i];
				if(type){
					exec(type + " --version", function(err, stdout, stderr){
						if(err != null){
							console.log("compiler_type error : server does not have " + type);
						}else{
							compiler_list.push(type);
						}
						evt.emit('get_compiler_type', evt, ++i);
					});
				}else{
					msg.socket.to().emit('python_compiler_list_up', compiler_list);
				}
			});
			evt.emit('get_compiler_type', evt, 0);
		}
	},
};