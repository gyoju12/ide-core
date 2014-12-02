/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


var common = require(global.__path+"plugins/goorm.plugin.java/modules/common.js");
var EventEmitter = require("events").EventEmitter

module.exports = {
	make_template: function(req, res) {
		var evt = new EventEmitter();
		var make_template = require(common.path+"modules/project/new_template.js");

		
		evt.on("make_template_complete", function (data) {
			res.json(data);
		});
		

		
		
		make_template.make_template(req, evt);
	}
};