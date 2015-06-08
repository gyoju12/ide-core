/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog = function() {

};

goorm.core.dialog.prototype = {
	init: function(option) {
		this.id = option.id;
		this.show = option.show; //jeongmin: define show function
		this.success = option.success;
		this.opacity = option.opacity;

		var goorm_dialog_container = $('[id="' + option.id + '"]');
		var input = goorm_dialog_container.find('input[autofocus]');

		goorm_dialog_container.draggable({});
		// modal centering optimized - heeje
		goorm_dialog_container.on('show.bs.modal', function() { // jeongmin: event should be binded to only one element, not .modal

			$(this).css('display', 'block');
			var $dialog = $(this).find('.modal-dialog');
			var offset_height = (($(window).height() - $dialog.height()) / 2) - 30;
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			if (offset_height < 0) {
				offset_height = 0;
			}
			if (offset_width < 0) {
				offset_width = 0;
			}
			$(this).css('top', offset_height).css('left', offset_width);

			core.init_input_validation($(this).find('.has-feedback'));
		});
		// 		goorm_dialog_container.css("overflow", "hidden");

		$(document).on('click', '.modal-backdrop.in', function() {
			$('.modal.in').modal('hide');
		});

		goorm_dialog_container.on('hide.bs.modal', function() {
			core.status.selected_dialog = '';
			core.status.selected_dialog_container = '';
			core.status.focus_on_dialog = false;
		});

		goorm_dialog_container.on('shown.bs.modal', function() {
			input.focus();
		});

		if (typeof option.handle_ok == 'function') {
			goorm_dialog_container.find('.modal-footer button:last-child').last().click(option.handle_ok);
		}

		if (typeof option.handle_cancel == 'function') {
			goorm_dialog_container.on('hidden.bs.modal', option.handle_cancel);
		}

		if (typeof option.show == 'function') {
			goorm_dialog_container.on('shown.bs.modal', this.show); //jeongmin: when the modal has been made visible to the user, specify this (go to project._export.js)
		}

		if ($.isFunction(this.success)) {
			this.success();
		}

		if (this.opacity) {
			this.insert_opacity_slide(goorm_dialog_container, option.id);
		}

		core.input_validation(goorm_dialog_container);

		core.dialog.loaded_count++;

		$(core).trigger('goorm_loading');

		return this;
	},

	insert_opacity_slide: function(container, id) {
		var slider = $('#slider_template').clone(true); // duplicate
		var slider_id = id + '_slider';

		slider.attr('id', slider_id);
		slider.attr('data-name', slider_id + '_name');

		container.find('.modal-header').append(slider);

		var slider_c = $('#' + slider_id);
		slider_c.on('change.bfhslider', function() {/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog = function() {

};

goorm.core.dialog.prototype = {
	init: function(option) {
		this.id = option.id;
		this.show = option.show; //jeongmin: define show function
		this.success = option.success;
		this.opacity = option.opacity;

		var goorm_dialog_container = $('[id="' + option.id + '"]');
		var input = goorm_dialog_container.find('input[autofocus]');

		goorm_dialog_container.draggable({});
		// modal centering optimized - heeje
		goorm_dialog_container.on('show.bs.modal', function() { // jeongmin: event should be binded to only one element, not .modal

			$(this).css('display', 'block');
			var $dialog = $(this).find('.modal-dialog');
			var offset_height = (($(window).height() - $dialog.height()) / 2) - 30;
			var offset_width = (($(window).width() - $dialog.width()) / 2);
			if (offset_height < 0) {
				offset_height = 0;
			}
			if (offset_width < 0) {
				offset_width = 0;
			}
			$(this).css('top', offset_height).css('left', offset_width);

			core.init_input_validation($(this).find('.has-feedback'));
		});
		// 		goorm_dialog_container.css("overflow", "hidden");

		$(document).on('click', '.modal-backdrop.in', function() {
			$('.modal.in').modal('hide');
		});

		goorm_dialog_container.on('hide.bs.modal', function() {
			core.status.selected_dialog = '';
			core.status.selected_dialog_container = '';
			core.status.focus_on_dialog = false;
		});

		goorm_dialog_container.on('shown.bs.modal', function() {
			input.focus();
		});

		if (typeof option.handle_ok == 'function') {
			goorm_dialog_container.find('.modal-footer button:last-child').last().click(option.handle_ok);
		}

		if (typeof option.handle_cancel == 'function') {
			goorm_dialog_container.on('hidden.bs.modal', option.handle_cancel);
		}

		if (typeof option.show == 'function') {
			goorm_dialog_container.on('shown.bs.modal', this.show); //jeongmin: when the modal has been made visible to the user, specify this (go to project._export.js)
		}

		if ($.isFunction(this.success)) {
			this.success();
		}

		if (this.opacity) {
			this.insert_opacity_slide(goorm_dialog_container, option.id);
		}

		core.input_validation(goorm_dialog_container);

		core.dialog.loaded_count++;

		$(core).trigger('goorm_loading');

		return this;
	},

	insert_opacity_slide: function(container, id) {
		var slider = $('#slider_template').clone(true); // duplicate
		var slider_id = id + '_slider';

		slider.attr('id', slider_id);
		slider.attr('data-name', slider_id + '_name');

		container.find('.modal-header').append(slider);

		var slider_c = $('#' + slider_id);
		slider_c.on('change.bfhslider', function() {
			// console.log(v);
		});
	}
};

			// console.log(v);
		});
	}
};
