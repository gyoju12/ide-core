/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog.cloud_explorer = function () {
	this.location_path = null;
	this.dir_tree = null;
	this.files = null;
	this.file_type = null;

	this.treeview = null;

	this.current_path = null;

	this.target_name = null;

	this.is_dir_only = false;
};

goorm.core.dialog.cloud_explorer.prototype = {
	init: function (context, is_dir_only) {
		var self = this;

		self.location_path = context + "_location_path";
		self.dir_tree_ori = context + "_dir_tree";

		self.dir_tree_ori = self.dir_tree_ori.replace("#", "");

		self.dir_tree = context + "_dir_tree";
		self.files = context + "_files";

		self.current_path = core.status.current_project_path;
		self.current_path = "Google_Drive_Root";
		$(self.location_path).val(self.current_path);

		self.target_name = context + "_target_name";
		$(self.target_name).val("");

		self.is_dir_only = is_dir_only;

		self.file_type = context + "_file_type";

		if (self.is_dir_only) {
			self.add_directories();
		} else {
			self.add_directories();
		}
	},

	get_data: function () {
		var self = this;

		var data = {};

		if (self.files == "#file_open_files") {
			data.name = self.filename;
			data.type = self.filetype;
			data.path = self.filepath;
		} else {
			data.path = $(self.location_path).val();
			data.name = $(self.target_name).val();
			data.type = $(self.file_type).val();
		}

		if (typeof data.path == "undefined") {
			data.path = "";
		}
		if (typeof data.name == "undefined") {
			data.name = "";
		}
		if (typeof data.type == "undefined") {
			data.type = "";
		}

		if (data.path === "") {
			data.path = "/";
		}

		if (data.path.indexOf(" ") == -1 && data.name.indexOf(" ") == -1 && data.type.indexOf(" ") == -1) {
			return data;
		} else {
			return false;
		}
	},

	add_directories: function () {
		var self = this;

		$(self.dir_tree).empty();

		var sorting_data = jQuery.extend(true, {}, core.cloud.google);
		self.treeview = new YAHOO.widget.TreeView(self.dir_tree_ori, sorting_data);

		self.treeview.subscribe("clickEvent", function (nodedata) {
			$(self.dir_tree + " td").removeClass("ygtvfocus");
			if (nodedata.node.data.cls != "file") { //if folder type
				var file_id = nodedata.node.data.file_id;
				core.cloud.target_id = file_id;

				$("#" + nodedata.node.contentElId.replace("contentel", "t")).addClass("ygtvfocus");
				$("#" + nodedata.node.contentElId).addClass("ygtvfocus");

				self.current_path = "";

				var location_arr = [];
				var c_node = nodedata.node;
				for (var k = 0; k < nodedata.node.depth; k++) {
					location_arr.push(c_node.data.title);
					c_node = c_node.parent;
				}
				location_arr.push("Google_Drive_Root");

				self.current_path = "";
				for (var k = location_arr.length - 1; k >= 0; k--) {
					self.current_path += (location_arr[k] + "/");
				}
				$(self.location_path).attr("value", self.current_path);

				return false;
			}
		});

		self.treeview.subscribe("dblClickEvent", function (nodedata) {

			$(self.dir_tree + " td").removeClass("ygtvfocus");

			if (nodedata.node.data.cls != "file") {

				$("#" + nodedata.node.contentElId.replace("contentel", "t")).addClass("ygtvfocus");
				$("#" + nodedata.node.contentElId).addClass("ygtvfocus");

				if (nodedata.node.expanded) {
					nodedata.node.collapse();
				} else {
					nodedata.node.expand();
				}

				var file_id = nodedata.node.data.file_id;
				core.cloud.target_id = file_id;

				self.current_path = "";
				var location_arr = [];
				var c_node = nodedata.node;
				for (var k = 0; k < nodedata.node.depth; k++) {
					location_arr.push(c_node.data.title);
					c_node = c_node.parent;
				}
				location_arr.push("Google_Drive_Root");

				self.current_path = "";
				for (var k = location_arr.length - 1; k >= 0; k--) {
					self.current_path += (location_arr[k] + "/");
				}

				$(self.location_path).attr("value", self.current_path);

			}
			return false;
		});

		self.treeview.render();
	},

	expand_directory: function (directory) {
		var self = this;

		var nodes = directory.split('/');

		var target_parent = "";
		var target_name = "";

		function get_node_by_path(node) {
			if (node.data.parent_label == target_parent && node.data.name == target_name) return true;
			else return false;
		}

		for (var i = 0; i < nodes.length; i++) {
			target_name = nodes[i];

			var target_node = self.treeview.getNodesBy(get_node_by_path);
			if (target_node) {
				target_node = target_node.pop();
				target_node.expand();
			}

			target_parent += nodes[i] + '/';
		}
	},

	tree_expand_complete: function () {
		var self = this;

		$(self.dir_tree).find(".ygtvcell").off("mousedown");
		$(self.dir_tree).find(".ygtvcell").mousedown(function (e) {
			if ($(this).hasClass("ygtvfocus") === false) {
				$(self.dir_tree).find(".ygtvfocus").removeClass("ygtvfocus");

				if ($(this).hasClass("ygtvcontent")) {
					$(this).prev().addClass("ygtvfocus");
					$(this).addClass("ygtvfocus");
				}
			}
		});
	},

	add_file_items: function (directory_path) {
		var self = this;
		var path = directory_path || this.current_path;

		var files = $(self.files);
		var folder_item = files.find(".folder_item");
		var file_item = files.find(".file_item");
		var target_name = $(self.target_name);

		var postdata = {
			path: path,
			type: 'add_file_items'
		};

		//$.get("file/get_result_ls", postdata, function (data) {
		core.socket.once("/file/get_result_ls"+postdata.path, function(data){
			files.empty();

			for (var idx = 0; idx < data.length; idx++) {
				var icon_str = "";
				if (data[idx].cls == "dir") {
					icon_str += "<div class='folder_item'";
					icon_str += " filename='" + data[idx].name + "' filepath='" + data[idx].parent_label + "'>";
					icon_str += "<img src='images/goorm.core.file/folder.png'>";
				} else {
					icon_str += "<div class='file_item'";
					icon_str += " filename='" + data[idx].filename + "' filetype='" + data[idx].filetype + "' filepath='" + data[idx].parent_label + "'>";
					icon_str += "<img src='images/goorm.core.file/file.png'>";
				}

				icon_str += "<div style='word-break:break-all; width:60px; line-height:12px; margin-left:5px; margin-right:5px; margin-bottom:5px;'>";

				if (data[idx].cls == "dir") {
					icon_str += data[idx].name;
				} else {
					icon_str += data[idx].filename;
				}

				icon_str += "</div>";

				files.append(icon_str);
			}

			folder_item.dblclick(function () {
				if (self.current_path == "/") self.current_path = "";
				self.current_path = self.current_path + "/" + $(this).attr("filename");
				$(self.location_path).val(self.current_path);

				self.add_file_items();
				self.expand_directory(self.current_path);
			});

			folder_item.click(function () {
				file_item.removeClass("selected_item");
				folder_item.removeClass("selected_item");
				$(this).addClass("selected_item");
			});

			if (self.files == "#file_open_files") {
				file_item.dblclick(function () {
					core.module.layout.workspace.window_manager.open($(this).attr("filepath"), $(this).attr("filename"), $(this).attr("filetype"));
					core.dialog.open_file.panel.modal('hide');
				});

				file_item.click(function () {

					file_item.removeClass("selected_item");
					folder_item.removeClass("selected_item");
					$(this).addClass("selected_item");

					target_name.attr("value", $(this).attr("filename"));

					self.filename = $(this).attr("filename");
					self.filetype = $(this).attr("filetype");
					self.filepath = $(this).attr("filepath");
				});
			} else if (self.files == "#file_export_files") {
				file_item.click(function () {

					file_item.removeClass("selected_item");
					folder_item.removeClass("selected_item");
					$(this).addClass("selected_item");

					target_name.attr("value", $(this).attr("filename"));

					self.filename = $(this).attr("filename");
					self.filetype = $(this).attr("filetype");
					self.filepath = $(this).attr("filepath");
				});
			} else {
				file_item.click(function () {
					file_item.removeClass("selected_item");
					folder_item.removeClass("selected_item");
					$(this).addClass("selected_item");
				});
			}
		});
		core.socket.emit("/file/get_result_ls", postdata);
	},

	add_file_type_selector: function () {
		var self = this;

		var option_html = '<option value="" selected="selected">All Files (*.*)</option>';

		for (var i = 0; i < core.filetypes.length; i++) {
			option_html += '<option value="' + core.filetypes[i].file_extension + '">' + core.filetypes[i].description + ' (*.' + core.filetypes[i].file_extension + ')</option>';
		}

		$(self.file_type).html(option_html);

		$(self.file_type + " option:eq(0)").attr("selected", "selected");

		$(self.file_type).change(function () {
			$(self.files + " .file_item").show();

			if ($(this).val() === "") {
				$(self.files + " .file_item").show();
			} else {
				$(self.files + " .file_item").each(function () {
					if ($(this).attr("filetype") != $(self.file_type).val()) {
						$(this).hide();
					}
				});
			}
		});
	}

};
