/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.terminal.message = function () {

};

goorm.core.terminal.message.prototype = {

	m: function (text, from) {
		var header = "[MSG] ";
		var color = "black";

		$("#terminal").prepend(this.make_message(header, color, text, from));
	},

	make_message: function (header, color, text, from) {
		var message = "<font color=" + color + ">";
		message += header + ": ";
		message += text;
		message += "</font>";
		message += "<font color='gray'>";
		message += " (from " + from + ")";
		message += "</font>";
		message += "<br>";

		return message;
	},

	clean: function () {
		$("#terminal").html("");
	}
};
