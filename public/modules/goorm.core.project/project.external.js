/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.external = {
	init: function() {
		var self = this;
		var m = location.pathname.match(/^\/(share|edu)-(.*)$/);
		if (m) {
			var mode = m[1];
			var hash = m[2];
			var senddata = {
				hash: hash
			};

			// 최근 프로젝트가 자동으로 열리고나서 생성된 프로젝트가 열려서 타이밍이 겹쳐서 에러가나므로,
			// 최근 프로젝트를 초기화시킨다.
			localStorage.current_project = "{}";
			localStorage.workspace_window = "[]";

			$(core).on("goorm_login_complete", function() {
				core.socket.once("/share/on_init", function(res) {
					if (!res.error && !res.err_code) {
						if (res.result) res = res.result;

						self.data = res;

						goorm.core.project.open.open(res.project_path, res.project_name, res.project_type);

						if (mode == "share") {
							if (res.opened_files) {
								for (var i = 0; i < res.opened_files.length; i++) {
									var fullpath = res.project_path + res.opened_files[i];
									var p = fullpath.split("/");
									var filename = p.pop();
									var filepath = p.join("/");
									if (filename.split(".").length > 1) {
										var ext = filename.split(".").pop();
									} else {
										var ext = "txt";
									}

									// console.log(filepath, filename, ext);
									core.module.layout.workspace.window_manager.open(filepath + "/", filename, ext);
								}
							}
						}

						$(core).trigger("goorm_share_ready", res);
					} else {
						alert.show(res.result);
					}
				});
				core.socket.emit("/share/init", senddata);
			});
		}
	},
	create: function(options) {
		var project = core.status.current_project_path;
		var data = {
			path: project,
			opened_files: []
		};

		var list = core.module.layout.workspace.window_manager.get_project_windows();
		for (var i = 0; i < list.length; i++) {
			var name = list[i].filepath + list[i].filename;
			name = name.replace(project, "");
			data.opened_files.push(name);
		}
		$.extend(data, options);

		core.socket.once("/share/create", function(res) {
			if (res.error) {
				console.log(res);
			}
		});
		core.socket.emit("/share/create", data);
	}
};