/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.dialog.explorer = function (context, caller) {
	this.context = context;
	this.caller = caller;
	this.location_path = context + "_location_path";
	this.dir_tree_ori = context + "_dir_tree";
	this.dir_tree_ori = this.dir_tree_ori.replace("#", "");
	this.dir_tree = context + "_dir_tree";
	this.files = context + "_files";
	this.file_type = null;
	this.treeview = null;
	this.current_path = null;
	this.input_file_name = null;
	this.has_fileview = false;
	this.hide_files = false;
};

goorm.core.dialog.explorer.prototype = {
	/**
	 * Initialize dialog explorer
	 * @method init
	 * @param  {String}  context      [Selector string of container to add explorer]
	 * @param  {Boolean} has_fileview [Set true if fileview is needed]
	 * @param  {Boolean}  folder_only  [Set true if only folders are needed on the explorer]
	 * @param  {Boolean}  hide_files  [Hide files on the file view]
	 */
	init: function (has_fileview, folder_only, hide_files) {
		var self = this;
		var context = this.context;

		self.current_path = core.status.selected_file || core.status.current_project_path;
		if(core.status.current_project_path===''){
			self.current_path='';
		}
		if (self.current_path === core.status.selected_file && core.status.selected_file_type === "file") {
			var tmp = self.current_path.split("/");
			tmp.pop();
			self.current_path = tmp.join("/");
		}

		//$(self.location_path).val(self.current_path);
		self.set_location_path(self.current_path);

		self.input_file_name = context + "_target_name";
		$(self.input_file_name).val("");

		self.has_fileview = has_fileview || false;
		self.hide_files = hide_files || false;

		self.file_type = context + "_file_type";

		// without tabindex, $().focus not working
		// keydown event cannot triggered without tabindex.
		$(this.files).attr("tabindex", "0");
		
		var scroll_to_selected = function (){
			var node = self.treeview.tree.jstree('get_selected');
			$('[id="' + node[0] + '"]')[0].scrollIntoView(true);
		}

		if (!self.has_fileview) {
			self.create_treeview(folder_only, [this.select_on_ready, scroll_to_selected]);
		} else {
			self.create_treeview(folder_only, [this.add_file_items, this.add_file_type_selector, scroll_to_selected]);
		}

		if (this.caller.panel) {
			this.caller.panel.on('shown.bs.modal', function () {//without it, scroll goes top after panel shown
				scroll_to_selected();
			});
		}

		self.bind();
		self.set_keydown_event();
	},

	get_data: function () {
		var self = this;

		var data = {};

		if (self.files == "#file_open_files") {
			data.name = self.filename;
			data.type = self.filetype;
			data.path = self.filepath.replace(data.name, "");
		} else {
			//data.path = $(self.location_path).val(;
			data.path = self.current_path;
			data.name = $(self.input_file_name).val();
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

		return data;

		// if (data.path.indexOf(" ") == -1 && data.name.indexOf(" ") == -1 && data.type.indexOf(" ") == -1) {
		// 	return data;
		// } else {
		// 	return false;
		// }
	},


	create_treeview: function (folder_only, on_ready) {
		var self = this;

		if(core.status.current_project_path === "") return ;

		if(this.treeview) {
			this.treeview.destroy();
			this.treeview = null;
		}
		var on_select = function(e, node){
			if(self.current_path != node.li_attr.path){
				self.current_path = node.li_attr.path;
				self.set_location_path(self.current_path);
				self.add_file_items(self.current_path);
			}
		};

		var state = core.module.layout.project_explorer.treeview.get_state();
		// console.log(state);


		// Create treeview
		this.treeview = new goorm.core.utility.treeview("#"+self.dir_tree_ori, {
			project_path: core.status.current_project_path,
			multiple: false,
			dnd: false,
			on_select: on_select,
			on_ready: function(){
				if(!$.isArray(on_ready)) {
					on_ready = [on_ready];
				}
				on_ready.map(function(f){
					if(typeof f === "function"){
						f.call(self);
					}
				});
			},
			state: state,
			folder_only: (folder_only)? folder_only : false
		});
	},

	select_on_ready: function() {
		var self = this;
		var path = this.get_location_path();
		self.treeview.get_node(this.dir_tree_ori+"/"+path)
			.then(function(node){
				self.treeview.select_node(node);
			});
	},

	add_file_items: function () {
		var self = this;
		var path = this.get_location_path() || "";

		var files = $(self.files);
		files.empty();

		var file_item = null;
		var folder_item = null;

		var raw_data = this.treeview.raw_data;

		var getnode = null;
		if(path === "") {
			getnode = self.treeview.get_root_node()
				.then(function(root_node){
					var data = [];
					$.each(raw_data, function(i, n){
						if(n.parent == root_node.id) {
							if(self.hide_files === false){
								data.push(n);
							} else if(n.type === "folder") {
								data.push(n);
							}
						}
					});
					return data;
				});
		} else {
			// console.log(this.dir_tree_ori+"/"+path);
			getnode = self.treeview.get_node(this.dir_tree_ori+"/"+path)
				.then(function(node){
					self.treeview.select_node(node);					
					
					var data = [];
					$.each(raw_data, function(i, n){
						if(n.parent == node.id) {
							if(self.hide_files === false){
								data.push(n);
							} else if(n.type === "folder") {
								data.push(n);
							}
						}
					});
					return data;
				});
		}

		getnode.then(function(data){
			// console.log(data);
			if (data) {
				var _sort = function(a, b) {
					return a.type === b.type ? (a.text > b.text ? 1 : -1) : ((a.type < b.type)? 1 : -1);
				};

				data.sort(_sort);
				for (var idx = 0; idx < data.length; idx++) {
					var icon_str = "";
					if (data[idx].type == "folder") {
						icon_str += "<div class='col-xs-3 col-md-3 project_wizard_second_button folder_item thumbnail'";	//jeongmin: adding grid and css for highlight
						icon_str += " filename='" + data[idx].text + "' filepath='" + data[idx].li_attr.path + "'>";
						icon_str += "<img src='images/goorm.core.file/folder.png'>";
					} else {
						icon_str += "<div class='col-xs-3 col-md-3 project_wizard_second_button file_item thumbnail'";	//jeongmin: adding grid and css for highlight
						icon_str += " filename='" + data[idx].text + "' filetype='" + data[idx].li_attr.file_type + "' filepath='" + data[idx].li_attr.path + "'>";
						icon_str += "<img src='images/goorm.core.file/file.png'>";
					}

					icon_str += "<div style='word-break:break-all; width:100px; line-height:12px; height: 20px; margin-left:auto; margin-right:auto; margin-top: 5px; margin-bottom:5px; text-align: center;'>";

					// if (data[idx].type == "folder") {
					// 	icon_str += data[idx].text;
					// } else {
					// 	icon_str += data[idx].text;
					// }
					if(data[idx].text.length > 28) {
						icon_str += data[idx].text.substr(0, 24) + ' ...';
					} else {
						icon_str += data[idx].text;
					}
					
					icon_str += "</div>";

					files.append(icon_str);
				}
			}

			folder_item = files.find("div.folder_item");
			file_item = files.find("div.file_item");
			folder_item.dblclick(function () {
				self.current_path = $(this).attr("filepath");
				var target = self.dir_tree_ori+"/"+self.current_path;
				self.treeview.open_node(target);
				self.treeview.select_node(target);
				self.set_location_path(self.current_path);
				self.add_file_items(self.current_path);
			});

			folder_item.click(function () {
				file_item.removeClass("selected_item");
				folder_item.removeClass("selected_item");
				$(this).addClass("selected_item");

				self.filename = $(this).attr("filename");
				self.filetype = $(this).attr("filetype");
				self.filepath = $(this).attr("filepath");
				// var node;
				// var list = $(self.dir_tree + ' div.ygtvitem td.ygtvcontent div.fullpath');
				// var path = $(this).attr('filepath') + '/' + $(this).attr('filename');
				
				// for (var i = 0; i < list.length; i++) {
				// 	var item = list[i];

				// 	var dir_path = $(item).html();
				// 	if ('/' + dir_path === path || dir_path === path) {
				// 		node = $(item).parent().parent().parent();

				// 		node.find('td').addClass('ygtvfocus');
				// 		node.find('.ygtvblankdepthcell').removeClass('ygtvfocus');
				// 		node.find('.ygtvdepthcell').removeClass('ygtvfocus');
				// 		break;
				// 	}
				// }

				// if(node){
				// 	var dir_top = $(self.dir_tree).offset().top;
				// 	var current_location = node.offset().top;
				// 	var scroll_top = $(self.dir_tree).scrollTop();

				// 	$(self.dir_tree).scrollTop(current_location + scroll_top - dir_top);
				// }
			});

			file_item.click(function(){
				file_item.removeClass("selected_item");
				folder_item.removeClass("selected_item");
				$(this).addClass("selected_item");

				self.filename = $(this).attr("filename");
				self.filetype = $(this).attr("filetype");
				self.filepath = $(this).attr("filepath");

				if (self.files === '#file_new_files') {
					$(self.input_file_name).val($(this).attr("filename"));
				}
			});

			

			
		});
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
	},

	bind: function () {
		var self = this;

		var files_container = self.files;
		var treeview_container = self.dir_tree;

		$(files_container).off("click.dialog");
		$(files_container).on("click.dialog", function () {
			$(this).focus();

			core.status.selected_dialog = self;
			core.status.selected_dialog_container = $(files_container);
			core.status.focus_on_dialog = true;
		});

		$(treeview_container).off("click.dialog");
		$(treeview_container).on("click.dialog", function () {
			$(this).focus();

			core.status.selected_dialog = self;
			core.status.selected_dialog_container = $(treeview_container);
			core.status.focus_on_dialog = true;
		});

		$(this.location_path).off("click", "a");
		$(this.location_path).on("click", "a", function(e){
			var path = self.dir_tree_ori + "/" + self.get_location_path(e);
			self.treeview.select_node(path);
		});
	},

	select_manager: function (container, key) {
		var self = this;
		if(container.selector === self.files) {
			var item = container.find(".selected_item");
			var select_first_item = function(){
				container.find("div:eq(0)").click();
			};
			switch(key) {
				case 'left':
				// left key down
					if(item.length) {
						if(item.prev()) item.prev().click();
					} else select_first_item();
					break;
				case 'up': 
				// up key down
					if(item.length) {
						var i = item.prev().prev().prev().prev();
						if(i.length) i.click();
					} else select_first_item();
					break;
				case 'right':
				// right key down
					if(item.length) {
						if(item.next()) item.next().click();
					} else select_first_item();
					break;
				case 'down':
				// down key down
					if(item.length) {
						var i = item.next().next().next().next();
						if(i.length) i.click();
					} else select_first_item();
					break;
				case 'enter':
				// enter key down
					if(item.length) {
						if(item.hasClass("folder_item")){
							item.dblclick();
						}
						else {
							var button = $(self.context).parents(".modal-content").find(".btn-primary");
							if(button.length) button.click();
						}
					} else select_first_item();
					break;
				case 'backspace':
				// backspace binding
				//	console.log("backspace");
					self.treeview.get_node(self.dir_tree_ori+"/"+self.get_location_path()).then(function(node){
						if(node.parent !== "#") {
							self.treeview.select_node(node.parent);
						}
					});
					break;
				default:
					break;
			}
		}
	},

	set_location_path : function(path){
		var self=this;

		var path_el_arr=path.split('/');
		$(self.location_path).empty();
		if(path_el_arr.length > 0){
			$(self.location_path).append("<span><a href='#' action>"+path_el_arr[0]+"</a></span>");
		}
		for(var i=1;i<path_el_arr.length;i++){
			$(self.location_path).append("<span class='path_divide_symbol'>/</span>");
			$(self.location_path).append("<span><a href='#' action>"+path_el_arr[i]+"</a></span>");
			//$(self.location_path).append("<li><a href='#' action>"+path_el_arr[i]+"</a></li>");
		}

	},

	get_location_path : function(e){
		var path="";

		if(e) {
			var current_path = $(e.target).parent("span");
			var prev_path = current_path.prevAll();
			var text = current_path.text();

			if(prev_path.length) {
				prev_path.reverse().each(function(i){
					path += $(this).text();// + "/";
				});
			}
			
			if (path && path[path.length - 1] !== '/') {
				text = '/' + text;
			}

			path += current_path.text();
		}
		else {
			$("span", this.location_path).each(function(i){
				path += $(this).text();
			});
		}

		return path;
	},

	set_keydown_event : function () {
		var self = this;
		$(this.files).off("keydown");
		$(this.files).keydown(function (e) {
			switch (e.which) {
				case 8: 		// backspace key
					self.select_manager($(self.files), "backspace");
					break;
				case 13: 		// enter key
					self.select_manager($(self.files), "enter");
					break;
				case 37: 		// left key
					self.select_manager($(self.files), "left");
					break;
				case 38: 		// up key
					self.select_manager($(self.files), "up");
					break;
				case 39: 		// right key
					self.select_manager($(self.files), "right");
					break;
				case 40: 		// down key
					self.select_manager($(self.files), "down");
					break;
			}
		});
	},

};
