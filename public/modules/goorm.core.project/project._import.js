/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project._import = {
	dialog: null,
	buttons: null,
	project_detailed_type_list: [],
	target_zip_file: null,
	// dialog_explorer: null,
	import_list_done: false, // jeongmin: whether project type list is made or not in import dialog
	new_list_done: false, // jeongmin: whether project type list is made or not in new project dialog

	init: function(where) {

		var self = this;

		this.panel = $('#dlg_import_project');

		this.dialog = new goorm.core.dialog();
		this.dialog.init({
			// localization_key: 'title_import_project',
			id: 'dlg_import_project',
			handle_ok: self.handle_ok,
			success: self.success
		});

		// this.dialog_explorer = new goorm.core.dialog.explorer('#file_import', this);

		// bind enter -> ok button. Jeong-Min Im.
		this.panel.find('.input_import_project_name').keydown(function(e) {
			if (e.keyCode == 13) {
				$('#g_ip_btn_ok').click();
			}
		});
	},

	//check validation of project information and submit the import form. Jeong-Min Im.
	handle_ok: function(where) { //where(jQuery Object or jQuery Event): new project or import project -> in import project dialog, ok button click event comes in.
		var localization_msg = core.module.localization.msg;

		var self = core.module.project._import; // handle_ok is passed to dialog, so scope isn't in goorm.core.project._import

		////// determine where user imports project. Handle_ok is occurred by ok button. //////
		if (where.target && where.target.id == 'g_ip_btn_ok') {
			where = self.panel; // g_ip_btn_ok == import project
		}

		//check start
		//input_import_project_author
		// input_import_project_author_name
		// select_import_project_type
		// input_import_project_name
		// input_import_project_desc
		// project_import_file
		if (where.find('.input_import_project_author_name').val() === '') {
			alert.show(localization_msg.alert_project_author);
			return false;
		} else if (where.find('.select_import_project_detail_type').val() === '') {
			alert.show(localization_msg.alert_project_detailed_type);
			return false;
		} else if (where.find('.input_import_project_name').val() === '') {
			alert.show(localization_msg.alert_project_name);
			return false;
		} else if (!/^[\w-_]*$/.test(where.find('.input_import_project_name').val())) {
			alert.show(localization_msg.alert_allow_character);
			return false;

			//}else if(!self.target_zip_file || (self.target_zip_file.type!=='application/x-zip-compressed'  && self.target_zip_file.type!=='application/zip') ){
		} else if (where.find('.project_import_file').val() == '') {
			alert.show(localization_msg.alert_no_imported_file);
			return false;
		} else if (where.find('.project_import_file').val().split('.').pop() !== 'zip' && where.find('.project_import_file').val().split('.').pop() !== 'tar' && where.find('.project_import_file').val().split('.').pop() !== 'gz') {
			alert.show(localization_msg.alert_unsupported_file_type);
			return false;
		}
		//check end

		for (var i = 0; i < self.project_detailed_type_list.length; i++) {
			if (where.find('.select_import_project_detail_type').val() === self.project_detailed_type_list[i].project_detailed_type && where.find('.select_import_project_detail_type').find(':selected').attr('type') === self.project_detailed_type_list[i].project_type) {
				where.find('.select_import_project_detail_type').attr('plugin_name', self.project_detailed_type_list[i].plugin_name);
				where.find('.select_import_project_detail_type').attr('project_detailed_type', self.project_detailed_type_list[i].project_detailed_type);
				where.find('.select_import_project_detail_type').attr('project_type', self.project_detailed_type_list[i].project_type);
				break;
			}
		}

		var plugin_name = where.find('.select_import_project_detail_type').attr('plugin_name');
		//goorm.plugins.dart.....
		var plugin = {};
		core.preference.plugins[plugin_name] && (plugin[plugin_name] = core.preference.plugins[plugin_name]);

		var project_desc = where.find('.input_import_project_desc').val();
		project_desc = project_desc.replace(/&(lt|gt);/g, function(strMatch, p1) {
			return (p1 == 'lt') ? '<' : '>';
		});
		project_desc = project_desc.replace(/<\/?[^>]+(>|$)/g, '');

		var senddata = {
			project_type: where.find('.select_import_project_type').attr('project_type'),
			//
			project_detailed_type: where.find('.select_import_project_detail_type').attr('project_detailed_type'),

			// project_author: where.find('.input_import_project_author').val(),
			// project_author_name: where.find('.input_import_project_author_name').val(),
			project_name: where.find('.input_import_project_name').val(),
			project_desc: project_desc,
			plugins: plugin,

		};
		//$.get('project/new', senddata, function(data) {	// jeongmin: current new project uses socket
		var cb = function(data) {
			if (data.err_code === 0) {
				var project_dir = core.user.id + '_' + data.project_name;

				//core.status.current_project_path = project_dir;
				//core.status.current_project_name = data.project_name;
				//core.status.current_project_type = data.project_type;

				// if (where.attr('id') == 'dlg_import_project')	// hidden by jeongmin: first of all, project must be opened no matter what type of import

				

				// {

				// 	var formData = new FormData($('#project_import_form'));

				// 	//for (var i = 0; i < files.length; i++) {
				// 	if(!self.target_zip_file){
				// 		//empty zip
				// 		return false;
				// 	}

				// 	formData.append('file', self.target_zip_file);
				// 	formData.append('project_import_location', core.status.current_project_path);
				// 	// now post a new XHR request
				// 	var xhr = new XMLHttpRequest();
				// 	xhr.open('POST', '/project/import');
				// 	xhr.onloadstart = function(){
				// 		core.module.loading_bar.start('Import processing...');
				// 	};
				// 	xhr.onerror = function () {
				// 		core.module.loading_bar.stop();
				// 		alert.show('Import error');
				// 	};

				// 	xhr.onloadend = function () {
				// 		core.module.loading_bar.stop();
				// 		console.log(xhr);

				// 		if (xhr.status === 200) {
				// 			console.log('all done: ' + xhr.status);
				// 	  	} else {
				// 	  		alert.show('Import Fail');
				// 			console.log('Something went terribly wrong...');
				// 	  	}

				// 	  	setTimeout(function(){
				// 	  		core.module.layout.project_explorer.refresh();
				// 	  	},500);

				// 	};

				// 	xhr.send(formData);

				// }

				core.module.layout.terminal.resize();
			} else {
				goorm.core.project._import.progress_elements.stop();
				alert.show(data.message);
				return false;
			}

			// if (where.attr('id') == 'dlg_import_project')
			// 	self.panel.modal('hide');
		};

		////// check imported project is valid. Jeong-Min Im. -> same as new project //////
		core._socket.once('/project/valid', function(valid) {
			function project_new() {
				if (where.find('.project_import_form').attr('action') == 'project/import') { // jeongmin: only when import is really in progress
					var progress_elements = core.module.loading_bar.start({
						str: core.module.localization.msg.import_in_progress,
						unique: 'project.import',
						beforeStop: function() {
							$('#dlg_import_project #g_ip_btn_ok').removeAttr('disabled');
						}
					});
					if (!progress_elements) {
						return false;
					}
					goorm.core.project._import.progress_elements = progress_elements;
					$('#dlg_import_project #g_ip_btn_ok').attr('disabled', 'disabled');
					core._socket.once('/project/new', cb);
					core._socket.emit('/project/new', senddata);
				}
			}
			if (valid.result) {
				project_new();
			} else {
				switch (valid.err_code) {
					// Over Limit...
					//
					case 1:
						alert.show(localization_msg.alert_project_over_limit + valid.limit);
						break;

						// Project Exist...
						//
					case 2:
						alert.show(localization_msg.alert_project_exist);
						break;

						// Duplicated Name Exists...
						//
					case 3:
						confirmation.init({
							title: localization_msg.project_duplicate,
							message: localization_msg.confirmation_do_you_want_to_project_update,
							yes_text: localization_msg.yes,
							no_text: localization_msg.no,
							title: localization_msg.confirmation_title,
							yes: function() {
								project_new();
							},
							no: null
						});
						confirmation.show();
						break;
				}

			}
		});

		core._socket.emit('/project/valid', senddata);

		// if (where.attr('id') == 'dlg_import_project') {
		// 	if (typeof(this.hide) !== 'function' && self.panel) {

		// 		self.panel.modal('hide');
		// 	} else {

		// 		self.panel.modal('hide');
		// 	}
		// }
	},

	//make submit options. Jeong-Min Im.
	success: function(where) { //where(jQuery object): undefined or new project -> in import project dialog, there is no parameter
		var self = this;
		if (!where) {//import project dialog
			where = $('#dlg_import_project');
		}

		// ////// jeongmin: manually change button's active state //////
		// $('[name=project_import_datatype]').on('ifChecked', function() {
		// 	$('#import_project_type .active').removeClass('active'); // remove old active button
		// 	$(this).parent().parent().addClass('active'); // set active this button (hierarchy: label > iCheck > input)
		// });

		var form_options = {
			target: where.find('.project_import_upload_output'),

			success: function(data) {
				// core.progressbar.set(100);

				if (data.type == 'check') {
					if (data.result && data.result.type && where.find('.select_import_project_type [value=' + data.result.type + ']').length) { // goorm.manifest exists) { // it's goorm project
						var detailed_type = data.result.detailedtype;

						// do it after list is set. Jeong-Min Im.
						$(core).one('change_done', function() {
							if (where.find('.select_import_project_detail_type [value="' + detailed_type + '"]').length) { // jeongmin: only if this detailedtype exists
								where.find('.select_import_project_detail_type').val(detailed_type);
							}
						});

						where.find('.select_import_project_type').val(data.result.type);
						where.find('.select_import_project_type').change();

						where.find('.input_import_project_name').val(data.result.name); // jeongmin: fill with imported project's name
						where.find('.input_import_project_desc').val(data.result.description); // jeongmin: fill with imported project's name
					} else {
						// There is no goorm.manifest in zip/tar file
						switch (data.err_code) {
							case 1: // on Mac
							case 2: // on Linux
								alert.show(core.module.localization.msg.alert_invalid_compressed_file);
								where.find('.project_import_file[type=file]').val('');
								break;
							case 9:
							case 10:
								alert.show(core.module.localization.msg.alert_invalid_project_file);
								where.find('.project_import_file[type=file]').val('');
								// where.find('.input_import_project_author').val(core.user.id.replace(/ /g, '_'));
								// where.find('.input_import_project_author_name').val(core.user.name.replace(/ /g, '_'));
								break;
							case 50:
								alert.show(core.module.localization.msg.alert_limit_file_size);
								break;

							default:
								var first_type = $(where.find('.select_import_project_type').children()[0]).val();

								where.find('.select_import_project_type').val(first_type);
								where.find('.select_import_project_type').change();
						}
					}
				} else {
					core.module.project._import.progress_elements.stop(); // jeongmin: 'import is in progress' loading bar
					where.modal('hide'); // jeongmin: import project dialog
					//useonly(mode=goorm-standalone,goorm-oss)
					if (data.err_code === 0) {
						// notice.show(data.message);
						notice.show(core.module.localization.msg.notice_process_done);

						core.module.layout.project_explorer.refresh();
					} else {
						alert.show(data.message);
					}
					

					
				}
			},

			error: function() {
				// core.progressbar.set(100);
				self.progress_elements.stop();
			}
		};

		where.find('.project_import_form').ajaxForm(form_options);
		where.find('.project_import_form').submit(function() {
			return false;
		});

		var __check = function() {
			where.find('.project_import_form').attr('action', 'project/import/check');
			where.find('.project_import_form').submit();
		}

		var __load = function() {
			where.find('.project_import_form').attr('action', 'project/import');
		}

		where.find('.project_import_file').change(function() {
			if (where.find('.project_import_file').val() != '') {
				__check();
				__load();
			} else {
				where.find('.input_import_project_name').val('');
				where.find('.input_import_project_desc').val('');
				where.find('.project_import_file').val('');
			}
		});
	},

	show: function(where) { //where(jQuery object): new project or import project dialog
		// if (where.attr('id') == 'dlg_import_project')
		// this.dialog_explorer.init(true, true);
		//for init

		where.find('.input_import_project_author_name').val(core.user.name.replace(/ /g, '_'));
		where.find('.input_import_project_author_name').attr('readonly', 'readonly');
		where.find('.input_import_project_author_name').addClass('readonly');

		where.find('.input_import_project_name').val('');
		where.find('.input_import_project_desc').val('');
		where.find('.project_import_file').val('');

		//where.find('.select_import_project_detail_type option')[0].selected = true;

		if (!this.import_list_done && where.attr('id') == 'dlg_import_project') {
			this.make_project_detailed_type_list(where);
			this.make_project_type_list(where);

			this.import_list_done = true;
		} else if (!this.new_list_done && where.attr('id') == 'dlg_new_project') {
			this.make_project_detailed_type_list(where);
			this.make_project_type_list(where);

			this.new_list_done = true;
		}

		where.find('.select_import_project_type option')[0].selected = true;
		where.find('.select_import_project_type option').change();

		this.target_zip_file = null;
		where.find('.project_import_upload_output').text('');

		where.one('shown.bs.modal', function(e) {
			where.find('.input_import_project_name').focus();
		});

		if (where.attr('id') == 'dlg_import_project') {
			this.panel.modal('show');
			
		}		
	},

	// make project type list from new project wizard dialog. Jeong-Min Im.
	make_project_type_list: function(where) { //where(jQuery object): new project or import project dialog
		var self = this;
		var type_button = $('.project_wizard_first_button');
		var select_project_type = where.find('.select_import_project_type');
		var select_project_detail_type = where.find('.select_import_project_detail_type');

		for (var i = 0; i < type_button.length; i++) {
			var category = $(type_button[i]).attr('category');

			if (category && ~category.indexOf('examples')) { // jeongmin: examples will be in its own language project
				continue;
			}

			var project_name = $(type_button[i]).find('.list-group-item-heading').html();
			var project_type = $(type_button[i]).attr('project_type');

			if (project_type == 'all') {
				continue;
			}

			// align project types...
			// switch (project_type) {
			// 	case 'dartp':
			// 		project_type = 'dart';
			// 		break;

			// 	case 'javap':
			// 		project_type = 'java';
			// 		break;

			// 	case 'javaexamp':
			// 		project_type = 'java_examples';
			// 		break;

			// 	case 'jqueryp1':
			// 		project_type = 'jquery';
			// 		break;

			// 	case 'jspp':
			// 		project_type = 'jsp';
			// 		break;

			// 	case 'nodejsp':
			// 		project_type = 'nodejs';
			// 		break;

			// 	case 'phonegapp':
			// 		project_type = 'phonegap';
			// 		break;

			// 	case 'phpp':
			// 		project_type = 'php';
			// 		break;

			// 	case 'webp':
			// 		project_type = 'web';
			// }

			select_project_type.append('<option value="' + project_type + '">' + project_name + '</option>');
		}

		// make this project type's detail list
		select_project_type.on('change', function(e) {
			var project_type = $(this).val();

			$(this).attr('project_type', project_type);

			select_project_detail_type.empty(); // initialize

			for (var i = 0; i < self.project_detailed_type_list.length; i++) {
				if (self.project_detailed_type_list[i].project_type == project_type) {
					var detail_type = self.project_detailed_type_list[i].project_detailed_type;
					var detail_type_name = $('.project_wizard_second_button[project_type=' + project_type + '][detail_type=' + detail_type + ']').text();

					select_project_detail_type.append('<option value="' + detail_type + '" type="' + project_type + '">' + detail_type_name + '</option>');
				}
			}
			$(core).trigger('change_done');
		});
		select_project_type.change();
	},

	//only once executed
	make_project_detailed_type_list: function(where) { //where(jQuery object): new project or import project dialog
		var self = this;
		var detail_button = $('.project_wizard_second_button');

		if (self.import_list_done || self.new_list_done) {
			return;
		}

		for (var i = 0; i < detail_button.length; i++) {
			// if ($(detail_button[i]).attr('plugin_name').indexOf('examples') > -1 || $(detail_button[i]).text().indexOf('sample') > -1) {	// jeongmin: example project also can be imported, so don't skip
			// 	continue;
			// }
			self.project_detailed_type_list.push({
				'project_detailed_type': $(detail_button[i]).attr('detail_type'),
				'project_type': $(detail_button[i]).attr('project_type'),
				'plugin_name': $(detail_button[i]).attr('plugin_name')
			});
		}
	}
};
