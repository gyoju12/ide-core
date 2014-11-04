/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.help.about_private_url = {
	dialog: null,
	buttons: null,
	tabview: null,
	treeview: null,
	user_ports: [],

	init: function() {
		var self = this;

		this.panel = $("#dlg_about_private_url");

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_about_goorm",
			id: "dlg_about_private_url",
			success: function() {
				$('#dlg_about_private_url li.list-group-item').click(function(e) {
					$('#dlg_about_private_url li.list-group-item.active').removeClass('active');
					$(this).addClass('active');

					var id = $(this).find('a').attr('href');

					var current = $('#help_about_private_url_middle').scrollTop();
					var top = $('#help_about_private_url_middle ' + id).position().top;

					$('#help_about_private_url_middle').scrollTop(current + top);

					e.stopPropagation();
					e.preventDefault();
					return false;
				});

				$('#help_about_private_url_middle').scrollspy({
					'target': '.nav'
				});

				$('#help_about_private_url_middle').scroll(function() {
					var current_scroll = $(this).scrollTop(); // 2443
					// var scroll_height = $(this).prop('scrollHeight') - $(this).outerHeight(); // 2441

					if (current_scroll >= 25) {
						$('#help_about_private_url_left li.list-group-item').removeClass('active');
						$('#help_about_private_url_left li.list-group-item').last().addClass('active');
					} else {
						$('#help_about_private_url_left li.list-group-item').removeClass('active');
						$('#help_about_private_url_left li.list-group-item').first().addClass('active');
					}
				});

				

				self.panel.draggable('disable'); // jeongmin: for dragging url
			}
		});

		this.panel.on('shown.bs.modal', function() {
			$('help_about_private_url_middle[data-spy="scroll"]').each(function() {
				var $spy = $(this).scrollspy('refresh')
			});
		});
	},

	show: function() {
		// $.getJSON("help/get_private_url_markdown?language=" + localStorage.getItem("language"), function (data) {
		// 	$("#help_contents_middle").empty();
		// 	$("#help_contents_middle").append(data.html);

		// 	if (this.user_ports && this.user_ports.length > 0) {
		// 		$('#private_ports_1').html(this.user_ports[0])
		// 		$('#private_ports_2').html(this.user_ports[1])
		// 		$('#private_ports_3').html(this.user_ports[2])
		// 	}

		// 	this.panel.modal('show');
		// }		
	}
};