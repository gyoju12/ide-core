/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

//jeongmin: for go to line toolbar
goorm.core.edit.toolbar = {
	edit_toolbar: null,	//edit_toolbar input-group
	input_box: null,	//edit_toolbar input box
	ok_button: null,	//edit_toolbar button
	select_option: null,	//selected edit option
	execute_option: null,	//the option that will be executed

	//initialize toolbar. Bring input-group. Jeong-Min Im.
	init: function () {
		var self = this;

		this.edit_toolbar = $("#edit_toolbar");	//get edit_toolbar
		this.input_box = $("#edit_toolbar_inputbox");	//get inputbox
		this.ok_button = $("#edit_toolbar_ok");	//get edit_toolbar_ok
		this.select_option = $(this.edit_toolbar).find("select");	//get select box

		this.select_option.change(function () {	//set button text in line with the option value <- the toolbar has been shown, and then when select option is changed
			if(self.select_option.val() == "Go to Line") {	//if option value is go_to_line
				self.ok_button.html("Go");	//set button text as Go.
				self.execute_option = goorm.core.edit.go_to_line;	//get go to line
			}

			if(self.execute_option.show()) {	//show function in edit.option.js
				self.execute_option.success();	//bind edit option's keydown event. And no need to show toolbar at this time.
			}
		});

		//loses focus, hide it. Jeong-Min Im.
		this.input_box.blur(function () {
			self.edit_toolbar.toggleClass("hidden");	//hide toolbar
		});
	},

	//show toolbar and set edit option. Jeong-Min Im.
	option: function (select) {	//selected edit option
		if(select == "go_to_line") {
			this.ok_button.html("Go");	//set button text
			this.select_option.val("Go to Line");	//set select box
			this.execute_option = goorm.core.edit.go_to_line;	//get go to line			
		}	

		if(this.execute_option.show()) {	//show function in edit.option.js
			this.execute_option.success();	//bind edit option's keydown event
			this.edit_toolbar.toggleClass("hidden");	//if no error, show toolbar				
			this.input_box.focus();	//move cursor to the input box
		}
	}
};