/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


var fs = require('fs'),
	// walk = require('walk'),
	emitter;
var common = require(global.__path + "plugins/goorm.plugin.go/modules/common.js");

var exec = require('child_process').exec;

module.exports = {
copyFileSync : function(srcFile, destFile) {
	  BUF_LENGTH = 64*1024;
	  buff = new Buffer(BUF_LENGTH);
	  fdr = fs.openSync(srcFile, 'r');
	  fdw = fs.openSync(destFile, 'w');
	  bytesRead = 1;
	  pos = 0;
	  while (bytesRead > 0) {
	    bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
	    fs.writeSync(fdw,buff,0,bytesRead);
	    pos += bytesRead;
	  }
	  fs.closeSync(fdr);
	  fs.closeSync(fdw);
	},
	do_new : function(req, evt) {
		var self = this;
		var workspace = global.__workspace + "/" + req.data.project_dir;
		var template = common.path + "template";

		

		if(req.data.project_detailed_type) {
			template += "/"+req.data.project_detailed_type;
		}
		
		exec('cp -r '+template+'/* '+workspace, function(__err){
			fs.readFile(workspace+"/goorm.manifest", 'utf-8', function (err, file_data) {
				var contents = JSON.parse(file_data);
				contents.plugins = req.data.plugins;
				contents.detailedtype = req.data.project_detailed_type;
				fs.writeFile(workspace+"/goorm.manifest", JSON.stringify(contents), 'utf-8', function (err) {
					if (err==null) {
						evt.emit("do_new_complete", {
							code : 200,
							message : "success"
						});
					}
				});
			});
		});

	}
};