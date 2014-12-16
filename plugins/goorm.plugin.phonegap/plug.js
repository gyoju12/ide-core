/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


goorm.plugin.phonegap = {
	/*
		Properties
	 */
	name: "phonegap",
	dialogs: {},
	// mainmenu: null,
	current_debug_project: null,
	terminal: null,
	breakpoints: null,
	preference: null,
	error_message_save: [],
	error_marker: [],
	output_tab: null,

	/*
		Methods
	 */
	init: function() {
		var self = this;

		core.module.project.add({
			'type': 'phonegap',
			'img': '/goorm.plugin.phonegap/images/phonegap.png',
			'items': [{
				'key': 'phonegap_project',
				'detail_type': 'phonegap',
				'img': '/goorm.plugin.phonegap/images/phonegap_console.png'
			}]
		});

		$(core).on('on_project_open', function() {
			//self.add_output_tab();
		});

		this.init_dialogs();

		this.preference = core.preference.plugins['goorm.plugin.phonegap'];

		this.init_css();
	},

	add_output_tab: function() {
		var self = this;
		var tabview = core.module.layout.inner_bottom_tabview;

		if (tabview.output_tab) {
			$("#output_tab").html("");
			tabview.removeTab(tabview.output_tab);
			tabview.output_manager.detach();

			tabview.output_tab = null;
			tabview.output_manager = null;
		}

		if (core.status && /phonegap/.test(core.status.current_project_type) && $("#output_tab").length == 0) {
			self.attach_output(tabview);
		}
	},

	new_project: function(data) {
		var self = this;
		var send_data = {
			"plugin": "goorm.plugin.phonegap",
			"data": data
		};

		var progress_elements = core.module.loading_bar.start({
			str: core.module.localization.msg.import_sync_to_file_system,
		});

		_$.get('/plugin/new', send_data, function(result) {
			progress_elements.stop();

			var property = core.property.plugins['goorm.plugin.phonegap'];

			var main_file_path = core.status.current_project_path + "/" + property['plugin.phonegap.run_index'];

			var filename = (main_file_path.split("/")).pop();
			var filepath = main_file_path.replace(filename, "");
			var filetype = 'html';

			core.module.layout.workspace.window_manager.open(filepath, filename, filetype, null, {});
		});
	},

	run: function(options) {

		var self = this;
		var path = options.path;
		var property = options.property;
		var send_data = {
			"plugin": "goorm.plugin.phonegap",
			"data": {
				"project_path": path
			}
		};

		core.module.project.create(send_data, function(result) {
			if (result.code == 200) {
				//success 
				if (result.run_path) {
					if (property['plugin.phonegap.webview_type'] == "window") {
						// open web view on new window
						window.open('.' + result.run_path + property['plugin.phonegap.run_index'], 'goormPhonegap');
					} else {
						// open web view on panel
						var window_manager = core.module.layout.workspace.window_manager;
						var main_file_path = property['plugin.phonegap.run_index'];
						var filename = property['plugin.phonegap.run_index'];
						var filepath = result.run_path;
						var filetype = 'WebView';
						var title = core.status.current_project_path + "/" + property['plugin.phonegap.run_index'];

						var index = window_manager.is_opened(filepath, filename);
						if (index == -1) {
							window_manager.open(filepath, filename, filetype, "WebView", {
								title: title
							});
						} else {
							var webview = window_manager.open(filepath, filename, filetype, "WebView", {
								title: title
							});
							var iframe = $(webview.panel.element).find("iframe");
							if (iframe.length) iframe[0].contentWindow.location.reload(true);
						}
					}
				}
			}

			core.module.layout.select('terminal'); // jeongmin: show terminal tab
		});

	},

	build: function(options, callback) {
		var property = options.property;
		var base_dir = core.preference.workspace_path + options.project_path + '/';

		if (this.panel) {
			var el = this.panel;
			var remote_id = property["plugin.phonegap.remote_id"];
			var remote_password = property["plugin.phonegap.remote_password"];
			var build_platform = property["plugin.phonegap.build_platform"];

			el.find("input[name='plugin.phonegap.remote_id']").val(remote_id);
			el.find("input[name='plugin.phonegap.remote_password']").val(remote_password);
			el.find("select[name='plugin.phonegap.build_platform'] option[value='" + build_platform + "']").prop("selected", true);

			this.panel.modal('show');
		}

		core.module.layout.select('terminal'); // jeongmin: show terminal tab
		if (callback) callback();
	},

	init_dialogs: function() {
		var self = this;
		var build = function() {
			var el = $(self.panel);
			var remote_id = el.find("input[name='plugin.phonegap.remote_id']").val();
			var remote_password = el.find("input[name='plugin.phonegap.remote_password']").val();
			var build_platform = el.find("select[name='plugin.phonegap.build_platform'] option:selected").val();
			var language_data = core.module.localization.language_data[core.module.localization.language]['goorm.plugin.phonegap'];

			if (remote_id == "" || remote_password == "") {
				alert.show(language_data['plugin.phonegap.enter_account'].value);
				return false;
			}

			var property = core.property;
			var plugin = property.plugins['goorm.plugin.phonegap'];

			plugin["plugin.phonegap.remote_id"] = remote_id;
			plugin["plugin.phonegap.remote_password"] = remote_password;
			plugin["plugin.phonegap.build_platform"] = build_platform;

			core.module.project.property.save();

			// sync with property dialog
			core.module.project.property.fill_dialog(property);

			var projectName = core.status.current_project_path;
			var workspace = core.preference.workspace_path + projectName + "/";


			core.module.layout.terminal.send_command("cd " + workspace + "\r");
			core.module.layout.terminal.send_command("phonegap remote logout\r");
			core.module.layout.terminal.send_command("phonegap remote run " + build_platform + "\r");
			core.module.layout.terminal.send_command(remote_id + "\r", /username|error/);
			core.module.layout.terminal.send_command(remote_password + "\r", /password|error/, function(res) {
				var error = null;
				if (error = res.match(/\[error\].*(\{.*\})/)) {
					var msg = JSON.parse(error[1]);
					if (msg.error)
						alert.show(language_data['plugin.phonegap.build_error'].value + ' : ' + msg.error);
					else alert.show(language_data['plugin.phonegap.build_error'].value + "!");
					return;
				}
				var qrcode_raw = res.match(/\[47m  .*\[47m  /);
				var qrcode = "";
				if (qrcode_raw) {
					qrcode = self.parse_qrcode(qrcode_raw[0]);
					var tabview = core.module.layout.inner_bottom_tabview;
					tabview.output_manager.storage = qrcode;
					tabview.output_manager.render();

					tabview.selectTab(tabview.getTabIndex(tabview.output_tab));
				}
			}, /install.*QRCode|error/);
			core.module.layout.terminal.send_command("phonegap remote logout\r");

			// if (typeof(this.hide) !== 'function' && panel) {
			// 	panel.hide();
			// }
			// else{
			// 	this.hide();
			// }

			self.panel.modal('hide');
		};



		// var handle_cancel = function() { 
		// 	this.hide(); 
		// };
		// var buttons = [ 
		// 	{ id:"gPluginPhonegapBuildB_OK", text:"<span localization_key='build'>Build</span>",  handler:build},
		// 	{ id:"gPluginPhonegapBuildB_CNCL", text:"<span localization_key='cancel'>Cancel</span>",  handler:handle_cancel}
		// ];
		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key:"title_phonegap_build",
			id: "dlg_phonegap_plugin_build",
			handle_ok: build,
			// title:"Phonegap Build", 
			// path:"configs/dialogs/goorm.core.plugin/plugin.phonegap.build.html",
			// width:400,
			// height:300,
			// modal:true,
			// yes_text: "<span localization_key='ok'>OK</span>",
			// no_text: "<span localization_key='close'>Close</span>",
			// buttons: buttons,
			success: function() {
				self.panel = $('#dlg_phonegap_plugin_build');

				var element = self.panel;
				$(element).find("input").on("keydown", function(e) {
					if (e.keyCode == 13) {
						event.preventDefault();
						event.stopPropagation();
						build.call(panel, panel);
					}
				});
			}
		});

		// this.dialogs.build = dialog;
	},

	parse_qrcode: function(data) {
		// remove meta character
		data = data.replace(/\x1b/g, "");
		data = data.replace(/\[0m\[47m  /g, "0");
		data = data.replace(/\[47m  /g, "0");
		data = data.replace(/\[0m  /g, "1");
		while (/0  /.test(data)) {
			data = data.replace(/0  /g, "0");
		}
		while (/1  /.test(data)) {
			data = data.replace(/1  /g, "11");
		}

		return data;
	},

	init_css: function() {
		$('body').append("<style>.phonegap_qrcode {border: none;border-collapse:collapse;}.phonegap_qrcode td {width: 5px;height: 5px;}.phonegap_qrcode .qrcode_black {background: black;}</style>");
	},

	attach_output: function(target) {
		var self = this;
		this.output_tab = null;
		this.output_tab = new YAHOO.widget.Tab({
			label: "<span id='gLayoutTab_Output' localization_key='output'>Output</span>",
			content: "<div id='output_tab'></div>"
		});

		target.addTab(self.output_tab);
		target.output_tab = this.output_tab;
		target.output_manager = this.output_manager;

		self.output_manager.init(target, $('#output_tab'));

		if (!core.is_mobile) {
			core.module.localization.local_apply('#goorm_inner_layout_bottom .yui-nav', 'dict');
		}
	},

	output_manager: {
		'container': null,
		'storage': "",

		init: function(tabview, container) {
			this.tabview = tabview;
			this.attach(tabview, container);
		},

		attach: function(tabview, container) {
			var self = this;
			this.container = container;

			if ($(container).find('#output_table').length != 0) $(container).find('#output_table').remove();
			$(container).append('<div id="output_table"></div>');

			var layout_bottom_height = $("div.yui-layout-unit-bottom div.yui-layout-wrap").height() - 26;
			var layout_bottom_width = $("div.yui-layout-unit-bottom div.yui-layout-wrap").width();

			$(container).height(layout_bottom_height);
			$(container).find('#output_table table').css('width', '100%');
			$(container).find('#output_table table').css('border', 'none');

			$(core).on("layout_resized", function() {
				var layout_bottom_height = $("div.yui-layout-unit-bottom div.yui-layout-wrap").height() - 26;
				var layout_bottom_width = $("div.yui-layout-unit-bottom div.yui-layout-wrap").width();

				$(container).height(layout_bottom_height);
			});

			this.restore();
		},

		detach: function() {
			var container = this.container;
			var tabview = this.tabview;

			if (container) {
				$('#output_table').remove();
			}
		},

		render: function() {
			var self = this;

			// qrcode length should be 51*51
			if (this.storage.length != 51 * 51) return;

			var table = $('<table class="phonegap_qrcode" style="width:auto;">');
			for (var i = 0; i < 51; i++) {
				table.append("<tr>");
			}
			for (var i = 0; i < 51; i++) {
				table.find("tr").append("<td>");
			}
			table.find("td").each(function(i) {
				if (self.storage[i] == '1')
					$(this).addClass("qrcode_black");
			});
			$('#output_table').html('Install application by scanning QRcode below.');
			$('#output_table').append(table);
		},

		restore: function() {
			var tabview = this.tabview;

			if (this.storage != "") {
				this.render();
			}
		},

		clear: function() {
			var tabview = this.tabview;
			this.storage = "";
		}
	},

	clean: function(options) {
		var property = options.property; // Kim Donguk : refactoring 
		var plugin = property.plugins['goorm.plugin.phonegap'];
		var buildPath = plugin['plugin.phonegap.build_path'];

		core.module.layout.terminal.send_command('\n\r');
		core.module.layout.terminal.send_command("rm -rf " + options.workspace + options.project_path + "/" + buildPath + "* \r", function() {
			core.module.layout.project_explorer.refresh();
		});
	},

	//auto import
	organize_import: function(data) {
		var self = this;
		var result_split = data;
		var err_phonegap_file = [];
		var missing_symbol = [];

		//build result parsing start
		for (var i = 0; i < result_split.length; i++) {
			if (/cannot find symbol/g.test(result_split[i])) {
				//determine err phonegap file
				if (((result_split[i - 1] + "").split('\n').pop()).indexOf(core.module.layout.workspace.window_manager.active_filename) == -1) {
					//not in current editor
					continue;
				}
				err_phonegap_file.push((result_split[i - 1] + "").split('\n').pop());

				//determine missing symbol
				var missing_err = (result_split[i] + "").split("\n");
				for (var k = 0; k < missing_err.length; k++) {
					if (missing_err[k].indexOf('symbol:') != -1) {
						missing_symbol.push(missing_err[k].split(' ').pop().split('\r')[0]);
						break;
					}
				}

			}

		}
		//parsing end

		// console.log(err_phonegap_file);
		// console.log(missing_symbol);

		//core.status.err_phonegap_file=err_phonegap_file;
		//core.status.missing_symbol=missing_symbol;

		core.status.missing_symbol = [];
		core.status.err_phonegap_file = [];

		for (var i = 0; i < missing_symbol.length; i++) {
			var pre = false;
			for (var k = 0; k < core.status.missing_symbol.length; k++) {
				if (missing_symbol[i] == core.status.missing_symbol[k]) {
					pre = true;
					break;
				}
			}
			if (!pre) {
				core.status.missing_symbol.push(missing_symbol[i] + "");
				core.status.err_phonegap_file.push(err_phonegap_file[i] + "");
			}
		}


		//query to server
	},
};