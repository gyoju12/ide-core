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
	unique: [], //if progress has unique, compare with it. if in here, ignore start
	count: 0, // number of progress bars
	template: '<div id="progress_wrapper" class="progress_wrapper" fingerprint="_fingerprint">' +
		'<div id="progress_title" class="row text-muted"></div>' +
		'<div class="progress">' +
		'<div id="progress_bar" class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" style="width: 0%">' +
		'</div>' +
		'<button id="progress_kill" class="close" aria-hidden="true">&times;</button>' +
		'</div>' +
		'<div id="progress_contents"></div>' +
		'</div>', // progress bar template
	is_hide: false, // is hide called before shown
	try_to_show: false, // someone tries to show modal
	status_hide: false,

	// bind loading bar events. Jeong-Min Im.
	init: function() {
		var self = this;

		this.panel = $('#dlg_loading_bar'); // loading bar dialog
		this.goorm_progress_bar = $('#goorm_progress_bar'); // progress bar in bottom status bar

		this.panel.on('show.bs.modal', function() { // jeongmin: event should be binded to only one element, not .modal
			$(this).css('display', 'block');
			var $dialog = $(this).find('.modal-dialog');
			$dialog.width(336);
			var offset_height = (($(window).height() - $dialog.height()) / 2);
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			$(this).css('top', offset_height - 30).css('left', offset_width);

			if (self.panel.is(':visible')) { // sometimes, shown event isn't triggered after show event automatically
				self.panel.trigger('shown.bs.modal');
			}

			if (self.is_hide) { // modal is hiding now!
				self.try_to_show = true; // but we're trying to show!
			}
		});

		this.panel.on('shown.bs.modal', function() {
			if (self.panel.is(':visible')) { // we success to show modal. Initialize all flags.
				self.try_to_show = false;
				self.is_hide = false;

				core.progressbar.set(0);

				if (Object.keys(self.list).length === 0) {
					self.hide();
				}
			} else if (Object.keys(self.list).length > 0) { // we fail to show modal, try again
				self.show();
			}
		});

		// enable key event on dialogs. Jeong-Min Im.
		// this.panel.on('hidden.bs.modal', function() {
		// $('.modal.in').focus();

		// fix deleting project
		// if ($('#dlg_delete_project').attr('class').indexOf('in') >= 0) {
		// 	$("#project_delete_list").focus();
		// }
		// self.state = 'hidden';
		// });

		this.panel.on('hide.bs.modal', function() {
			if (self.try_to_show) { // wait, someone tries to show! Let him do that
				return false;
			} else { // we're going to hide
				self.is_hide = true;
				self.status_hide = true;
			}
		});

		// hide loading bar dialog and change it to progress bar in bottom status bar. Jeong-Min Im.
		$('#g_lb_btn_hide').click(function() {
			var now = self.panel.find('.progress-bar').attr('aria-valuenow'); // get current loading bar progress percentage

			self.hide(now);
			self.goorm_progress_bar.css('cursor', 'pointer'); //show it as clickable
		});
		// process is done and hide loading bar. Jeong-Min Im.
		$('#g_lb_btn_ok').click(function() {
			self.hide();
		});
		// restore loading bar. Jeong-Min Im.
		this.goorm_progress_bar.click(function() {
			core.progressbar.set(100); // progress bar to loading bar

			self.show();
		});
	},

	get_fingerprint: function(bits) {
		var chars;
		var rand;
		var i;
		var ret;

		chars = 'abcdefghijklmnopqr12345678abcdefghijklmnopqrstuvwxyz012345678912';
		ret = '';

		while (bits > 0) {
			// 32-bit integer
			rand = Math.floor(Math.random() * 0x100000000);
			// base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
			for (i = 26; i > 0 && bits > 0; i -= 6, bits -= 6) {
				ret += chars[0x3F & rand >>> i];
			}
		}

		return ret;
	},

	// add new progress bar and show loading bar. Jeong-Min Im.
	// option = {
	// 	now(Number): current progress percentage
	// 	kill(Function): cancel current loading
	// 	str(String): loading message(means current process)
	// }
	// return: progress bar elements. For getting logs, progress percentage...
	start: function(option, callback) {
		var self = this;
		option = option || {};

		if (option.unique) {
			if (this.unique.indexOf(option.unique) >= 0) {
				return false;
			} else {
				this.unique.push(option.unique);
			}
		}

		var fingerprint = this.get_fingerprint(54);

		var wrapper = 'progress_wrapper_' + fingerprint;
		var title = 'progress_title_' + fingerprint;
		var bar = 'progress_bar_' + fingerprint;
		var kill = 'progress_kill_' + fingerprint;
		var contents = 'progress_contents_' + fingerprint;

		this.status_hide = false;
		// count
		this.list[fingerprint] = option;
		this.count++;

		// make progress bar using template and add to loading bar
		this.panel.find('#loading_bar_row').append(this.template.replace('progress_wrapper', wrapper)
			.replace('_fingerprint', fingerprint)
			.replace('progress_title', title)
			.replace('progress_bar', bar)
			.replace('progress_kill', kill)
			.replace('progress_contents', contents));

		// set options
		$('#modal_loading_bar').html(core.module.localization.msg.please_wait);
		$('#' + title).html(option.str || '');
		core.progressbar.set(option.now || 99.9, '#' + bar);

		// bind kill event
		var kill_button = $('#' + kill);
		if (option.kill) {
			kill_button.show();

			kill_button.click(function() {
				var fingerprint = $(this).parents('.progress_wrapper').attr('fingerprint'); // extract process that will be killed

				self.list[fingerprint].kill(); // execute kill function

				if (typeof(option.beforeStop) === 'function') {
					option.beforeStop();
				}
				if (option.unique) {
					self.unique.splice(self.unique.indexOf(option.unique), 1);
				}
				self.stop('#progress_wrapper_' + fingerprint); // stop this progress
			});
		} else {
			kill_button.hide();
		}

		$('#g_lb_btn_hide').show(); // hide is default
		$('#g_lb_btn_ok').hide(); // ok button is for done loading bar
		this.goorm_progress_bar.css('cursor', ''); // loading bar is showing, so set goorm progress bar non-clickable

		// setTimeout(function() { // jeongmin: continuous dialog showing makes error. So give some delay
		self.panel.modal('show');
		// }, 150);

		if (typeof(callback) === 'function') {
			callback();
		}

		return {
			wrapper: '#' + wrapper,
			title: '#' + title,
			bar: '#' + bar,
			kill: '#' + kill,
			contents: function(str) {
				if (str.length > 45) {
					var front = str.slice(0, 22);
					var back = str.slice(str.length - 22, str.length);

					str = front + '...' + back;
				}
				$('#' + contents).html(str);
			},
			str: function(str) {
				$(this.title).html(str);
			},
			stop: function() { // stops 'this' progress
				if ($(this.wrapper).length) { // only if this progress bar exists
					if (typeof(option.beforeStop) === 'function') {
						option.beforeStop();
					}
					if (option.unique) {
						self.unique.splice(self.unique.indexOf(option.unique), 1);
					}

					self.stop(this.wrapper); // this -> returned object
				}
			}
		};
	},

	// remove progress bar. Jeong-Min Im.
	// wrapper(String): progress bar's wrapper(id)
	stop: function(wrapper) {
		var self = this;

		if (Object.keys(this.list).length == 1) { // last one
			// initialize
			this.list = {};
			this.count = 0; // nothing left. Last one is stopped
			$(wrapper).remove();
			if (this.panel.hasClass('in')) { // loading bar is showing now, so no need to show it again -> just stop
				if (Object.keys(self.list).length === 0) {
					self.hide();
				}
			} else { // in progressbar.. notice user that progress is done
				this.panel.find('.close').hide(); // cancel shouldn't be clicked by user after process is done. (cancel another process that has same PID as this process)
				$('#g_lb_btn_ok').show();

				// process done
				// this.show({
				// 	str: core.module.localization.msg.notice_process_done,
				// 	now: 100,
				// 	lock: true
				// });
			}
		} else if (wrapper) {
			var fingerprint = $(wrapper).attr('fingerprint'); // find out which progress is done

			this.count--;
			delete this.list[fingerprint]; // delete it from progress bars list
			$(wrapper).remove();
		}
		if (self.status_hide && this.count === 0) {
			core.progressbar.set(0);
		}
	},

	// show loading bar dialog. Jeong-Min Im.
	// option = {
	// 	lock(Bool): forbids hiding loading bar
	// 	str(String): loading message(means current process)
	// }
	show: function(option) {
		if (option) {
			if (option.str) {
				$('#modal_loading_bar').html(option.str);
			}

			if (option.lock) {
				$('#g_lb_btn_hide').hide();
			}
		}

		this.goorm_progress_bar.css('cursor', ''); // loading bar is showing, so set goorm progress bar non-clickable
		this.panel.modal('show');
	},

	// loading bar will be hidden into goorm progress bar on bottom status bar. Jeong-Min Im.
	hide: function(now) {
		this.status_hide = true;
		this.panel.modal('hide');
		core.progressbar.set(now || 100, '#loading_progress_bar');
		core.progressbar.set(now || 100); // loading bar hide to progress bar in bottom

	}
};
