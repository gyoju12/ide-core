/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


goorm.plugin.dart = {
	/*
		Properties
	 */
	name: "dart",
	// mainmenu: null,
	build_options: null,
	build_source: null,
	build_target: null,
	build_file_type: "o",

	/*
		Methods
	 */
	init: function() {


		core.module.project.add({
			'type': 'dart',
			'img': '/goorm.plugin.dart/images/dart.png',
			'items': [{
				'key': 'default_dart_project',
				'detail_type' : 'default',
				'img': '/goorm.plugin.dart/images/dart_console.png'
			},
			{
				'key': 'clock_sample',
				'detail_type' : 'clock',
				'img': '/goorm.plugin.dart/images/dart_console.png'
			},
			{
				'key': 'sunflower_sample',
				'detail_type' : 'sunflower',
				'img': '/goorm.plugin.dart/images/dart_console.png'
			},
			{
				'key': 'swipe_sample',
				'detail_type' : 'swipe',
				'img': '/goorm.plugin.dart/images/dart_console.png'
			},
			{
				'key': 'solar_sample',
				'detail_type' : 'solar',
				'img': '/goorm.plugin.dart/images/dart_console.png'
			}]
		});

		// this.add_project_item();

		// this.mainmenu = core.module.layout.mainmenu;

		//this.debugger = new org.uizard.core.debug();
		//this.debug_message = new org.uizard.core.debug.message();

		// this.cErrorFilter = /[A-Za-z]* error: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.cWarningFilter = /[A-Za-z]* warning: [A-Za-z0-9 '",:_\\\/\.\+\-\*\#\@]*/;
		// this.lineFilter = /:[0-9]*:/;

		// this.add_mainmenu();

		// this.add_menu_action();


		this.linter = core.module.plugin_linter;
		this.linter.init(this.name); // jeongmin: linter init
	},

/*
	add_project_item: function() {
		$("div[id='project_new']").find(".project_types").append("<a href='#' class='list-group-item project_wizard_first_button' project_type='dartp'><img src='/goorm.plugin.dart/images/dart.png' class='project_icon' /><h4 class='list-group-item-heading' class='project_type_title'>DART Project</h4><p class='list-group-item-text' class='project_type_description'>Dart Project (HTML5/Javascript)</p></a>");

		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all dartp thumbnail' description='  Create default Dart project' project_type='dart' plugin_name='goorm.plugin.dart'><img src='/goorm.plugin.dart/images/dart_console.png' class='project_item_icon'><div class='caption'><p>Default Dart project</p></div></div>");
		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all dartp thumbnail' description='  Create default Dart project' project_type='dart' plugin_name='goorm.plugin.dart'><img src='/goorm.plugin.dart/images/dart_console.png' class='project_item_icon'><div class='caption'><p>Clock sample</p></div></div>");
		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all dartp thumbnail' description='  Create default Dart project' project_type='dart' plugin_name='goorm.plugin.dart'><img src='/goorm.plugin.dart/images/dart_console.png' class='project_item_icon'><div class='caption'><p>Sunflower sample</p></div></div>");
		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all dartp thumbnail' description='  Create default Dart project' project_type='dart' plugin_name='goorm.plugin.dart'><img src='/goorm.plugin.dart/images/dart_console.png' class='project_item_icon'><div class='caption'><p>Swipe sample</p></div></div>");
		$("div[id='project_new']").find(".project_items").append("<div class='col-sm-6 col-md-3 project_wizard_second_button all dartp thumbnail' description='  Create default Dart project' project_type='dart' plugin_name='goorm.plugin.dart'><img src='/goorm.plugin.dart/images/dart_console.png' class='project_item_icon'><div class='caption'><p>Solar sample</p></div></div>");

		$(".project_dialog_type").append("<option value='dart'>Dart Projects</option>").attr("selected", "");

	},

	add_mainmenu: function() {
		var self = this;

		$("li[id='plugin_new_project']").after("<li class='plugin_project'><a href=\"#\" action=\"new_file_dart\">DART Project</a></li>");
		//this.mainmenu.render();
	},

	add_menu_action: function() {
		$("a[action=new_file_dart]").unbind("click");
		$("a[action=new_file_dart]").click(function() {
			core.dialog.new_project.show(function() { //jeongmin: define callback
				$("#project_new").find(".dialog_left_inner").scrollTop($("#project_new").find(".dialog_left_inner").scrollTop() + $(".project_wizard_first_button[project_type=dartp]").position().top); //jeongmin: the one who has to be scrolled is "the room" that have project_types and scroll position standard is always scrollTop()
			});

			$(".project_wizard_first_button[project_type=dartp]").trigger("click");
		});
	},
*/
	new_project: function(data) {


		var send_data = {
			"plugin": "goorm.plugin.dart",
			"data": data
		};

		core.module.project.create( send_data, function(result) {
			// update goorm.manifest file
			core.dialog.project_property.load_property(core.status.current_project_path, function(data) {
				// setTimeout(function() {
					var filepath = core.status.current_project_path + '/';
					var filename = 'main.dart';
					var filetype = 'dart';

					core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});
					core.module.layout.project_explorer.refresh();
					// $(core).trigger("on_project_open");

				// }, 500)


			});
		});
	},

	run: function(options, callback) {
		var self = this;
		var property = options.property;
		var path = options.path;

		var send_data = {
			"plugin": "goorm.plugin.dart",
			"data": {
				"project_path": path
			}
		};

		$.get('/plugin/run', send_data, function(result) {
			if (result.code == 200) {
				//success 
				if (result.run_path) {
					window.open('.' + result.run_path + '/index.html', 'goormDart', 'width=900, height=400');
				}
			}

			core.module.layout.select('terminal'); // jeongmin: show terminal tab
			callback();
		});
	},

	build: function(options, callback) {
		var property = options.property;
		var base_dir = core.preference.workspace_path + options.project_path + '/';
		console.log(property);
		var build_options = " " + property['plugin.dart.build_option'];
		var path = {
			'out': ' --out=' + base_dir + '/' + property['plugin.dart.main'] + '.dart.js',
			'target': ' ' + base_dir + property['plugin.dart.main'] + ".dart"
		}

		var cmd = "dart2js" + path.out + path.target + build_options;
		
		core.module.project.build(cmd, function() {
			core.module.layout.project_explorer.refresh();

			core.module.layout.select('terminal'); // jeongmin: show terminal tab
			if (callback) callback();
		});
	},

	clean: function(options) {}
};
