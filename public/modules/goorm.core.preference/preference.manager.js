/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.preference.manager = {
	treeview: null,
	treeview_id: 'preference_treeview',
	tabview_id: 'preference_tabview',
	preferences: null,
	json: {},
	plugin_data: [],

	init: function(option) {
		this.preferences = [];
	},

	// get default preference file
	get_default_file: function(path, callback) {
		$.getJSON(path, function(json) {
			if ($.isFunction(callback)) {
				callback(json);
			}
		});
	},

	convert_json_to_tree: function(parent, json) {
		var data = [];
		if (!$.isArray(json)) {
			json = [json];
		}
		json.map(function(obj) {
			// console.log(obj);
			if (!obj.id) {
				obj.id = obj.label;
			}
			var d = {};
			d.text = obj.label;
			d.id = parent + '/' + obj.id;
			d.type = 'file';
			d.parent = parent;
			d.icon = false;
			d.li_attr = {
				'id': obj.id,
				'path': d.id
			};
			d.a_attr = {
				'localization_key': obj.localization_key
			};
			data.push(d);
		});
		// console.log(data);
		return data;
	},

	// append_data: function(parent, json) {
	// 	if(json.length){
	// 		this.treeview.tree.jstree('_append_json_data', parent, json);
	// 	}
	// },

	// create treeview structure
	create_treeview: function(json, change) {
		var self = this;
		var on_select = function(e, node) {
			if (node.type === 'file') {
				var id = node.li_attr.id;
				var $tabview = $('#' + self.tabview_id);
				$tabview.find('.nav-tabs > li').hide();
				$tabview.find('.nav-tabs > li[target="' + id + '"]').show();
				$tabview.find('.nav-tabs > li[target="' + id + '"] > a').first().click();
			}
		};

		var project_root = [{
				text: json.core.label,
				state: {
					'opened': true
				},
				type: 'root',
				li_attr: {
					'path': 'Preference',
					'folder_only': false
				},
				a_attr: {
					'localization_key': 'preference'
				},
				parent: '#',
				icon: false,
				id: this.treeview_id + '/Preference'
			}
			// ,
			// {
			// 	text: json.plugin.label,
			// 	state: {'opened': true},
			// 	type: 'root',
			// 	li_attr: {'path': 'Plugin', 'folder_only': false},
			// 	a_attr: {'localization_key': 'plugin'},
			// 	parent: '#',
			// 	icon: false,
			// 	id: this.treeview_id+'/Plugin'
			// }
		];

		this.json.core = self.convert_json_to_tree('Preference', json.core.child);

		if (this.treeview) {
			this.treeview.destroy();
			this.treeview = null;
		}

		// Create treeview
		this.treeview = new goorm.core.utility.treeview('#' + this.treeview_id, {
			project_path: 'preference',
			on_select: on_select,
			root_node: project_root,
			// wholerow: false,	// hidden: want to show wholerow
			sort: false,
			on_ready: function() {
				if (change) { // this should be selected after loading is done
					self.treeview.select_node('preference_treeview/Preference/Language');
				} else {
					self.treeview.select_node('preference_treeview/Preference/Editor');
				}
			},
			fetch: function(path, callback) {
				if (path === 'Preference') {
					//console.log(self.json.core);
					callback(self.json.core);
					// self.treeview.tree.jstree("redraw", true);
				} else {
					callback(null);
				}
			}
		});
	},

	plugin: function(plugin_name) {
		this.plugin_name = null;
		this.xml = null;
		this.version = null;
		this.url = null;
		this.preference = {};
	}

};
