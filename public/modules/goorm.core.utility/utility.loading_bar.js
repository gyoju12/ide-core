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
	queue: [],

	init: function() {
		var self = this;

		this.panel = $('#dlg_loading_bar'); // loading bar dialog
		this.goorm_progress_bar = $('#goorm_progress_bar'); // progress bar in bottom status bar

		// hide loading bar dialog and change it to progress bar in bottom status bar. Jeong-Min Im.
		$("#g_lb_btn_hide").click(function() {
			var now = self.panel.find(".progress-bar").attr("aria-valuenow"); // get current loading bar progress percentage

			self.hide(now);
			self.goorm_progress_bar.css('cursor', 'pointer'); //show it as clickable	
		});

		// cancel current process. Jeong-Min Im.
		$("#g_lb_btn_cancel").click(function() {
			self.queue[0].kill();

			self.done();
		});

		// process is done and hide loading bar. Jeong-Min Im.
		$("#g_lb_btn_ok").click(function() {
			self.hide();
		});

		// restore loading bar. Jeong-Min Im.
		this.goorm_progress_bar.click(function() {
			core.progressbar.set(100); // progress bar to loading bar

			self.queue[0] && self.show(self.queue[0]); // only when there is loading process
		});

		// enable key event on dialogs. Jeong-Min Im.
		this.panel.on('hidden.bs.modal', function() {
			$('.modal.in').focus();

			// fix deleting project
			if ($('#dlg_delete_project').attr('class').indexOf('in') >= 0) {
				$("#project_delete_list").focus();
			}
		});
	},

	// used internally for showing loading bar. Jeong-Min Im.
	// option = {
	// 	now: current progress percentage
	// 	lock: forbids hiding loading bar
	// 	kill: cancel current loading
	// 	str: loading message(means current process)
	// }
	show: function(option) { // str: loading/done message
		var self = this;

		// set options for loading bar
		$("#modal_loading_bar").html(option.str || core.module.localization.msg.please_wait); // current process
		core.progressbar.set(option.now || 99.9, "#loading_progress_bar");
		option.lock ? $("#g_lb_btn_hide").hide() : $("#g_lb_btn_hide").show();
		option.kill ? $("#g_lb_btn_cancel").show() : $("#g_lb_btn_cancel").hide();

		this.goorm_progress_bar.css('cursor', ''); // loading bar is showing, so set goorm progress bar non-clickable
		this.panel.modal('show');
	},

	// used internally for hiding loading bar. Jeong-Min Im.
	hide: function(now) { // now: current progress percentage
		this.panel.modal('hide');
		core.progressbar.set(now || 100); // loading bar hide to progress bar in bottom
	},

	// loading bar should be started by this function. Jeong-Min Im.
	// option = {
	// 	now: current progress percentage
	// 	lock: forbids hiding loading bar
	// 	kill: cancel current loading
	// 	str: loading message(means current process)
	// }
	start: function(option) {
		var self = this;

		option = option || {};

		this.queue.push(option);

		$('#g_lb_btn_ok').hide(); // ok button is for done loading bar

		if (this.panel.css('display') == 'block') { // wait
			var temp = $.debounce(function() { // jeongmin: delay following loading bar
				if (self.queue[0]) {
					self.show(self.queue[0]); // go on next
				}
			}, 300);

			temp();
		} else { // go on
			this.show(option);
		}
	},

	// loading bar should be stopped by this function. Jeong-Min Im.
	stop: function() {
		this.queue.shift();

		if (this.queue.length > 0) { // still queue remains
			this.show(this.queue[0]); // go on next
		} else { // all queue item is done
			if (this.panel.hasClass("in")) { // loading bar is showing now, so no need to show it again -> just stop
				this.hide();
			} else { // in progressbar.. notice user that progress is done
				$("#g_lb_btn_cancel").hide(); // cancel shouldn't be clicked by user after process is done. (cancel another process that has same PID as this process)
				$('#g_lb_btn_ok').show();

				this.show({
					str: core.module.localization.msg.notice_process_done,
					now: 100,
					lock: true
				});
			}
		}
	},

	// change current process message when continuous loading
	// option = {
	// 	now: current progress percentage
	// 	lock: forbids hiding loading bar
	// 	kill: cancel current loading
	// 	str: loading message(means current process)
	// }
	change: function(option) {
		this.show(option);
	}
};