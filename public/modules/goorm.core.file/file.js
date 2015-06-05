/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.file = {
	name_regex: /[^a-zA-Z0-9_\ \-\.\(\)\[\]]/g, // g is needed for show wrong character

	filter: function(_str) {
		var str = _str || '';

		return str.replace(/([\.\ \(\)\[\]])/g, '\\$1');
	},

	get_regex: function() {
		return this.name_regex;
	},

	test: function(str, _regex) {
		var regex = _regex || this.name_regex;

		return str.match(regex); // if valid, return null, if invalid, return invalid text
	}
};
