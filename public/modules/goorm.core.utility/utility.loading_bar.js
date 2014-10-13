/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.utility.loading_bar = {
	loading_bar: null,
	// counter: 0,

	init: function() {
		var self = this;

		this.panel = $('#dlg_loading_bar');
		this.$goorm_progress_bar = $('#goorm_progress_bar');
		// this.panel.on('hide.bs.modal', function(){
		// 	self.counter--;
		// 	if (self.counter != 0) return false;
		// });

		this.count = 0;

		////// loading bar buttons - hide/cancel. Jeong-Min Im. //////
		$("#g_lb_btn_hide").click(function() {
			var now = self.panel.find(".progress-bar").attr("aria-valuenow"); //get current progress percentage

			self.panel.modal('hide');

			core.progressbar.set(now); // change to progressbar
		});
		$("#g_lb_btn_cancel").click(function() {
			self.kill();
			self.stop();
			self.kill = null; // jeongmin: initialize
		});

		////// show loading bar //////
		this.$goorm_progress_bar.click(function() {
			if (self.is_start) //only when current loading is in progress
				self.show();
		});

		// enable key event on dialogs. Jeong-Min Im.
		this.panel.on('hidden.bs.modal', function() {
			$('.modal.in').focus();

			//fix deleting project
			if ($('#dlg_delete_project').attr('class').indexOf('in') >= 0)
				$("#project_delete_list").focus();
		});

		// this.panel.on("show.bs.modal", function (){	//jeongmin: done at dialog.js
		// 	setTimeout(function () {
		// 		self.panel.css('top', '0px');

		// 		var container = self.panel.find('.modal-dialog');

		// 		var window_height = $(window).height();
		// 		var container_height = container.height();

		// 		if (window_height > container_height) {
		// 			container.css('margin-top', ((window_height-container_height)/2) + 'px');
		// 		}
		// 		else {
		// 			container.css('margin-top', '10px');
		// 		}			
		// 	}, 200); // fade animation: 0.15s -> 150
		// });
	},

	start: function(str, callback, now, lock) { //str: message, now: progress start percentage, callback: kill process
		if (!now)
			now = 99.9; //default

		// this.loading_bar.setHeader(str);
		// this.loading_bar.show();
		// this.counter++;
		this.kill = callback;

		this.show(str, now, lock);
	},

	// show loading bar. Jeong-Min Im.
	show: function(str, now, lock) { // jeongmin: 'lock' forbids hiding loading bar
		var self = this;

		// jeongmin: prevent overlapping two continuous loading bar
		if (this.panel.css('display') == 'block') {
			if (this.count == 10) {	// jeongmin: too much waiting
				this.stop();
			} else {
				var temp = $.debounce(function() { // jeongmin: delay following loading bar
					self.show(str, now, lock);
				}, 350);

				this.count++;

				temp();
			}
		} else { // jeongmin: go on
			this.is_start = true; //now loading
			this.$goorm_progress_bar.css('cursor', 'pointer'); //show it as clickable	

			////// give some information //////
			if (str)
				$("#modal_loading_bar").html(str);
			if (now)
				core.progressbar.set(now, "#loading_progress_bar");

			////// enable hiding or not //////
			if (lock)
				$("#g_lb_btn_hide").hide();
			else
				$("#g_lb_btn_hide").show();

			////// enable cancel or not //////
			if (this.kill)
				$("#g_lb_btn_cancel").show();
			else
				$("#g_lb_btn_cancel").hide();

			this.panel.modal('show');
		}
	},

	stop: function() {
		// this.counter--;
		// if (this.counter === 0) {
		this.panel.modal('hide');
		core.progressbar.set(100);
		this.is_start = false; //loading is done
		this.$goorm_progress_bar.css('cursor', ''); //show it as non-clickable
		// this.loading_bar.hide();
		// 	}

		this.count = 0;	// jeongmin: initialize
	},

	change: function(str) {
		if (str)
			$("#modal_loading_bar").html(str);
	},

	// notice user done message. Jeong-Min Im.
	done: function(str) { //str: message
		if (this.panel.hasClass("in")) //loading bar
			this.stop();
		else { //in progressbar.. notice user that progress is done
			core.progressbar.set(100);
			this.is_start = false;

			$("#g_lb_btn_cancel").hide(); // cancel shouldn't be clicked by user after process is done. (cancel another process that has same PID as this process)

			this.show(str, 100);
		}
	}
};