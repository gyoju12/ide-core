/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.object.explorer = function () {
	this.target = null;
	this.treeview_object = null;
	this.data = null;
};

goorm.core.object.explorer.prototype = {
	init: function (target) {
		$(target).empty();
		var self = this;

		self.target = target; // jQuery.extend(true,{},target);

		var container_height = $('#goorm_inner_layout_right').height();
		var tree_height = $('#goorm_inner_layout_right>.tab-content').height() - 99;

		$('#object_explorer').css('height', container_height);
		$('#object_tree').css('height', tree_height).css('overflow-y', 'auto').css('overflow-x', 'hidden').css('margin-left', '5px');

		$(core).on("layout_resized", function () {
			var container_height = $('#goorm_inner_layout_right').height();
			var tree_height = $('#goorm_inner_layout_right>.tab-content').height() - 99;

			$('#object_explorer').css('height', container_height);
			$('#object_tree').css('height', tree_height);
		});

		
	},

	clear : function(){
		$("#current_object_explorer").empty();
		$("#object_tree").empty();
	},

	refresh: function (target, treedata) {
		//console.log('object_tree_ refresh');
		var self = this;
		$("#current_object_explorer").empty();
		$("#object_tree").empty();

		var selected_file_path = "";
		if (core.module.layout.workspace.window_manager === null || core.module.layout.workspace.window_manager === undefined) {
			selected_file_path = '';
		} else if (core.module.layout.workspace.window_manager.active_filename === null || core.module.layout.workspace.window_manager.active_filename === undefined) {
			selected_file_path = '';
		} else {
			selected_file_path = core.module.layout.workspace.window_manager.active_filename;
		}

		if (selected_file_path === "") return;
		// if (!(selected_file_path.split(".").pop() == 'c' || selected_file_path.split(".").pop() == 'cpp')) return;

		//pass succeed
		var current_path_html = "";
		current_path_html += "<div style='padding:8px;'>" + selected_file_path + "</div>";

		$("#current_object_explorer").html(current_path_html);

		self.target = target; //jQuery.extend(true,{},target);
		self.data = jQuery.extend(true, {}, treedata);

		self.makeTreeData(self.data);

		if (self.data === null || self.data.children === undefined) {
			return;
		}

		self.treeview_object = new YAHOO.widget.TreeView(self.target, self.data.children);
		self.treeview_object.render();

		self.treeview_object.unsubscribe('clickEvent');
		self.treeview_object.subscribe('clickEvent', function (node_data){
			var extra_data = node_data.node.data;

			switch(extra_data.filetype) {
				case 'c/cpp':
					var line = extra_data.line;

					var active_window = core.module.layout.workspace.window_manager.active_window;
					var editor = core.module.layout.workspace.window_manager.window[active_window].editor.editor;

					var linedata = editor.getLine(line-1);
					var active_line = line - 1;
					if (linedata.indexOf(extra_data.name) == -1) {
						active_line = line; 
					}

					editor.setCursor(active_line);
					break;

				case 'java':
					var line = extra_data.line;

					var active_window = core.module.layout.workspace.window_manager.active_window;
					var editor = core.module.layout.workspace.window_manager.window[active_window].editor.editor;

					var linedata = editor.getLine(line-1);
					var active_line = line - 1;
					if (linedata.indexOf(extra_data.name) == -1) {
						active_line = line; 
					}

					editor.setCursor(active_line);
					break;

				case 'py':
					var line = extra_data.line;

					var active_window = core.module.layout.workspace.window_manager.active_window;
					var editor = core.module.layout.workspace.window_manager.window[active_window].editor.editor;

					var active_line = (line - 2 < 0) ? line - 1 : line - 2;
					var linedata = editor.getLine(active_line);
					if (linedata.indexOf(extra_data.name) == -1) {
						active_line = line - 1; 
					}

					editor.setCursor(active_line);
					break;

				case 'css':
					var line = extra_data.line;

					var active_window = core.module.layout.workspace.window_manager.active_window;
					var editor = core.module.layout.workspace.window_manager.window[active_window].editor.editor;

					editor.setCursor(line-1);
					break;
				case 'html':
					var line = extra_data.line;

					var filepath = extra_data.filepath;
					filepath = filepath.split('/');
					filepath.pop();
					filepath = filepath.join('/') + '/';

					var filename = extra_data.filepath.split('/').pop();
					var filetype = filename.split('.').pop();

					// 콜백으로 수정
					// $(core).unbind(filepath + '/' + filename + 'window_loaded');
					// $(core).bind(filepath + '/' + filename + 'window_loaded', function(){
					// 	var active_window = core.module.layout.workspace.window_manager.active_window;
					// 	var editor = core.module.layout.workspace.window_manager.window[active_window].editor.editor;

					// 	editor.setCursor(line-1);
					// });

					core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, null, function cb(){
						var active_window = core.module.layout.workspace.window_manager.active_window;
						var editor = core.module.layout.workspace.window_manager.window[active_window].editor.editor;

						editor.setCursor(line-1);
					});

					var active_window = core.module.layout.workspace.window_manager.active_window;
					var editor = core.module.layout.workspace.window_manager.window[active_window].editor.editor;

					editor.setCursor(line-1);
					break;
				default:
					break;
			}
		});
	},
	makeTreeData: function (input) {
		var self = this;
		if (input.children === undefined) {
			self.data = null;
			return;
		}

		for (var i = 0; i < input.children.length; i++) {
			self.build(input.children[i]);
		}
	},
	//object tree build
	build: function (input) {
		var self = this;

		if(!input.detailed_type) input.detailed_type = input.type;
		input.cls = input.type;
		input.type = "html";
		input.html = "<div class='node'>";
		input.html += '<img src="/images/goorm.core.outline/' + input.cls + '_type.png"  style="width:10px;margin-left:2px;margin-right:6px;">';

		if(input.use_detailed === false) {
			input.html += input.name + "</div>";
		}
		else{
			input.html += input.name + "(" + input.detailed_type + ")" + "</div>";
		}

		if (input.children === undefined) {
			return;
		}
		if (input.children.length > 0) {
			for (var i = 0; i < input.children.length; i++) {
				self.build(input.children[i]);
			}
		}

	},

	resize : function() {

	}
};
