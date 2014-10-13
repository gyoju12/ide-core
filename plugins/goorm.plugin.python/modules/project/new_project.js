/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


// var fs = require('fs'),
	// walk = require('walk'),
var emitter,
	common = require(global.__path + "plugins/goorm.plugin.python/modules/common.js");

var exec = require('child_process').exec;

module.exports = {
	do_new : function(req, evt) {
		var workspace = global.__workspace + "/" + req.data.project_dir;
		var template = common.path + "template";

		
		
		exec('cp -r '+template+'/* '+workspace, function(__err){
			evt.emit("do_new_complete", {
				code : 200,
				message : "success"
			});

			
		});
	}
};