/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/
 
goorm.core.terminal.dummy = function() {
	var set_dummy = function(){
		$("#terminal_dummy").css("font-size", parseInt(core.preference["preference.terminal.font_size"], 10) )
			.css("line-height", core.preference["preference.terminal.line_spacing"] / 10 + 1)
			.css("color", core.preference["preference.terminal.font_color"])
			.css("font-family", core.preference["preference.terminal.font_family"]);
	};	

	$(core).on("on_preference_confirmed", function() { // 
		set_dummy();
	});
	set_dummy();



};

