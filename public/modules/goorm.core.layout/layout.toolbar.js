/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.layout.toolbar = {
	add: function(options) {
		if (options.name && $('#plugin_' + options.name).length === 0) {
			$('<div id="plugin_' + options.name + '" class="btn-group"></div>').insertBefore('#toolbar_more_button_group');
			$('#bubble_toolbar_sub').append('<div id="bubble_plugin_' + options.name + '" class="btn-group bubble_plugin_' + options.name + '" style="display:none;"></div>');
		}

		$.each(options.children, function(index, value) {
			if (value.name && $('#plugin_sub_' + value.name).length === 0) {
				$('#plugin_' + options.name).append('<button action="plugin_' + value.name + '" type="button" id="plugin_sub_' + value.name + '" class="btn btn-default" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="' + value.tooltip + '" data-container="body"><div class="toolbar_button"><div class="toolbar-' + value.name + '"></div></div></button>');
				$('#bubble_plugin_' + options.name).append('<button action="plugin_' + value.name + '" type="button" id="bubble_plugin_sub_' + value.name + '" class="btn btn-default" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="' + value.tooltip + '" data-container="body"><div class="toolbar_button"><div class="toolbar-' + value.name + '"></div></div></button>');

				$('[action=plugin_' + value.name + ']').off('click').tooltip();
				$('[action=plugin_' + value.name + ']').click(function() {
					value.handler();
				});
			}
		});
	}
};
