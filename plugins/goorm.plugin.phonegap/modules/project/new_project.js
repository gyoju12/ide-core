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
	// common = require(global.__path + "plugins/goorm.plugin.phonegap/modules/common.js");

var exec = require('child_process').exec;

module.exports = {
	do_new : function(req, evt) {
		var self = this;
		// var workspace = global.__workspace + "/" + req.data.project_author + "_" + req.data.project_name;
		var workspace = global.__workspace + "/" + req.data.project_dir;

		

		

		// Delete All files in new directory And Create phonegap
		fs.readFile(workspace+"/goorm.manifest", 'utf-8', function (err, file_data) {
			var contents = JSON.parse(file_data || "{}");
			contents.plugins = req.data.plugins;
			contents.building_after_save_option = true;
			exec("phonegap create " + workspace + "/temp", function (_err, _stdout, _stderr) {
				if (!err) {
					exec("mv " + workspace + "/temp/* " + workspace + "; rm -rf " + workspace + "/temp", function (__err, __stdout, __stderr) {
						
						if (__err) {
							evt.emit("do_new_complete", {
								code: 200,
								message: "success"
							});
						}
					});
				}
			});


			// exec("rm -rf " + workspace + "/*; phonegap create " + workspace + "/", function (err, stdout, stderr) {
			// 	fs.writeFile(workspace + "/goorm.manifest", JSON.stringify(contents), 'utf-8', function (err) {
			// 		
			// 		if (err === null) {
			// 			evt.emit("do_new_complete", {
			// 				code : 200,
			// 				message : "success"
			// 			});
			// 		}
			// 	});
			// });
		});
	}
};
