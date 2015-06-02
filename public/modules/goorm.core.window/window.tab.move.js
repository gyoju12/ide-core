/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.window.tab.move = function() {
	this.config = {};
	this.prarent = null;
	this.ul_container = null;
	this.li_container = null;
};

goorm.core.window.tab.move.prototype = {
	init: function(parent) {
		// this.parent = parent; // tab object
		// this.tab_id = parent.tab_id;

		//this.bind();

		// Ver. JQuery-UI
		//
		var window_manager = core.module.layout.workspace.window_manager;
		var tab_container = window_manager.window_list_container;

		$('#' + tab_container).sortable({
			containment: 'parent',
			axis: 'x',
			tolerance: 'pointer'
			// start: function(evt, ui){
			// 	console.log(evt,ui);
			// 	var width = parseInt($(ui.helper).css('width').split('px')[0], 10) + 2;
			// 	$(ui.helper).css('width', width+'px');
			// },
			// stop: function() {
			// 	core.module.layout.workspace.window_manager.tab_manager.sort('window');
			// }
		});
	}
};
