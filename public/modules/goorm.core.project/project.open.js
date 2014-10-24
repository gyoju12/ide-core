/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.open = {
	dialog: null,
	buttons: null,
	chat: null,
	project_list: null,
	
	handler: {},
	loading: false,

	init: function() {

		var self = this;

		this.panel = $("#dlg_open_project");

		this.__handle_open = function() {
			var data = self.project_list.get_data();

			if (data.path === "" || data.name === "" || data.type === "") {
				alert.show(core.module.localization.msg.alert_project_not_selected);
				return false;
			} else {
				var storage = $("#project_open_storage").find("span").html().toString();
				if (storage == "goormIDE Storage") {
					self.open(data.path, data.name, data.type);
				}
				// else if (storage == "Google Drive") {

				// } else if (storage == "Dropbox") {
				// 	goorm.core.cloud.dropbox.project.open(data.path, data.name, data.type);
				// }

				self.panel.modal('hide');
			}
		};


		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: "title_open_project",
			id: "dlg_open_project",
			handle_ok: this.__handle_open,
			show: $.proxy(this.after_show, this),
			success: function() {
				$("#project_open_storage").find("span").html("goormIDE_Storage");
				$(document).on("click", "li.open.storage", function() {
					var storage = $(this).find("a").html();
					$("#project_open_storage").find("span").html(storage);
					if (storage == "goormIDE Storage") {
						$("#project_open_list").empty();
						$("#project_open_information").empty();
						self.project_list = new goorm.core.project.list();
						self.project_list.init("#project_open");
					}
					// else if (storage == "Google Drive") {

					// } else if (storage == "Dropbox") {
					// 	$("#project_open_list").empty();
					// 	$("#project_open_information").empty();
					// 	self.project_list = new goorm.core.cloud.dropbox.project.list();
					// 	self.project_list.init("#project_open");
					// }
				});
			}

		});


		this.project_list = new goorm.core.project.list();

		// open으로 이동
		// $(core).trigger("on_project_binding");
	},

	show: function() {
		this.project_list.init("#project_open");
		this.project_list.set_keydown_event({
			'handler': this.__handle_open
		});

		this.panel.modal('show');
	},

	after_show: function() {
		$("#project_open_list").focus();
	},

	bind: function(name, fn) {
		if (!this.handler) {
			this.handler = {};
		}

		if (fn && typeof(fn) === 'function') {
			this.handler[name] = fn;
		}
	},

	mount: function (path, callback) {
		if (typeof(path) === 'function') {
			callback = path;
			path = null;
		}

		var project_path = path || core.status.current_project_path;

		if (project_path !== "") {
			core._socket.once('/project/mount', function (result) {
				callback(result);
			});

			core._socket.emit('/project/mount', {
				'project_path': project_path
			});
		}
		else {
			callback({
				'result': true
			});
		}
	},

	unmount: function (path, callback) {
		var self = this;

		if (this.loading) return;

		if (typeof(path) === 'function') {
			callback = path;
			path = null;
		}

		var project_path = path || core.status.current_project_path;

		if (project_path !== "") {
			this.loading = true;

			core._socket.once('/project/unmount', function (result) {
				setTimeout(function () {
					self.loading = false;
				}, 1500);

				callback(result);
			});

			core._socket.emit('/project/unmount', {
				'project_path': project_path
			});
		}
		else {
			callback({
				'result': true
			});
		}
	},

	open: function(current_project_path, current_project_name, current_project_type) {
		var self = this;

		$(core).trigger("on_project_binding");

		//set once-open trigger every call of open so that can get the message of nodejs project --heeje
		$(core).one('do_open', function() {
			

			

			
			core.status.current_project_storage = "goormIDE_Storage";
			core.status.current_project_path = current_project_path;
			core.status.current_project_name = current_project_name;
			core.status.current_project_type = current_project_type;

			var current_project = {};
			current_project.current_project_path = current_project_path;
			current_project.current_project_name = current_project_name;
			current_project.current_project_type = current_project_type;

			localStorage.current_project = JSON.stringify(current_project);

			core.dialog.project_property.refresh_toolbox();
			core.module.layout.project_explorer.refresh();
			core.module.layout.project_explorer.refresh_project_selectbox();

			if (use_terminal !== false) {
				core.module.terminal.terminal.refresh_terminal();
				core.module.layout.terminal.refresh_terminal();
			}

			core.module.layout.workspace.window_manager.refresh_all_title();

			$(core).trigger("on_project_open", {
				'project_path': current_project_path,
				'project_name': current_project_name,
				'project_type': current_project_type
			});
			
		})

		if (this.handler && this.handler.before) {
			this.handler.before();
		} else {
			$(core).trigger('do_open');
		}
	},
	
};