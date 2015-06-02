/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.help.contents = {
	dialog: null,
	buttons: null,
	tabview: null,
	treeview: null,
	top: null,
	title: null,

	init: function() {
		var self = this;

		this.panel = $('#dlg_help_contents');

		this.top = [];
		this.title = [];

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: 'title_help_contents',
			id: 'dlg_help_contents',
			success: function() {
				self.panel.draggable('disable'); // jeongmin: for dragging url

				$('#dlg_help_contents li.list-group-item').click(function(e) {
					$('#dlg_help_contents li.list-group-item.active').removeClass('active');
					$(this).addClass('active');

					var id = $(this).find('a').attr('href');

					var current = $('#help_contents_middle').scrollTop();
					var top = $('#help_contents_middle ' + id).position().top;

					$('#help_contents_middle').scrollTop(current + top);

					e.stopPropagation();
					e.preventDefault();
					return false;
				});
			}

		});

		this.panel.on('shown.bs.modal', function() {
			// $('#help_contents_middle[data-spy="scroll"]').each(function () {
			//   var $spy = $(this).scrollspy('refresh')
			// });
			$('#help_contents_middle[data-spy="scroll"]').scrollspy('refresh');
		});

		$(core).on('language_loaded', self.load);
	},

	load: function() {
		var self = this;

		$.getJSON('help/get_readme_markdown?language=' + localStorage.getItem('language'), function(data) {
			$('#help_contents_middle').empty();
			$('#help_contents_middle').append(data.html);

			// plugin is applied to a scrollable element, targeting my navigation element
			// $('#help_contents_middle').scrollspy({ 'target': '.help_contents_nav' });
			// $('#help_contents_middle[data-spy="scroll"]').scrollspy('refresh');

			$('#help_contents_middle').scroll(function() {
				var current_scroll = $(this).scrollTop(); // 2443
				var scroll_height = $(this).prop('scrollHeight') - $(this).outerHeight(); // 2441

				if (current_scroll >= scroll_height) {
					$('#help_contents_left li.list-group-item').removeClass('active');
					$('#help_contents_left li.list-group-item').last().addClass('active');
				}
			});
		});
	},

	show: function() {
		this.panel.modal('show');
	}
};
