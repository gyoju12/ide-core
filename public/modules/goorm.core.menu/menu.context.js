/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.menu.context = function() {
	this.menu = null;
	this.target = null;
	this.name = null;
};

goorm.core.menu.context.prototype = {
	init: function(path, name, trigger, fingerprint, target, fn, nobind) {
		var self = this;
		this.target = target;
		if (name == "none") {
			$(trigger).on("contextMenu", function(e) {
				return false;
			});
		} else {

			if (fingerprint !== undefined && fingerprint !== "") {
				var target_id = name + '_\[\{\@FINGERPRINT\}\]';
				var context = $('[id="' + target_id + '"]').prop('outerHTML');

				while (context.indexOf("[{@FINGERPRINT}]") !== -1) {
					context = context.replace("[{@FINGERPRINT}]", fingerprint);
				}

				name = name + "_" + fingerprint;
				$("#goorm_menu_container").find("div[id='" + name + "']").remove();
				$("#goorm_menu_container").append(context);
			}

			this.name = name;
			this.menu = $('div[id="' + name + '"]');

			if (trigger === "") {
				trigger = null;
			}

			if (trigger) {
				$(core).on('contextmenu_all_hide', function() {
					self.menu.hide();
				});

				if (nobind === false) {
					$(trigger).mousedown(function(e) {
						if (e.which == 3) {
							if (name == "project.explorer_context") {
								core.module.layout.project_explorer.reset_tree_selected();
								trigger.find(".jstree").jstree("deselect_all", false);
							}
							self.show(e);

							e.preventDefault();
							return false;
						}
					});
				}

				$(document).on('click', '[id="' + name + '"] li > a', function() {
					self.menu.hide();
				});

				$(document).click(function() {
					self.menu.hide();
				});

				// hide context menu on esc key. Jeong-Min Im.
				$(document).keydown(function(e) {
					if (e.keyCode == 27) { // ESC
						self.hide();
					}
				});
			}

			if (fn) {
				fn.call(self);
			}

			if (name.indexOf("edit.context") > -1) {
				core.module.action.editor_context_menu_init();
			} else if (name.indexOf("window.tab") > -1) {
				core.module.action.window_tab_context_menu_init();
			}
			
			else if (name.indexOf("window.manager_context") > -1) {
				core.module.action.window_manager_context_menu_init();
			} else if (name.indexOf("project.explorer") > -1) {
				var type = name.split('.').pop();
				core.module.action.project_explorer_context_menu_init(type);
			}
			
			else {
				core.module.action.init();
			}

		}
	},

	show: function(e) {
		var max_height = 500;
		if (this.menu) {
			var current_file = $(e.target).parent().attr('path');
			
			$(core).trigger('contextmenu_all_hide');
			height = this.menu.css("height") || this.menu.height();
			body_height = $("body#goorm").css("height");
			// height = parseInt(height.substring(0, height.length - 2)) + e.pageY;
			height = parseInt(height) + e.pageY; // jeongmin: parseInt('227px') == 227
			body_height = parseInt(body_height.substring(0, body_height.length - 2));
			if (height > body_height)
				e.pageY -= height - e.pageY;
			if (e.pageY < 0)
				e.pageY = 0;
			this.menu.css({
				"position": "absolute",
				"display": "block",
				"left": e.pageX,
				"top": e.pageY,
				"z-index": 1050,
			});
		}
	},

	cancel: function() {
		if (this.menu) {
			this.menu.hide();
		}
	},

	blur: function() {
		if (this.menu) {
			this.menu.blur();
		}
	},

	hide: function() {
		if (this.menu) {
			this.menu.hide();
		}
	},

	remove: function() {
		$("#" + this.target).remove();
		this.menu.remove();
		delete this;
	}
};