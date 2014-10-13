/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.preference.language = {
	preference: null,

	init: function () {

		var language = "";
		$('[id="preference.language.select"]').change(function(){
			var selected = $(this).find(':selected').val();

			core.module.localization.change_language(selected, true, true);
		});


		if (localStorage.getItem("language") === null) {
			if (core.server_language == "client") {
				if (navigator.language == "ko") {
					language = "kor";
				} else {
					language = "us";
				}
			} else {
				language = core.server_language;
			}

			core.module.localization.change_language(language);
		} else {
			core.module.localization.change_language(localStorage.getItem("language"));
		}
	}
};
