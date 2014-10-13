/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.utility.treeview = function(selector, opts) {
	if (!selector && typeof selector !== "string") return;
	this.id = selector;
	this.raw_id = selector.replace("#", "");
	this.options = {};
	this._refresh = false;
	this.tree = $(selector);
	this.is_ready = false;
	this.raw_data = {};

	this.init(opts);
};

goorm.core.utility.treeview.prototype = {
	/**
	 * init treeview
	 * @method init
	 * @return {treeview}
	 */
	init: function(opts) {
		_this = this;

		this.options = $.extend(this.options, {
			project_path: null,
			on_select: null,
			on_click: null,
			on_open: null,
			on_ready: null,
			on_dblclick: null,
			root_node: null, // create root node manually
			fetch: null,
			auto_load_root: true,
			state: null, // initial state 
			multiple: false,
			dnd: false,
			wholerow: true,
			sort: true,
			folder_only: false
		}, opts);

		this.project_path = this.options.project_path;

		// clear view area
		this.tree.empty();

		this.unbind();
		this.bind();

		this.create();

		// unbind keydown event on jstree to customize keydown event
		var element = this.tree.jstree(true).element || this.tree.jstree(true)._element; // jeongmin: _element is emergency element
		element.off('keydown.jstree', '.jstree-anchor');
		return this;
	},

	/**
	 * unbind user added event
	 * @method unbind
	 */
	unbind: function() {
		this.tree.off("dblclick.jstree");
	},

	/**
	 * bind events on jstree
	 * @method bind
	 * @return {treeview}
	 */
	bind: function() {
		var _this = this;
		this.tree.on("loaded.jstree", function(event, data) {}).on("select_node.jstree", function(event, data) {
			if (typeof _this.options.on_select === "function") {
				_this.options.on_select(event, data.node);
			}
		}).on("ready.jstree", function(event, data) {}).on("model.jstree", function(event, data) {
			// console.log("model", data);
		}).on("refresh.jstree", function(event, data) {
			_this.tree.trigger("ready.jstree");
		}).on("open_node.jstree", function(event, data) {
			// console.log("on open_node");
			if (_this.options.auto_load_root === true)
				_this.tree.jstree("load_node", data.node.children);
		}).on("keydown.jstree", function(e) {
			_this._bind_keys(e);
		}).on("load_node.jstree", function(event, data) {
			// console.log("on load_node", data);
		}).on("dblclick.jstree", function(event, data) {

			var node = _this.tree.jstree("get_node", event.target);
			if (node) {
				if (node.type === "folder" || node.type === "root") {
					_this.tree.jstree("toggle_node", node);
				}
				if (typeof _this.options.on_dblclick === "function") {
					_this.options.on_dblclick(event, node);
				}
			}
		}).on('mousedown.jstree', function(e) {
			var node = _this.tree.jstree("get_node", $(e.target));
			_this.tree.jstree("deselect_all");

			if (node.id !== "#") {
				if (typeof _this.options.on_click === "function") {
					_this.options.on_click(e, node);
				} else {
					_this.tree.jstree("select_node", node);
				}
			}
		});
		return this;
	},

	/**
	 * create jstree
	 * @method create
	 * @return {treeview}
	 */
	create: function() {
		var _this = this;
		var path = _this.options.project_path;

		var project_root = null;
		if (this.options.root_node === null) {
			project_root = {
				text: core.status.current_project_path,
				state: {
					"opened": true
				},
				type: "root",
				li_attr: {
					"path": path,
					folder_only: _this.options.folder_only
				},
				parent: "#",
				id: this.raw_id + "/" + path,
			};
		} else project_root = this.options.root_node;


		// plugin settings
		var plugins = ["types", "ui", "unique"];
		if (this.options.dnd) {
			plugins.push("dnd");
			$.jstree.defaults.dnd.copy = false;
		}
		if (this.options.wholerow) {
			plugins.push("wholerow");
		}
		if (this.options.sort) {
			plugins.push("sort");

			// sort settings
			$.jstree.defaults.sort = function(a, b) {
				return this.get_type(a) === this.get_type(b) ? (this.get_text(a) > this.get_text(b) ? 1 : -1) : ((this.get_type(a) < this.get_type(b)) ? 1 : -1);
			};
		}

		// If it has initial state, set _refresh flag to true to get all files related to state.
		if (this.options.state) this._refresh = true;

		if (this.options.fetch === null) {
			this.options.fetch = function(path, callback) {

				var state = [];
				if (_this.options.state && _this.options.state.core) {
					state = _this.options.state.core.open;
				}

				var postdata = {
					path: path,
					state: (_this._refresh === true) ? state : [],
				};
				// _this._refresh = false;
				// console.log("load folder", postdata);

				core.socket.once("/file/get_result_ls" + path, function(data) {
					callback(data);
				});
				core.socket.emit("/file/get_result_ls", postdata);
			};
		}

		_this.tree.jstree({
			// the `plugins` array allows you to configure the active plugins on this instance
			"plugins": plugins,
			"check_callback": true,
			"themes": {
				"stripes": true
			},
			"animation": 100,
			"check_callback": true,
			"multiple": _this.options.multiple,

			// each plugin you have included can have its own config object
			"core": {
				"data": function(obj, callback) {
					var self = this;
					// console.log("core.data", obj);
					// load node when it is root
					if (obj.type === undefined || obj.type === "#") {
						if (!$.isArray(project_root)) project_root = [project_root];
						// console.log(project_root);
						callback.call(self, project_root);

						// solution for getting root node at first
						// if its tree already have full tree then set auto_load_root to false.
						if (_this.options.auto_load_root === true) {
							// console.log("# 에서 다음스탭 로딩", obj);
							var root_node = _this.get_children(obj).then(function() {
								nodes = arguments;
								// console.log("루트노드 로딩완료",nodes);
								if (nodes.length) {
									if (_this._refresh === true) {
										// console.log("Refresh상태이므로 열린폴더 모두 로딩");
										_this.options.fetch(nodes[0].li_attr.path, function(data) {
											// console.log(data);
											var data = process_data(data);

											_this.options.state = null;
											_this.tree.jstree("_append_json_data", nodes[0], data);

											if (_this.is_ready === false) {
												_this.is_ready = true;
												if (typeof _this.options.on_ready === "function") {
													_this.options.on_ready();
												}
											}
										});
										_this._refresh = false;
									} else {
										// console.log("No refresh 기본 로딩");
										for (var i = 0; i < nodes.length; i++) {
											var node = nodes[i];
											// console.log("루트에서 로딩 ", node);
											// _this.tree.jstree("_append_json_data", nodes[0], data);
											_this.tree.jstree("load_node", node);
										}

										if (_this.is_ready === false) {
											_this.is_ready = true;
											if (typeof _this.options.on_ready === "function") {
												_this.options.on_ready();
											}
										}
									}
								}
							});
						}
						// console.log(project_root);
					}
					// load node when it is folder
					else if (obj.type === "folder" || obj.type === "root") {
						// console.log(obj);
						_this.options.fetch(obj.li_attr.path, function(data) {
							// console.log(data);
							if (data.length) {
								data = process_data(data);

								_this.options.state = null;
								callback.call(self, data);
							} else {
								callback.call(self, "");
							}

							if (_this._refresh) _this._refresh = false;
						});
					}
					// for other files
					else {
						// console.log("load file", obj);
						callback.call(self, "");
					}
				}
			},
			"types": {
				"#": {
					"max_children": -1,
					"max_depth": -1,
					"valid_children": ["root"]
				},
				"root": {
					"icon": "./images/icons/filetype/drive.png",
					"valid_children": ["folder", "file", "default"]
				},
				"folder": {
					"icon": "./images/icons/filetype/folder.filetype.png",
					"valid_children": ["default", "file", "folder"]
				},
				"file": {
					"icon": "./images/icons/filetype/filetype.filetype.png",
					"valid_children": []
				},
				"default": {
					"icon": "./images/icons/filetype/filetype.filetype.png",
					"valid_children": []
				}
			}
		});

		var process_data = function(data) {
			// console.log(data);
			for (var i = 0; i < data.length; i++) {
				// Set state for opened folders
				if (_this.options.state && _this.options.state.core) {
					_this.options.state.core.open.map(function(opened_file, idx) {
						var name = data[i].id;
						if (name === opened_file) {
							data[i].state = {
								opened: true
							};
						}
					});
				}

				// Prepend tree ID on all nodes to prevent ID confusion.
				if (data[i].id && data[i].id.indexOf(_this.raw_id) === -1) {
					data[i].id = _this.raw_id + "/" + data[i].id;
				}

				if (data[i].parent && data[i].parent.indexOf(_this.raw_id) === -1) {
					data[i].parent = _this.raw_id + "/" + data[i].parent;
				}
			}

			// Filter files on folder only mode.
			if (_this.options.folder_only) {
				var tmp = [];
				data.map(function(node, i) {
					_this.raw_data[node.id] = node;
					// add only folders 
					// console.log(node.type, node.id);
					if (node.type === "folder") {
						tmp.push(node);
					}
				});
				data = tmp;
				// console.log("data:",data, _this.raw_data);	
			} else {
				data.map(function(node, i) {
					// Adjust icon.
					if (node.type === "file" && node.li_attr && node.li_attr.file_type) {
						node.icon = "./images/icons/filetype/" + node.li_attr.file_type + ".filetype.png";
					}
					_this.raw_data[node.id] = node;
				});
			}

			return data;
		}

		return this;
	},

	/**
	 * refresh treeview
	 * @method refresh
	 * @return {treeview}
	 */
	refresh: function() {
		this.options.state = this.get_state();
		this._refresh = true;
		this.tree.jstree("refresh");

		return this;
	},

	/**
	 * get state (opened files, selected files etc..)
	 * @method get_state
	 * @return {Object}  [state object]
	 */
	get_state: function() {
		var state = this.tree.jstree("get_state");
		for (var i = 0; i < state.core.open.length; i++) {
			state.core.open[i] = state.core.open[i].replace(this.raw_id + "/", "");
		}
		return state;
	},

	/**
	 * bind keys
	 * @private
	 * @method _bind_keys
	 * @param  {event}   e [jQuery event]
	 * @return {jstree}
	 */
	_bind_keys: function(e) {
		var _this = this;
		// rebind keydown event for custom UX
		var node = this.tree.jstree("get_node", e.target);

		switch (e.which) {
			// left key down
			case 37:
				if (_this.tree.jstree("is_open", node)) {
					_this.tree.jstree("close_node", node);
				} else {
					var o = _this.tree.jstree("get_node", node.parent, true);
					if (o && o.length) {
						_this.tree.jstree("deselect_all");
						_this.tree.jstree("select_node", o.children('.jstree-anchor'));
						o.children('.jstree-anchor').focus();
					}
				}

				// preventDefault to prevent unexpected scroll movement.
				e.preventDefault();
				break;
				// up key down
			case 38:
				var o = _this.tree.jstree("get_prev_dom", node);
				if (o && o.length) {
					_this.tree.jstree("deselect_all");
					_this.tree.jstree("select_node", o.children('.jstree-anchor'));
					o.children('.jstree-anchor').focus();
				}

				// preventDefault to prevent unexpected scroll movement.
				e.preventDefault();
				break;
				// right key down
			case 39:
				if (_this.tree.jstree("is_closed", node)) {
					_this.tree.jstree("open_node", node, function(o) {
						_this.tree.jstree("get_node", o, true).children('.jstree-anchor').focus();
					});
				} else {
					var o = _this.tree.jstree("get_children_dom", node);
					if (o && o.length) {
						_this.tree.jstree("deselect_all");
						_this.tree.jstree("select_node", o.eq(0).children('.jstree-anchor'));
						o.eq(0).children('.jstree-anchor').focus();
					}
				}

				// preventDefault to prevent unexpected scroll movement.
				e.preventDefault();
				break;
			case 40:
				// down key down
				var o = _this.tree.jstree("get_next_dom", node);
				if (o && o.length) {
					_this.tree.jstree("deselect_all");
					_this.tree.jstree("select_node", o.children('.jstree-anchor'));
					o.children('.jstree-anchor').focus();
				}

				// preventDefault to prevent unexpected scroll movement.
				e.preventDefault();
				break;
			default:
				break;
		}
	},

	open_node: function(node) {
		if (this.tree.jstree("is_loaded", node)) {
			this.tree.jstree("open_node", node);
		} else {
			this.get_node(node).then(this.open_node(node));
		}
	},

	close_node: function(node) {
		if (this.tree.jstree("is_loaded", node)) {
			this.tree.jstree("close_node", node);
		} else {
			this.get_node(node).then(this.close_node(node));
		}
	},

	select_node: function (node) {
		if (this.tree.jstree("is_loaded", node)) {
			this.tree.jstree("deselect_all");
			this.tree.jstree("select_node", node);
		} else {
			this.get_node(node).then(this.select_node(node));
		}
	},

	get_root_node: function () {
		var _this = this;
		// console.log("get_root_node");
		return this.get_node(this.tree).then(function(root) {
			// console.log("get_root_node", root);
			return _this.get_children(root);
		});
	},

	get_node: function (node) {
		var _this = this;

		var deferred = $.Deferred();
		var promise = function(n) {
			if (_this.tree.jstree("is_loaded", n) !== true || _this.tree.jstree("is_loading", n) === true) {
				//setTimeout(function() {
        		var temp = $.debounce(function() {
					return promise(n);
				}, 200);
				temp();

				return deferred.promise();
			} else {
				var nd = _this.tree.jstree("get_node", n);
				// console.log("got", nd, nd.children);
				return deferred.resolve(nd);
			}
		};
		return promise(node);
	},

	get_children: function (node) {

		// console.log("get_children", node.children);
		if ($.isArray(node.children)) {
			var promises = [];
			for (var i = 0; i < node.children.length; i++) {
				// console.log(node.children[i]);
				promises.push(this.get_node(node.children[i]));
			}

			// $.when not allow array
			return $.when.apply($, promises);
		} else return this.get_node(node.children);
	},

	/**
	 * destroy jstree
	 * @method destroy
	 * @return {treeview}
	 */
	destroy: function () {
		console.log(this.id, "destroy");
		this.tree.jstree("destroy");
		return this;
	}
};