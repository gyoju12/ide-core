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
	list: {}, // loading bar's progress bar list
	count: 0, // number of progress bars
	template: '<div id="progress_wrapper" class="progress_wrapper">\
					<dt id="progress_title"></dt>\
						<div class="progress">\
							<div id="progress_bar" class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style="width: 0%">\
							</div>\
							<button id="progress_kill" class="close" aria-hidden="true">&times;</button>\
						</div>\
					<div id="progress_contents"></div>\
				</div>', // progress bar template

	// bind loading bar events. Jeong-Min Im.
	init: function() {
		var self = this;

		this.panel = $('#dlg_loading_bar'); // loading bar dialog
		this.goorm_progress_bar = $('#goorm_progress_bar'); // progress bar in bottom status bar

		this.panel.on("show.bs.modal", function() { // jeongmin: event should be binded to only one element, not .modal
			$(this).css('display', 'block');
			var $dialog = $(this).find(".modal-dialog");
			var offset_height = (($(window).height() - $dialog.height()) / 2);
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			$(this).css("top", offset_height - 30).css("left", offset_width);
		});
		// enable key event on dialogs. Jeong-Min Im.
		this.panel.on('hidden.bs.modal', function() {
			$('.modal.in').focus();

			// fix deleting project
			if ($('#dlg_delete_project').attr('class').indexOf('in') >= 0) {
				$("#project_delete_list").focus();
			}
		});

		// hide loading bar dialog and change it to progress bar in bottom status bar. Jeong-Min Im.
		$("#g_lb_btn_hide").click(function() {
			var now = self.panel.find(".progress-bar").attr("aria-valuenow"); // get current loading bar progress percentage

			self.hide(now);
			self.goorm_progress_bar.css('cursor', 'pointer'); //show it as clickable	
		});
		// process is done and hide loading bar. Jeong-Min Im.
		$("#g_lb_btn_ok").click(function() {
			self.hide();
		});
		// restore loading bar. Jeong-Min Im.
		this.goorm_progress_bar.click(function() {
			core.progressbar.set(100); // progress bar to loading bar

			self.show();
		});
	},

	// add new progress bar and show loading bar. Jeong-Min Im.
	// option = {
	// 	now: current progress percentage
	// 	kill: cancel current loading
	// 	str: loading message(means current process)
	// }
	// return: progress bar elements. For getting logs, progress percentage...
	start: function(option) {
		var self = this;
		var wrapper = 'progress_wrapper_' + this.count;
		var title = 'progress_title_' + this.count;
		var bar = 'progress_bar_' + this.count;
		var kill = 'progress_kill_' + this.count;
		var contents = 'progress_contents_' + this.count;

		option = option || {};

		// count
		this.list[this.count] = option;
		this.count++;

		// make progress bar using template and add to loading bar
		this.panel.find('.row').append(this.template.replace('progress_wrapper', wrapper)
			.replace('progress_title', title)
			.replace('progress_bar', bar)
			.replace('progress_kill', kill)
			.replace('progress_contents', contents));

		// set options
		$('#modal_loading_bar').html(core.module.localization.msg.please_wait);
		$('#' + title).html(option.str || core.module.localization.msg.please_wait);
		core.progressbar.set(option.now || 99.9, '#' + bar);

		// bind kill event
		var kill_button = $("#" + kill);
		if (option.kill) {
			kill_button.show();

			kill_button.click(function() {
				var num = $(this).attr('id').split('_').pop(); // extract process that will be killed

				self.list[num].kill(); // execute kill function
				self.stop('#progress_wrapper_' + num); // stop this progress
			});
		} else {
			kill_button.hide();
		}

		$("#g_lb_btn_hide").show(); // hide is default
		$('#g_lb_btn_ok').hide(); // ok button is for done loading bar
		this.goorm_progress_bar.css('cursor', ''); // loading bar is showing, so set goorm progress bar non-clickable

		$.debounce(function() { // jeongmin: continuous dialog showing makes error. So give some delay
			self.panel.modal('show');
		}, 100)();

		return {
			wrapper: '#' + wrapper,
			title: '#' + title,
			bar: '#' + bar,
			kill: "#" + kill,
			contents: '#' + contents,
			stop: function() { // stops 'this' progress
				self.stop(this.wrapper); // this -> returned object
			}
		};
	},

	// remove progress bar. Jeong-Min Im.
	// wrapper: progress bar's wrapper
	stop: function(wrapper) {
		if (Object.keys(this.list).length == 1) { // last one
			if (this.panel.hasClass("in")) { // loading bar is showing now, so no need to show it again -> just stop
				this.hide();
			} else { // in progressbar.. notice user that progress is done
				this.panel.find('.close').hide(); // cancel shouldn't be clicked by user after process is done. (cancel another process that has same PID as this process)
				$('#g_lb_btn_ok').show();

				// process done
				this.show({
					str: core.module.localization.msg.notice_process_done,
					now: 100,
					lock: true
				});
			}

			// initialize
			this.panel.find('.progress_wrapper').remove();
			this.list = {};
			this.count = 0; // nothing left. Last one is stopped
		} else if (wrapper) {
			var num = wrapper.split('_').pop(); // find out which progress is done

			delete this.list[num]; // delete it from progress bars list
			$(wrapper).remove();
		}
	},

	// show loading bar dialog. Jeong-Min Im.
	// option = {
	// 	lock: forbids hiding loading bar
	// 	str: loading message(means current process)
	// }
	show: function(option) {
		if (option) {
			if (option.str) {
				$('#modal_loading_bar').html(option.str);
			}

			if (option.lock) {
				$("#g_lb_btn_hide").hide();
			}
		}

		this.goorm_progress_bar.css('cursor', ''); // loading bar is showing, so set goorm progress bar non-clickable
		this.panel.modal('show');
	},

	// loading bar will be hidden into goorm progress bar on bottom status bar. Jeong-Min Im.
	hide: function(now) {
		this.panel.modal('hide');

		core.progressbar.set(now || 100, "#loading_progress_bar");
		core.progressbar.set(now || 100); // loading bar hide to progress bar in bottom
	}
};