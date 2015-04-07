/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

var regexp_filter = /^([가-힣0-9a-zA-Z \\\/._-{-}\[\]\(\)\/\/]|\:)*/g // jeongmin: add '/'. Add ' ' (Some commands have blanks). Add '{-}' for svn update by date({2014-01-01}).

module.exports = {
	filepath_filter: function(_str) {
		var str = _str || '';

		return str.replace(/([\.\ \(\)\[\]])/g, '\\$1');
	},

	command_filter: function(str) {
		// if (str.indexOf('rm ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('chmod ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('chown ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('userdel ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('cp ') > -1) {
		// 	str = '';
		// }
		// else if (str.indexOf('mv ') > -1) {
		// 	str = '';
		// }
		// else {
		// 	str = str.split(';')[0].split('&&')[0].split('||')[0];
		// }

		if (str) {
			str = str.match(regexp_filter).toString().split('..').join('');
		} else {
			console.log('SECURE.JS WARNING: ', str);
		}

		return str;
	}
}
// console.log(command_filter('../*/test.txt test'));
