/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.project.list = function() {
	this.context = null;
	this.table_context = null;

	this.location = null;
	this.types = null;
	this.list = null;

	this.information = null;
	this.information_script = "";

	this.path = null;
	this.name = null;
	this.type = null;
};

goorm.core.project.list.prototype = {

	init: function(context, list_callback) {
		var self = this;

		this.location = context + "_location";
		this.types = context + "_types";
		this.list = context + "_list";
		this.information = context + "_information";
		this.information_script = "<dt localization_key='project_info_type'>Project Type : </dt><dd>[PROJECT_TYPE]</dd> \
								   <dt localization_key='project_info_detail'>Project Detail : </dt><dd>[PROJECT_DETAIL]</dd> \
								   <dt localization_key='project_info_author'>Project Author : </dt><dd>[PROJECT_AUTHOR]</dd> \
								   <dt localization_key='project_info_name'>Project Name : </dt><dd>[PROJECT_NAME]</dd> \
								   <dt localization_key='project_info_description'>Project Description : </dt><dd>[PROJECT_DESCRIPT]</dd> \
								   <dt localization_key='project_info_date'>Project Date : </dt><dd>[PROJECT_DATE]</dd>";


		this.path = context + "_path";
		this.name = context + "_name";
		this.type = context + "_type";

		$(this.location).val("");
		$(this.list).empty();
		$(this.information).empty();
		if(context == "#project_export") {
			this.add_project_list("export_list",list_callback);	
		} else {
			this.add_project_list("",list_callback);	
		}
		
		this.add_project_item();
	},


	/**
	 * Init Datatable
	 * @method init
	 * @return {datatable}
	 */
	init_datatable: function(context) { // container id
		this.context = context;
		this.table_context = context + '_jquery_table';

		var dictionary_type = (core.module.localization && core.module.localization.msg && core.module.localization.msg.dictionary_type) ? core.module.localization.msg.dictionary_type : 'type';
		var dictionary_name = (core.module.localization && core.module.localization.msg && core.module.localization.msg.dictionary_type) ? core.module.localization.msg.dictionary_name : 'name';
		var dictionary_author = (core.module.localization && core.module.localization.msg && core.module.localization.msg.dictionary_type) ? core.module.localization.msg.dictionary_author : 'author';
		var project_empty = (core.module.localization && core.module.localization.msg && core.module.localization.msg.project_empty) ? core.module.localization.msg.project_empty : 'Proejct does not exist.';

		$('#' + this.context).html('<table cellpadding="0" cellspacing="0" border="0" class="display table table-hover table-condensed table-bordered table-striped" id="' + this.table_context + '" ></table>')
		this.table = $('#' + this.table_context).dataTable({
			"aaData": [],
			"aoColumns": [{
					"mData": 'check',
					"sClass": "project_list_check text-center",
					"sTitle": ''
				}, {
					"mData": 'type',
					"sClass": "project_list_type",
					"sTitle": '<span localization_key="dictionary_type">' + dictionary_type + '</span>'
				}, {
					"mData": 'name',
					"sClass": "project_list_name",
					"sTitle": '<span localization_key="dictionary_name">' + dictionary_name + '</span>'
				}, {
					"mData": 'author',
					"sClass": "project_list_author",
					"sTitle": '<span localization_key="dictionary_author">' + dictionary_author + '</span>'
				}

			],
			"sDom": '<"H">rt',
			"oLanguage": {
				"sEmptyTable": '<span localization_key="project_empty">' + project_empty + '</span>'
			}
		});

		this.set_event();

		return this;
	},

	set_event: function() {
		var self = this;

		// Click Event
		//
		$('#' + this.context).on("click", "tbody td:not(.project_list_check)", function(e) {
			var aPos = self.table.fnGetPosition(this);
			var row = self.table.fnGetData(aPos[0]);

			var name = row.name;

			self.toggle_data('name', name);
		});
	},

	/**
	 * Add Data
	 * @method API
	 * @param Array data
	 */
	add_data: function(data) { // for datatable method
		if (this.table && data && data.length > 0) {
			for (var i = 0; i < data.length; i++) {
				if (data[i].is_check) {	// jeongmin: if it is checkbox
					data[i].check = '<input type="checkbox" class="project_checkbox" />'
				}

				this.table.fnAddData({
					'check': data[i].check,
					'type': data[i].type,
					'name': data[i].name,
					'author': data[i].author
				});
			}
		}

		return this;
	},

	clear_data: function() {
		if (this.table) {
			this.table.fnClearTable();
		}

		return this;
	},

	check_data: function(name, user) { // target: type / name / author
		var checked = [];

		if (this.table) {
			var $data = this.table.find('.project_list_name');
			var $data2 = this.table.find('.project_list_author');

			var author = user.split('_')[0];
			
			if ($data && $data.length > 0) {
				$data.each(function(i, e) {
					var table_value = $(e).html();
					var author_name = $($data2[i]).html();

					if (table_value == name && author_name == author) {
						$(e).parent().find('.project_checkbox').prop('checked', true);

						checked.push($(e).parents('tr'));
					}
				});
			}
		}

		return checked;
	},

	check_all: function() {
		if (this.table) {
			this.table.find('.project_checkbox').prop('checked', true);
		}

		return this;
	},

	uncheck_all: function() {
		if (this.table) {
			this.table.find('.project_checkbox').prop('checked', false);
		}

		return this;
	},

	uncheck_data: function(target, value) {
		var unchecked = [];

		if (this.table) {
			var $data = this.table.find('.project_list_' + target);

			if ($data && $data.length > 0) {
				$data.each(function(i, e) {
					var table_value = $(e).html();

					if (table_value == value) {
						$(e).parent().find('.project_checkbox').prop('checked', false);

						checked.push($(e).parents('tr'));
					}
				});
			}
		}

		return unchecked;
	},

	toggle_data: function(target, value) {
		var list = [];

		if (this.table) {
			var $data = this.table.find('.project_list_' + target);

			if ($data && $data.length > 0) {
				$data.each(function(i, e) {
					var table_value = $(e).html();

					if (table_value == value) {
						var box = $(e).parent().find('.project_checkbox');
						var checked = !box.prop('checked');
						box.prop('checked', checked);

						list.push($(e).parents('tr'));
					}
				});
			}
		}

		return list;
	},

	get_table_data: function() { // checked
		var checked = [];
		var $data = this.table.find('.project_checkbox');

		if ($data && $data.length > 0) {
			$data.each(function(i, e) {
				if ($(e).prop('checked')) {
					var row = $(e).parents('tr');

					checked.push({
						'type': row.find('.project_list_type').html(),
						'name': row.find('.project_list_name').html(),
						'author': row.find('.project_list_author').html(),
						'path': row.find('.project_list_author').html() + '_' + row.find('.project_list_name').html()
					});
				}
			});
		}

		return checked;
	},

	get_data: function() {
		var self = this;

		var data = {};
		data.path = $(self.path).val();
		data.name = $(self.name).val();
		data.type = $(self.type).val();

		return data;
	},

	add_project_list: function(type, list_callback) {
		var self = this;


		var postdata = { // Donguk Kim : export - all project list | ect - owner project list
			'get_list_type': 'owner_list'
		};
		var url = "/project/get_list/";
		if(type == "export_list") {
			postdata = {
				'get_list_type': type
			};	
			url += "export";			
		} else {
			url += "owner";
		}

		core.socket.once(url, function(data) {
			if (data && data.length) {
				$(data).each(function(i) {
					var icon_str = "";
					var img_src =  (this.contents.is_user_plugin ? "/"+core.user.id+"/plugins":"")+"/goorm.plugin." + this.contents.type + "/images/" + this.contents.type + ".png";
					icon_str += "<div id='selector_" + this.contents.name + "' value='" + i + "' class='selector_project media' type='" + this.contents.type + "'>";
					icon_str += "<a class='pull-left project_list_img' href='#'><img class='media-object project_list_img' alt='" + this.contents.type + "' src="+img_src+"></a>"
					icon_str += "<div style='white-space:nowrap; overflow:hidden; text-overflow:ellipsis'>";
					icon_str += "<h5>" + $(".project_wizard_second_button[project_type=" + this.contents.type + "][detail_type=" + this.contents.detailedtype + "] .caption p").text() + "</h5>"
					icon_str += "<p>" + this.contents.name + "</p>";
					icon_str += "</div>";

					$(self.list).append(icon_str);
				});

				$(self.list + " .selector_project").click(function() {
					$(self.list + " .selector_project").removeClass("selected_button");
					$(this).addClass("selected_button");

					var idx = $(this).attr("value");

					$(self.location).html("<li><a href='#' action>/ " + data[idx].contents.name + "</a></li>"); //jeongmin: set project name as location and make breadcrumb list
					$(self.path).val(data[idx].name);
					$(self.name).val(data[idx].contents.name);
					$(self.type).val(data[idx].contents.type);

					var information = $(self.information);
					var description = data[idx].contents.description || "No Description";

					// var detailed = self.information_script.replace(/\[PROJECT_TYPE\]/, data[idx].contents.type)
					// 	.replace(/\[PROJECT_DETAIL\]/, data[idx].contents.detailedtype)
					// 	.replace(/\[PROJECT_AUTHOR\]/, data[idx].contents.author)
					// 	.replace(/\[PROJECT_NAME\]/, data[idx].contents.name)
					// 	.replace(/\[PROJECT_DESCRIPT\]/, description)
					// 	.replace(/\[PROJECT_DATE\]/, data[idx].contents.date)
					var detailed = self.information_script.replace(/\[PROJECT_TYPE\]/, $(".project_wizard_first_button[project_type=" + data[idx].contents.type + "] h4.list-group-item-heading").text())
						.replace(/\[PROJECT_DETAIL\]/, $(".project_wizard_second_button[project_type=" + data[idx].contents.type + "][detail_type=" + data[idx].contents.detailedtype + "] .caption p").text())
						.replace(/\[PROJECT_AUTHOR\]/, data[idx].contents.author)
						.replace(/\[PROJECT_NAME\]/, data[idx].contents.name)
						.replace(/\[PROJECT_DESCRIPT\]/, description)
						.replace(/\[PROJECT_DATE\]/, data[idx].contents.date);

					information.empty().append(detailed);
					core.module.localization.local_apply("#project_export_information", "title");
					core.module.localization.local_apply("#project_open_information", "title");
					core.module.localization.local_apply("#project_delete_information", "title");
				});
				$(self.list + " .selector_project").dblclick(function() {
					$(self.list).parents('.modal-content').find('button:last').click(); // jeongmin: we should click button of this list's dialog!
				});
				var project_list_children = $(self.list).children();
				
				if(core.status.current_project_name != ""){
					for (var i = 0; i < project_list_children.length; i++) {
						if ($(project_list_children[i]).find('p').text() == core.status.current_project_name) {
							$(project_list_children[i]).prependTo($(self.list));
							$(project_list_children[i]).click();
							break;
						}
					}
				}else{
					$(project_list_children[0]).click();
				}
			} else {
				$(self.list).append('<div class="well well-sm" style="margin: 10px">' + core.module.localization.msg.alert_no_have_project + '</div>')
				$(self.information).append('<div class="well well-sm">' + core.module.localization.msg.alert_no_have_project + '</div>')
			}

			if (typeof list_callback != 'undefined') {
				list_callback();
			}
		});
		

		//$.getJSON("project/get_list", postdata, function (data) {
		core.socket.emit("/project/get_list", postdata);
	},

	add_project_item: function() {
		var self = this;

		$(self.types + " option:eq(0)").attr("selected", "selected");

		$(self.types).change(function() {
			var type = $(self.types + " option:selected").val();

			$(self.information).empty();

			if (type == "All") {
				$(self.list + " .selector_project").each(function() {
					$(this).css("display", "block");
				});
			} else {
				$(self.list + " .selector_project").each(function() {
					if ($(this).attr("type") == type) {
						$(this).css("display", "block");
					} else {
						$(this).css("display", "none");
					}
				});
			}
		});
	},

	//when current project is not set(project table), set initial project. Jeong-min Im.
	init_project: function() {
		if ($(this.list + " .selector_project").length > 0) {
			$(this.list + " .selector_project").first().click().focus(); //set initial project
		} else {
			$(this.path).val("");
			$(this.name).val("");
			$(this.type).val("");
			$("#project_delete_location").html("");
		}
	},

	// project list ui set keydown event (up down);
	set_keydown_event: function(__options) {
		var self = this;

		var options = __options || {};

		$(this.list).off("keydown");
		$(this.list).keydown(function(e) {
			var selected_project = $(self.list).find(".selected_button");
			var project_list = $(self.list).children();
			var target = null;
			//$("#project_new").find(".dialog_left_inner").scrollTop($("#project_new").find(".dialog_left_inner").scrollTop() + $(".project_wizard_first_button[project_type=cpp]").position().top);
			for (var i = 0; i < project_list.length; i++) {
				// set target = current selected project index
				if (project_list[i].id === selected_project.attr('id'))
					target = i;
			}
			switch (e.which) {
				case 9: // tab key
					if(self.list=="#project_delete_list"){
						$("#g_dp_btn_cancel").focus();
					}else if(self.list=="#project_export_list"){
						$("#g_ep_btn_cancel").focus();
					}
					break;
				case 13: // enter key
					if (options.handler && typeof(options.handler) === 'function') {
						options.handler.call();
					}

					break;
				case 38: // up key
					if (project_list.length) {
						if (target > 0){
							project_list[target - 1].click();
						} 
					}
					break;
				case 40: // down key
					if (project_list.length) {
						if (target < project_list.length - 1){
							project_list[target + 1].click();
						} 
					}
					break;
			}
			e.preventDefault();

			var list = $(self.list),
				selected = list.find('.selected_button'),
				scroll = list.scrollTop();

			selected.focus();

			if (selected && selected.position()) {
				scroll += selected.position().top;
			}

			list.scrollTop(scroll);

			// $(self.list).scrollTop($(self.list).scrollTop() + $(self.list).find(".selected_button").position().top);
		});

	},
};
