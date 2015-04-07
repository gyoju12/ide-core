/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.shortcut.manager = {
	on_transition: false,
	hotkeys: {}, //default shortcut
	hotkeys_fn: {}, //jeongmin: hotkey event handler
	custom_shortcut: {}, //jeongmin: custom shortcut list (already applied shortcut)
	temp_shortcut: {}, //jeongmin: temporary changed shortcut
	history: {}, //jeongmin: shortcut's modifying history
	theme_shortcut: {}, // jeongmin: current theme shortcut list (if theme is default, it will be empty)
	theme: 'default', // sublime keymap is default now
	is_theme_key_pressed: false, // jeongmin: sublime has special shortcut that trigger other shortcut, so we need to know whether this shortcut is pressed or not.
	special_shortcut: {}, // jeongmin: shortcuts that have special letters. e.g. ctrl+shift+[
	fixed_shortcut: [], // jeongmin: shortcut that can't be customized

	getOStype: function() {
		var os = "windows";
		if (navigator.platform.indexOf("Win") != -1) {
			// Windows
			os = "windows";
		} else if (navigator.platform.indexOf("Mac") != -1) {
			// Mac
			os = "mac";
		} else if (navigator.platform.indexOf("Linux") != -1) {
			// Linux
			os = "linux";
		} else {
			// Else
			os = "else";
		}
		return os;
	},

	setKeyType: function(os) {
		var keys = {
			"ctrl": "ctrl",
			"alt": "alt",
			"meta": "meta",
			"backspace": "backspace"
		};

		switch (os) {
			case "mac":
				keys.ctrl = "meta";
				break;
			case "windows":
				break;
			case "linux":
				break;
			case "else":
				break;
			default:
		}
		return keys;
	},

	updateHotkey: function() {
		for (var action in this.hotkeys) {
			var text = this.hotkeys[action];
			var os = this.getOStype();

			if (os == "mac") {
				text = this.replace_hotkey(text);
			}

			$("[action=" + action + "] .helptext").html(text);
		}
	},

	//replace hotkey with image. Jeong-Min Im.
	replace_hotkey: function(text) {
		text = text.replace("meta", "&#x2318;")
			.replace("Ctrl", "^")
			.replace("Alt", "&#x2325;")
			.replace("Shift", "&#x21E7;")
			.replace("Backspace", "&#x232b") // jeongmin: backward delete
			.replace("Del", "&#x2326") // jeongmin: forward delete
			.replace("Left", "&#8592") //"⇦")
			.replace("Right", "&#8594") //"⇨")
			.replace("Up", "&#8593")
			.replace("Down", "&#8595")
			.replace("Esc", "&#9099")
			.replace("Enter", "&#x23CE")
			.replace("Space", "&#9251")
			.split("+").join("");

		return text;
	},

	make_namespace: function(action, key) {
		if (key && typeof(key) == 'string' && action && typeof(action) == 'string') {
			return action.toLowerCase() + "_" + key.toLowerCase().replace(/\s+/g, '').replace(/\+/g, '_');
		} else {
			return key;
		}
	},

	////// customizing shortcuts functions //////

	//register events on custom shortcuts. Jeong-Min Im.
	custom_events: function() {
		var self = this,
			shortcut_input_obj = $(".shortcut_input"); //jeongmin: shortcut input object

		//get new shortcut string and translate keycode to string. Jeong-Min Im.
		shortcut_input_obj.keydown(function(e) {
			self.shortcut_input = self.make_shortcut_input(e);
			$(this).val(self.shortcut_input); //show shortcut string to the input

			e.stopPropagation(); //prevent other event occurs
			e.preventDefault();
			return false;
		});

		//when key is up(not be pressed), set shortcut input value. Jeong-Min Im.
		shortcut_input_obj.keyup(function(e) {
			if (self.command_key) { //only command keys
				if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) { //all keys are up
					if (self.history[$(this).attr("name")]) {
						$(this).val(self.history[$(this).attr("name")]); //past modified value
					} else {
						$(this).val($(this).attr("value")); //set back to original value
					}
				} else { //current downed keys
					self.shortcut_input = self.make_shortcut_input(e);
					$(this).val(self.shortcut_input);
				}
			} else //normal way
				self.check_exist(this); //this: current modified shortcut

			e.stopPropagation(); //prevent other event occurs
			e.preventDefault();
			return false;
		});

		//when user clicked apply or ok button, change shortcut. Jeong-Min Im.
		$(core).on("on_preference_shortcut_apply", function() {
			var progress_elements = core.module.loading_bar.start();
			$("#preference_tabview").find(".apply").each(function(i) {
				if (i >= 3 && i <= 9) {
					$(this).attr("disabled", "disabled");
				}
			});
			if (Object.keys(self.temp_shortcut).length === 0) { // jeongmin: no temp shortcut -> maybe default
				for (var i = shortcut_input_obj.length - 1; 0 <= i; i--) {
					if ($(shortcut_input_obj[i]).val() != $(shortcut_input_obj[i]).attr('value')) { // jeongmin: check modified shortcut
						self.change_shortcut($(shortcut_input_obj[i]).attr('name'), $(shortcut_input_obj[i]).val(), $(shortcut_input_obj[i]).attr('value'));
					}
				}
			} else { // jeongmin: temp shortcut exists
				for (var new_shortcut in self.temp_shortcut) {
					var name = self.temp_shortcut[new_shortcut].name,
						old_shortcut = self.temp_shortcut[new_shortcut].old_shortcut;

					self.change_shortcut(name, new_shortcut, old_shortcut);
				}
			}

			self.temp_shortcut = {}; //initialize
			progress_elements.stop();
			alert.show(core.module.localization.msg.alert_shortcut_modified);
		});

		//scenario: user clicked restore button and clicked ok button -> current modified shortcut will be applied... -> prevent this problem. Jeong-Min Im.
		$(core).on("on_preference_restored", function() {
			self.temp_shortcut = {}; //initialize
			self.history = {};
		});

		//when user closed preference modal, current modified shortcuts are initialized. Jeong-Min Im.
		$("#dlg_preference").on("hidden.bs.modal", function() {
			self.temp_shortcut = {}; //initialize
			self.history = {};
		});
	},

	//Refer to www.javascripter.net/faq/keycodes.htm
	//translate keys that user inputs to string. Jeong-Min Im.
	make_shortcut_input: function(e) {
		var shortcut_input = ""; //key string that user inputs

		this.command_key = false; //for checking if this shortcut_input is made of only command keys
		this.new_input = true; //for making keyup event is called only one time

		//these keys can be pressed simultaneously
		if (e.altKey || e.keyCode == 18)
			shortcut_input = "Alt+";

		if (e.ctrlKey || e.keyCode == 17)
			shortcut_input += "Ctrl+";

		if (e.metaKey || e.keyCode == 91)
			shortcut_input += "Meta+";

		if (e.shiftKey)
			shortcut_input += "Shift+";

		//these keys can't be pressed simultaneously except above keys
		if ((48 <= e.keyCode && e.keyCode <= 57) || (65 <= e.keyCode && e.keyCode <= 90)) //number(0~9), capital alphabet(A~Z)
			shortcut_input += String.fromCharCode(e.keyCode);

		else if (96 <= e.keyCode && e.keyCode <= 105) //keypad number(0~9)
			shortcut_input += String(e.keyCode - 96);

		else if (112 <= e.keyCode && e.keyCode <= 123) //function key(F1~F12)
			shortcut_input += "F".concat(String(e.keyCode - 111)); //attach F

		else { //special keys
			switch (e.keyCode) {
				case 8: //Backspace -> remove shortcut
					shortcut_input = "None";
					break;

				case 9:
					shortcut_input += "Tab";
					break;

				case 12:
					shortcut_input += "5";
					break;

				case 13:
					shortcut_input += "Return";
					break;

				case 19:
					shortcut_input += "Pause";
					break;

				case 20:
					shortcut_input += "CapsLock";
					break;

				case 27:
					shortcut_input += "Esc";
					break;

				case 32:
					shortcut_input += "Space";
					break;

				case 33:
					shortcut_input += "PageUp";
					break;

				case 34:
					shortcut_input += "PageDown";
					break;

				case 35:
					shortcut_input += "End";
					break;

				case 36:
					shortcut_input += "Home";
					break;

				case 37:
					shortcut_input += "Left";
					break;

				case 38:
					shortcut_input += "Up";
					break;

				case 39:
					shortcut_input += "Right";
					break;

				case 40:
					shortcut_input += "Down";
					break;

				case 42:
				case 106: //this key codes differ Opera and other browsers
					shortcut_input += "*";
					break;

				case 43:
					shortcut_input += "+";
					break;

				case 45:
					shortcut_input += "Insert";
					break;

				case 46:
					shortcut_input += "Del";
					break;

				case 47:
				case 111:
				case 191: //this key codes differ Opera and other browsers and also number pad
					shortcut_input += "/";
					break;

				case 59:
				case 186: //this key codes differ Opera and other browsers
					shortcut_input += ";";
					break;

				case 61:
				case 107:
				case 187: //this key codes differ Opera and other browsers
					shortcut_input += "=";
					break;

					// case 91: 	//this keyCode is same as Meta Key
					// shortcut_input += "WIN";
					// break;

				case 109:
				case 189: //this key codes differ Opera and other browsers
					shortcut_input += "-";
					break;

				case 110:
				case 190: //number pad or not
					shortcut_input += ".";
					break;

				case 144:
					shortcut_input += "NumLock";
					break;

				case 145:
					shortcut_input += "ScrollLock";
					break;

				case 188:
					shortcut_input += ",";
					break;

				case 192:
					shortcut_input += "`";
					break;

				case 219:
					shortcut_input += "[";
					break;

				case 220:
					shortcut_input += "\\";
					break;

				case 221:
					shortcut_input += "]";
					break;

				case 222:
					shortcut_input += "'";
					break;

				default: //this shortcut input is made of only command keys
					this.command_key = true;
			}
		}

		if (shortcut_input.lastIndexOf("+") == shortcut_input.length - 1) //if "+" is last character of shortcut_input
			shortcut_input = shortcut_input.slice(0, shortcut_input.length - 1); //remove "+"

		return shortcut_input;
	},

	//check whether custom key that user inputs already exists or not. Jeong-Min Im.
	check_exist: function(shortcut_input_obj) { //shortcut_input_obj: current modified shortcut
		var self = this,
			new_shortcut_name = $(shortcut_input_obj).attr("name"), //current modified shortcut's name
			new_shortcut = this.shortcut_input,
			old_shortcut = $(shortcut_input_obj).attr("value"), //current modified shortcut's past shortcut
			duplicate_in_temp = this.temp_shortcut[new_shortcut]; //duplicates in the modified shortcuts(not applied yet)

		////// when multiple keys are pushed, keyup event is called multiple times. This makes check_exist function is called multiple times //////
		////// So I gave flag to check this function was called in the past or not. This flag is initialized only when new input is in //////
		if (this.new_input)
			this.new_input = false;
		else //already this function is called in the past
			return;

		// Duplication check
		var is_dup = false;
		if (this.shortcuts.indexOf(new_shortcut) > -1) {
			if (new_shortcut != old_shortcut) {
				is_dup = true;
				for (var name in this.hotkeys) {
					if (this.hotkeys[name] == new_shortcut && name == new_shortcut_name) {
						is_dup = false;
					}
				}

			}
		}

		if (duplicate_in_temp) {
			if (duplicate_in_temp.name != new_shortcut_name) {
				is_dup = true;
			}
		}

		// check duplicate from sublime theme
		// if (this.theme == 'sublime') {
		var norm_new_shortcut = new_shortcut.split("+").join("-");

		if (norm_new_shortcut.indexOf('Meta') != -1) {

			var os = this.getOStype();

			if (os == 'mac') {
				norm_new_shortcut = norm_new_shortcut.replace("Meta", "Cmd");
			} else {
				norm_new_shortcut = norm_new_shortcut.replace("Meta", "Ctrl");
			}
		}

		var duplicate_in_sublime = CodeMirror.keyMap.sublime[norm_new_shortcut];

		if (duplicate_in_sublime) {

			alert.show("[" + new_shortcut + "]\n" + core.module.localization.msg.alert_duplicate_shortcut_sublime);

			if (self.history[new_shortcut_name]) {
				old_shortcut = self.history[new_shortcut_name];
			} else if (self.temp_shortcut[new_shortcut]) {
				old_shortcut = self.temp_shortcut[new_shortcut].old_shortcut;
			}

			$(shortcut_input_obj).val(old_shortcut);

			return;
		}
		// }


		////// check duplicate shortcut //////
		if (new_shortcut != "None" && is_dup) {
			// if (new_shortcut != "None" && (this.shortcuts.indexOf(new_shortcut) > -1 || duplicate_in_temp)) { //None can be duplicated
			confirmation.init({
				title: core.module.localization.msg.shortcut_conflict,
				message: new_shortcut + "<br/>" + core.module.localization.msg.confirmation_shortcut_conflict,
				//set this shortcut to this menu and remove other menu's shortcut. Jeong-Min Im.
				yes: function() {
					if (duplicate_in_temp) { //duplicates in the modified shortcuts
						var exist_shortcut_name = duplicate_in_temp.name, //exist shortcut's name
							exist_shortcut_obj = $(".shortcut_input[name='" + exist_shortcut_name + "']"); //exist shortcut object
					} else { //duplicates in already binded shortcuts
						var exist_shortcut_obj = $(".shortcut_input[value='" + new_shortcut + "']"), //exist shortcut object
							exist_shortcut_name = exist_shortcut_obj.attr("name"); //exist shortcut's name
					}

					////// push to shortcut changing list //////
					push_to_temp(exist_shortcut_name, "None", new_shortcut);
					push_to_temp(new_shortcut_name, new_shortcut, old_shortcut);

					exist_shortcut_obj.val("None"); //change exist shortcut input to None

					////// history save //////
					self.history[new_shortcut_name] = $(shortcut_input_obj).val();
				},
				//restore modified shortcut. Jeong-Min Im.
				no: function() {

					if (self.history[new_shortcut_name]) {
						old_shortcut = self.history[new_shortcut_name]; //past modified value
					} else if (duplicate_in_temp) { //if this shortcut is modified, old shortcut would be temporary new shortcut
						old_shortcut = duplicate_in_temp.old_shortcut;
					}

					$(shortcut_input_obj).val(old_shortcut);
				}
			});
			confirmation.show(); //show confirmation
		} else { //new shortcut is None or doesn't exist
			push_to_temp(new_shortcut_name, new_shortcut, old_shortcut);

			////// history save //////
			this.history[new_shortcut_name] = $(shortcut_input_obj).val();
		}

		//if new shortcut is available and this change is first time, save this shortcut temporarily. Jeong-Min Im.
		function push_to_temp(new_shortcut_name, new_shortcut, old_shortcut) { //new_shortcut_name: changing shortcut's name, new_shortcut: new shortcut input, old_shortcut: past shortcut
			var set = { //changing shortcut set
				name: new_shortcut_name,
				old_shortcut: old_shortcut
			};
			var to_be_deleted = null;

			for (var item in self.temp_shortcut) {
				if (new_shortcut_name == self.temp_shortcut[item].name) {
					to_be_deleted = item;
				}
			}

			delete self.temp_shortcut[to_be_deleted];

			self.temp_shortcut[new_shortcut] = set; // update new shortcuts

			$("#preference_tabview").find(".apply").each(function(i) {
				if (i >= 3 && i <= 9) {
					$(this).removeAttr("disabled");
				}
			});
		}
	},

	//change current shortcut. Jeong-Min Im.
	change_shortcut: function(name, new_shortcut, old_shortcut, theme) { //name: changing shortcut's name, shortcut: new shortcut
		////// unbind/bind shortcut event //////
		var action = this.change_event(name, new_shortcut, old_shortcut),
			os = this.getOStype();

		if (action) {
			// if (!theme) { ////// set custom shortcut array //////
			if (this.hotkeys[action] == new_shortcut) //custom shortcut is back to default
				delete this.custom_shortcut[name]; //this shortcut isn't custom anymore
			else //completely new shortcut
				this.custom_shortcut[name] = new_shortcut; //save new shortcut to custom shortcut list
			// } else { ////// set theme shortcut array //////
			// 	if (this.hotkeys[action] == new_shortcut) //theme shortcut is back to default
			// 		delete this.theme_shortcut[name]; //this shortcut isn't theme anymore
			// 	else //completely new shortcut
			// 		this.theme_shortcut[name] = new_shortcut; //save new shortcut to theme shortcut list
			// }
		} else {
			console.log('change_shortcut error:', arguments);
		}

		localStorage.setItem('shortcut', JSON.stringify(this.custom_shortcut)); //set shortcut in the localStorage
		core.preference[name] = new_shortcut;
	},

	//unbind/bind shortcut key event. Jeong-Min Im.
	change_event: function(name, new_shortcut, old_shortcut) {
		var action = false;
		var os = this.getOStype();

		if (name && new_shortcut && old_shortcut) {
			action = $("[name='" + name + "'][action]").attr("action"); //changing shortcut's action -> event namespace

			////// old_shortcut is from this.hotkeys object. This.hotkeys' Meta string is lowercase and this.shortcuts' Meta string is capital. So, match this difference. //////
			old_shortcut = old_shortcut.replace(/meta/g, 'Meta');

			// these shortcuts aren't binded by jquery. These are binded manually.
			if (action == 'tile_left' || action == 'tile_right')
				this.special_shortcut[action] = new_shortcut;
			else {
				////// unbind //////
				if (old_shortcut != "None" && this.shortcuts.indexOf(old_shortcut) > -1) { //if old shortcut is null -> no need to unbind
					this.unbind(action, old_shortcut); //unbind old shortcut event
					this.shortcuts.remove(this.shortcuts.indexOf(old_shortcut)); //remove old shortcut from the total shortcut list
				}

				////// bind //////
				if (new_shortcut != "None") { //if new shortcut is null -> no need to bind
					this.bind(action, new_shortcut, this.hotkeys_fn[action]); //bind new shortcut event
					this.shortcuts.push(new_shortcut); //push new shortcut to the list
				}
			}

			////// change value and helptext //////
			$("input[name='" + name + "']").attr("value", new_shortcut).val(new_shortcut); //change shortcut preference input value to new shortcut
			if (os == "mac") {
				new_shortcut = new_shortcut.replace(/Meta/g, 'meta'); // for replacing to image (image only knows 'm'eta)
				new_shortcut = this.replace_hotkey(new_shortcut);
			}
			$("[name='" + name + "'] .helptext").html(new_shortcut);
		} else {
			console.log('change_event error:', arguments);
		}

		return action; //return event_name to change_shortcut function
	},

	//load custom shortcut from localStorage. Jeong-Min Im.
	load_shortcut: function() {
		var data = (localStorage.getItem('shortcut') && localStorage.getItem('shortcut') != 'null' && localStorage.getItem('shortcut') != 'undefined') ? localStorage.getItem('shortcut') : "{}"; //jeongmin: get shortcut from localStorage
		var os = this.getOStype();

		this.custom_shortcut = JSON.parse(data); //parse json

		for (var name in this.custom_shortcut) {
			var action = $("[name='" + name + "'][action]").attr("action"); //changing shortcut's action -> event namespace`

			if (name && this.custom_shortcut[name] && this.hotkeys[action]) {
				this.change_event(name, this.custom_shortcut[name], this.hotkeys[action]); //change default shortcut as loaded custom shortcut
				core.preference[name] = this.custom_shortcut[name];
			} else {
				console.log('load_shortcut error:', name, this.custom_shortcut[name], this.hotkeys[action]);
			}
		}
	},

	////// shortcut theme //////

	// set shortcut theme. Jeong-Min Im.
	select_theme: function(theme) {
		if (theme == this.theme) // theme isn't changed
			return;

		this.set_default(); // set back to default first

		switch (theme) {
			case 'sublime':
				this.set_sublime();
				this.theme = theme;
				break;

			default:
				this.theme = 'default';
				$('#shortcut_theme_keymap').hide();
		}
	},

	// goorm default shortcut. Jeong-Min Im.
	set_default: function() {
		// restore custom shortcut
		if (Object.keys(this.custom_shortcut).length > 0) {
			for (var name in this.custom_shortcut) {
				var action = $('a[name="' + name + '"]').attr('action');

				this.change_shortcut(name, this.hotkeys[action], this.custom_shortcut[name]);
			}
		}
		// restore theme shortcut
		// if (this.theme_shortcut != {}) {
		// 	console.log("theme_shortcut is not empty:", this.theme_shortcut);
		// 	for (var name in this.theme_shortcut) {
		// 		var action = $('a[name="' + name + '"]').attr('action');

		// 		this.change_shortcut(name, this.hotkeys[action], this.theme_shortcut[name], true);
		// 	}
		// }
	},

	// sublime shortcut. Jeong-Min Im.
	set_sublime: function() {
		// change duplicate shortcut
		var duplicate_shortcut = [
			'preference.shortcut.file.delete',
			'preference.shortcut.window.tile_left',
			'preference.shortcut.window.tile_right'
		];
		var os = this.getOStype();

		if (os == 'mac') {
			this.change_shortcut(duplicate_shortcut[0], 'Alt+Shift+D', 'Meta+Shift+D', true);
		} else {
			this.change_shortcut(duplicate_shortcut[0], 'Alt+Shift+D', 'Ctrl+Shift+D', true);
		}

		// tile_left and tile_right can't be binded as meta
		this.change_shortcut(duplicate_shortcut[1], 'Ctrl+Alt+[', 'Ctrl+Shift+[', true);
		this.change_shortcut(duplicate_shortcut[2], 'Ctrl+Alt+]', 'Ctrl+Shift+]', true);

		// show sublime keymap
		var keymap_table = $('#shortcut_theme_keymap_table tbody'),
			sublime_keymap = CodeMirror.keyMap.sublime;

		for (var key in sublime_keymap)
			if (key != 'fallthrough' && typeof(sublime_keymap[key]) == 'string')
				keymap_table.append("<tr><td>" + key + "</td><td>" + sublime_keymap[key] + "</td></tr>");

		$('#shortcut_theme_keymap').show();

	},

	init: function() {
		var self = this;
		var os = this.getOStype();
		var keys = this.setKeyType(os);
		var hotkey_list = $(".helptext"),
			shortcut_input_list = $('.shortcut_input');

		var doc_obj = $(document);
		this.shortcuts = []; //jeongmin: total shortcuts list

		hotkey_list.each(function() {
			if ($(this).parent("[action]").html()) { //jeongmin: object that has action attribute exists, so we have to check its html in order to get right result
				var action = $(this).parent("[action]").attr("action");
				// if (os == "mac" && (action != 'tile_left' && action != 'tile_right' && action != 'bottom_debug_show' && action != 'bottom_console_show') && action != 'bottom_search_show') {
				// 	self.hotkeys[action] = $(this).text().replace(/Ctrl/g, "meta").replace(/	/g, "").split(" ").join("").trim();
				// } else {
				// 	self.hotkeys[action] = $(this).text().replace(/	/g, "").split(" ").join("").trim();
				// }

				// swap_line_down/up: Shift+Ctrl+down(win)	Cmd+Ctrl+down(mac)
				// scroll_line_down/up: Ctrl+down(win)		Ctrl+Alt+down(mac)
				// do_transpose: Ctrl+Alt+T(win)			Ctrl+T(mac)
				// select_scope: Shift+Ctrl+Space(win,mac)
				switch (action) {
					case "swap_line_down":
					case "swap_line_up":
						if (os == "mac") {
							self.hotkeys[action] = $(this).text().replace("Shift", "meta").replace(/\s+/g, "").trim();
						} else {
							self.hotkeys[action] = $(this).text().replace(/\s+/g, "").trim();
						}
						break;
					case "scroll_line_down":
					case "scroll_line_up":
						if (os == "mac") {
							self.hotkeys[action] = "Alt+".concat($(this).text()).replace(/\s+/g, "").trim();
						} else {
							self.hotkeys[action] = $(this).text().replace(/\s+/g, "").trim();
						}
						break;
					case "do_transpose":
						if (os == "mac") {
							self.hotkeys[action] = $(this).text().replace(/\s+/g, "").trim().replace("Alt+", "");
						} else {
							self.hotkeys[action] = $(this).text().replace(/\s+/g, "").trim();
						}
						break;
					case "select_scope":
					case "tile_left":
					case "tile_right":
					case "bottom_debug_show":
					case "bottom_console_show":
					case "bottom_search_show":
						self.hotkeys[action] = $(this).text().replace(/\s+/g, "").trim();
						break;
					default:
						if (os == 'mac') {
							self.hotkeys[action] = $(this).text().replace(/Ctrl/g, "meta").replace(/\s+/g, "").trim();
						} else {
							self.hotkeys[action] = $(this).text().replace(/\s+/g, "").trim();
						}

				}

				self.shortcuts.push(self.hotkeys[action].replace(/meta/g, "Meta")); //jeongmin: set total shortcuts list
			} else if ($(this).text() == 'Ctrl+#Num' && os == 'mac') { // jeongmin: change shortcuts that is only in view all shortcuts dialog
				$(this).html(self.replace_hotkey($(this).text().replace(/Ctrl/g, "meta").replace(/	/g, "").split(" ").join("").trim()));
			} else { // for help shortcut dialog
				if (os == 'mac') {
					$(this).html(self.replace_hotkey($(this).text().replace(/Ctrl/g, "meta").replace(/\s+/g, "").split("+").join("").trim()));
				}
			}
		});

		////// mac setting. Jeong-Min Im. //////
		if (os == 'mac')
			for (var i = shortcut_input_list.length - 1; 0 <= i; i--)
				$(shortcut_input_list[i]).attr('value', $(shortcut_input_list[i]).attr('value').replace(/Ctrl/g, 'Meta'));

		this.updateHotkey();

		this.custom_events(); //jeongmin: register events on custom shortcuts

		//Prevent Backspace Key
		doc_obj.bind('keydown', keys.backspace, function(e) {
			if (self.get_focus() === "input") {} else {
				e.preventDefault();
			}
		});

		doc_obj.bind('keyup', function(e) {
			core.status.keydown = false;

			if (e.keyCode != 27 && e.keyCode != 13) {
				e.stopPropagation();
				e.preventDefault();
				return false;
			}
		});

		$("input").keyup(function(e) {
			var ev = e || event;

			if (e.keyCode == 27 || e.keyCode == 13) {
				
				//useonly(mode=goorm-oss)
				if ($(e.currentTarget).attr('id') == 'local_user_input' || $(e.currentTarget).attr('id') == 'local_user_pw_input') {
					core.access_local_mode();
				}
				
				
				else if (($(e.currentTarget).attr('id') == 'find_query_inputbox' || $(e.currentTarget).attr('id') == 'replace_query_inputbox') && e.keyCode == 27) {
					core.dialog.find_and_replace.panel.modal("hide");
				} else if ($(e.currentTarget).attr('id') == 'search_query_inputbox' && e.keyCode == 27) {
					core.dialog.search.hide();
				}

				doc_obj.trigger(e);

				e.stopPropagation();
				e.preventDefault();
				return false;
			}
		});

		//now let user use our shortcuts. Jeong-Min Im.
		$(core).on("goorm_login_complete", function() {
			self.default_shortcut();
			self.load_shortcut(); //custom
		});
	},

	//bind default shortcut events. Done when user logins. Jeong-Min Im.
	default_shortcut: function() {
		var self = this,
			doc_obj = $(document),
			os = this.getOStype(),
			keys = this.setKeyType(os);

		//Main Menu Selection

		//Main Menu Selection
		doc_obj.bind('keydown', keys.alt, function(e) {
			// core.module.layout.mainmenu.focus();

			e.stopPropagation();
			e.preventDefault();
			return false;
		});

		//Main Menu : File

		//New Project (Alt+N)
		if (this.hotkeys.new_project) {
			//hotkey event handler. Jeong-Min Im.
			this.hotkeys_fn.new_project = function(e) {
				$("[action=new_project]").click();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('new_project', this.hotkeys.new_project), this.hotkeys.new_project, this.hotkeys_fn.new_project);
		}

		//Open File (Ctrl+O)
		if (this.hotkeys.open_file) {
			this.hotkeys_fn.open_file = function(e) {
				if (core.status.current_project_path === "") {
					alert.show(core.module.localization.msg.alert_project_not_selected);
				} else {
					core.dialog.open_file.show();
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('open_file', this.hotkeys.open_file), this.hotkeys.open_file, this.hotkeys_fn.open_file);
		}

		//Open Project (Ctrl+Shift+O)
		if (this.hotkeys.open_project) {
			this.hotkeys_fn.open_project = function(e) {

				core.dialog.open_project.show();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('open_project', this.hotkeys.open_project), this.hotkeys.open_project, this.hotkeys_fn.open_project);
		}

		//Close (Alt+X)
		if (this.hotkeys.close_file) {
			this.hotkeys_fn.close_file = function(e) {
				// var window_manager = core.module.layout.workspace.window_manager;
				// var active_window = window_manager.active_window;

				// var __window = core.module.layout.workspace.window_manager.window[active_window];

				// if (__window) {
				// 	__window.close();
				// 	__window.tab.close();
				// }

				// // window_manager.close_by_index(__window.index, __window.tab.index);

				$("[action=close_file]").click(); // jeongmin

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('close_file', this.hotkeys.close_file), this.hotkeys.close_file, this.hotkeys_fn.close_file);
		}


		if (this.hotkeys.tile_left) {
			this.special_shortcut.tile_left = this.hotkeys.tile_left; // jeongmin

			this.hotkeys_fn.tile_left = function(e) {
				if (self.make_shortcut_input(e) == self.special_shortcut.tile_left) {
					// if (e.keyCode === 219 && e.shiftKey && (e.ctrlKey || e.metaKey)) {
					core.module.layout.workspace.window_manager.tile_left();
					e.stopPropagation()
					e.preventDefault();
					return false;
				}

			};

			doc_obj.bind('keydown.' + this.make_namespace('tile_left', this.hotkeys.tile_left), this.hotkeys_fn.tile_left);
		}

		if (this.hotkeys.tile_right) {
			this.special_shortcut.tile_right = this.hotkeys.tile_right; // jeongmin

			this.hotkeys_fn.tile_right = function(e) {
				if (self.make_shortcut_input(e) == self.special_shortcut.tile_right) {
					// if (e.keyCode === 221 && e.shiftKey && (e.ctrlKey || e.metaKey)) {
					core.module.layout.workspace.window_manager.tile_right();
					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			};

			doc_obj.bind('keydown.' + this.make_namespace('tile_right', this.hotkeys.tile_right), this.hotkeys_fn.tile_right);
		}


		// new_terminal_window (Alt+Shift+T)
		if (this.hotkeys.new_terminal_window) {
			this.hotkeys_fn.new_terminal_window = function(e) {
				if (!core.status.keydown) {
					$($("a[action=new_terminal_window]").get(0)).trigger("click");
					core.status.keydown = true;
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('new_terminal_window', this.hotkeys.new_terminal_window), this.hotkeys.new_terminal_window, this.hotkeys_fn.new_terminal_window);
		}


		//Close All (Alt+Shift+X)
		if (this.hotkeys.close_all) {
			this.hotkeys_fn.close_all = function(e) {
				var window_manager = core.module.layout.workspace.window_manager;
				window_manager.close_all();



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('close_all', this.hotkeys.close_all), this.hotkeys.close_all, this.hotkeys_fn.close_all);
		}

		//Save (Ctrl+S)
		if (this.hotkeys.save_file) {
			var ctrlsEventLock = false;

			this.hotkeys_fn.save_file = function(e) {
				if (!self.prevent($('a[action="save_file"]').get(0)) && !ctrlsEventLock) {
					ctrlsEventLock = true;

					$('a[action=save_file]').click();

					$.debounce(function() {
						ctrlsEventLock = false;
					}, 500)();
				}

				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('save_file', this.hotkeys.save_file), this.hotkeys.save_file, this.hotkeys_fn.save_file);
		}

		//Save as File (Ctrl+Shift+S)
		if (this.hotkeys.save_as_file) {
			this.hotkeys_fn.save_as_file = function(e) {
				if (self.prevent($('a[action="save_as_file"]').get(0))) {
					return false;
				}

				core.dialog.save_as_file.show();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('save_as_file', this.hotkeys.save_as_file), this.hotkeys.save_as_file, this.hotkeys_fn.save_as_file);
		}

		//Save All (Alt+Ctrl+S)
		if (this.hotkeys.save_all_file) {
			this.hotkeys_fn.save_all_file = function(e) {
				if (self.prevent($('a[action="save_all_file"]').get(0))) {
					return false;
				}

				core.module.layout.workspace.window_manager.save_all();



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('save_all_file', this.hotkeys.save_all_file), this.hotkeys.save_all_file, this.hotkeys_fn.save_all_file);
		}

		//Move (Ctrl+Shift+M)
		if (this.hotkeys.move_file) {
			this.hotkeys_fn.move_file = function(e) {

				if (core.status.selected_file) {
					core.dialog.move_file.show("context");
				} else {
					alert.show(core.module.localization.msg.alert_select_file);
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('move_file', this.hotkeys.move_file), this.hotkeys.move_file, this.hotkeys_fn.move_file);
		}

		//Rename (Ctrl+Shift+R)
		if (this.hotkeys.rename_file) {
			this.hotkeys_fn.rename_file = function(e) {
				$("[action=rename_file]").click();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('rename_file', this.hotkeys.rename_file), this.hotkeys.rename_file, this.hotkeys_fn.rename_file);
		}

		//Duplicate (Ctrl+Shift+A)
		if (this.hotkeys.duplicate_file) {
			this.hotkeys_fn.duplicate_file = function(e) {
				$("[action=duplicate_file]").click();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('duplicate_file', this.hotkeys.duplicate_file), this.hotkeys.duplicate_file, this.hotkeys_fn.duplicate_file);
		}

		//Delete (Ctrl+Shift+D)
		if (this.hotkeys.delete_file) {
			this.hotkeys_fn.delete_file = function(e) {
				if (self.prevent($('a[action="delete_file"]').get(0))) {
					return false;
				}

				if (core.status.selected_file) {
					$("[action=delete_file]").click();
				} else {
					alert.show(core.module.localization.msg.alert_select_file);
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('delete_file', this.hotkeys.delete_file), this.hotkeys.delete_file, this.hotkeys_fn.delete_file);
		}

		//Refresh (Ctrl+R)
		if (this.hotkeys.refresh_project_directory) {
			this.hotkeys_fn.refresh_project_directory = function(e) {
				core.module.layout.project_explorer.refresh();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('refresh_project_directory', this.hotkeys.refresh_project_directory), this.hotkeys.refresh_project_directory, this.hotkeys_fn.refresh_project_directory);
		}
		
		//Main Menu : Edit

		//Undo (Ctrl+Z)
		// if (this.hotkeys.do_undo) {
		// 	this.hotkeys_fn.do_undo = function(e) {
		// 		if (self.prevent($('a[action="do_undo"]').get(0))) {
		// 			return false;
		// 		}

		// 		$("a[action=do_undo]").click();

		// 		e.stopPropagation();
		// 		e.preventDefault();
		// 		return false;
		// 	};

		// 	doc_obj.bind('keydown.' + this.make_namespace('do_undo', this.hotkeys.do_undo), this.hotkeys.do_undo, this.hotkeys_fn.do_undo);
		// }

		// //Redo (CTRL+Y)
		// if (this.hotkeys.do_redo) {
		// 	this.hotkeys_fn.do_redo = function(e) {
		// 		if (self.prevent($('a[action="do_redo"]').get(0))) {
		// 			return false;
		// 		}

		// 		$("a[action=do_redo]").click();

		// 		e.stopPropagation();
		// 		e.preventDefault();
		// 		return false;
		// 	};

		// 	doc_obj.bind('keydown.' + this.make_namespace('do_redo', this.hotkeys.do_redo), this.hotkeys.do_redo, this.hotkeys_fn.do_redo);
		// }

		//jeongmin: these keys will be handled by browser
		//Cut (CTRL+X)
		// if (this.hotkeys.do_cut) {
		// 	//cut text. This function is called from editor. Jeong-Min Im.
		// 	this.hotkeys_fn.do_cut = function (e, editor, context) {	//e: event, editor: codemirror, context: edit object
		// 		if(editor) {
		// 			$("a[action=do_cut]").trigger("click");
		// 			e.stopPropagation();
		// 			e.preventDefault();
		// 			return false;
		// 		}
		// 	};

		// 	doc_obj.bind('keydown.'+this.make_namespace('do_cut', this.hotkeys.do_cut), this.hotkeys.do_cut, this.hotkeys_fn.do_cut);
		// }

		//Copy (Ctrl+C)
		// if (this.hotkeys.do_copy) {
		// 	//copy text. This function is called from editor. Jeong-Min Im.
		// 	this.hotkeys_fn.do_copy = function (e, editor, context) {	//e: event, editor: codemirror, context: edit object
		// 		if(!editor && !self.get_focus()) {
		// 			$("a[action=do_copy]").trigger("click");
		// 			e.stopPropagation();
		// 			e.preventDefault();
		// 			return false;
		// 		}
		// 	};

		// 	doc_obj.bind('keydown.'+this.make_namespace('do_copy', this.hotkeys.do_copy), this.hotkeys.do_copy, this.hotkeys_fn.do_copy);
		// }

		//Paste (Ctrl+V)
		// if (this.hotkeys.do_paste) {
		// 	//paste text. This function is called from editor. Jeong-Min Im.
		// 	this.hotkeys_fn.do_paste = function (e, editor, context) {	//e: event, editor: codemirror, context: edit object
		// 		if(!editor  && !self.get_focus()) {
		// 			$("a[action=do_paste]").trigger("click");
		// 			e.stopPropagation();
		// 			e.preventDefault();
		// 			return false;
		// 		}
		// 	};

		// 	doc_obj.bind('keydown.'+this.make_namespace('do_paste', this.hotkeys.do_paste), this.hotkeys.do_paste, this.hotkeys_fn.do_paste);
		// }

		//Delete (Backspace)
		if (this.hotkeys.do_delete) {
			this.hotkeys_fn.do_delete = function(e) {
				// jeongmin: if input area is focused, don't trigger this event
				if ($(e.target).is(':focus'))
					return;

				if (self.prevent($('a[action="do_delete"]').get(0))) {
					return false;
				}

				var window_manager = core.module.layout.workspace.window_manager;


				$("a[action=do_delete]").trigger("click");
				e.stopPropagation();
				e.preventDefault();
				return false;

			};

			doc_obj.bind('keydown.' + this.make_namespace('do_delete', this.hotkeys.do_delete), this.hotkeys.do_delete, this.hotkeys_fn.do_delete);
		}

		/*
		//Select All (Ctrl+A)
		if (this.hotkeys.select_all) {
			this.hotkeys_fn.select_all = function(e) {

				$("a[action=select_all]").trigger("click");
				e.stopPropagation();
				e.preventDefault();
				return false;

			};

			doc_obj.bind('keydown.' + this.make_namespace('select_all', this.hotkeys.select_all), this.hotkeys.select_all, this.hotkeys_fn.select_all);
		}
		*/

		
		//Find and Replace (Ctrl+F)
		if (this.hotkeys.do_find) {
			this.hotkeys_fn.do_find = function(e) {

				var window_manager = core.module.layout.workspace.window_manager;

				if (window_manager.window[window_manager.active_window].editor) {
					$("a[action=do_find]").click();
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('do_find', this.hotkeys.do_find), this.hotkeys.do_find, this.hotkeys_fn.do_find);
		}
		delete CodeMirror.keyMap['default']['Cmd-F'];
		delete CodeMirror.keyMap.macDefault['Cmd-F'];
		delete CodeMirror.keyMap.pcDefault['Ctrl-F'];

		//Go to Line (Alt+Ctrl+L)
		if (this.hotkeys.do_go_to_line) {
			this.hotkeys_fn.do_go_to_line = function(e) {

				$("a[action=do_go_to_line]").get(0).click();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('do_go_to_line', this.hotkeys.do_go_to_line), this.hotkeys.do_go_to_line, this.hotkeys_fn.do_go_to_line);
		}

		//Toggle Breakpoint (Ctrl+B).
		if (this.hotkeys.toggle_breakpoint) {
			this.hotkeys_fn.toggle_breakpoint = function(e) {
				$("a[action=toggle_breakpoint]").get(0).click();

				e.stopPropagation();
				e.preventDefault();
				return false;

			};

			doc_obj.bind('keydown.' + this.make_namespace('toggle_breakpoint', this.hotkeys.toggle_breakpoint), this.hotkeys.toggle_breakpoint, this.hotkeys_fn.toggle_breakpoint);
		}

		//Toggle Bookmark (Ctrl+F2). Jeong-Min Im.
		if (this.hotkeys.toggle_bookmark) {
			//toggle bookmark. Jeong-Min Im.
			this.hotkeys_fn.toggle_bookmark = function(e, editor, context) { //e:event, editor: codemirror, context: edit object
				if (editor) {
					$("a[action=toggle_bookmark]").get(0).click();

					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			};

			doc_obj.bind('keydown.' + this.make_namespace('toggle_bookmark', this.hotkeys.toggle_bookmark), this.hotkeys.toggle_bookmark, this.hotkeys_fn.toggle_bookmark);
		}

		//Next Bookmark (F2). Jeong-Min Im.
		if (this.hotkeys.next_bookmark) {
			this.hotkeys_fn.next_bookmark = function(e, editor, context) {
				if (editor) {
					$("a[action=next_bookmark]").get(0).click();

					e.stopPropagation();
					e.preventDefault();
					return false;
				}
				//jeongmin: if editor isn't focused, just let this event flow
			};

			doc_obj.bind('keydown.' + this.make_namespace('next_bookmark', this.hotkeys.next_bookmark), this.hotkeys.next_bookmark, this.hotkeys_fn.next_bookmark);
		}

		//Prev Bookmark (Shift+F2). Jeong-Min Im.
		if (this.hotkeys.prev_bookmark) {
			//go to previous bookmark from current cursor line. Jeong-Min Im.
			this.hotkeys_fn.prev_bookmark = function(e, editor, context) { //e:event, editor: codemirror, context: edit object
				if (editor) {
					$("a[action=prev_bookmark]").get(0).click();

					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			};

			doc_obj.bind('keydown.' + this.make_namespace('prev_bookmark', this.hotkeys.prev_bookmark), this.hotkeys.prev_bookmark, this.hotkeys_fn.prev_bookmark);
		}

		//Clear Bookmark (Ctrl+Shift+F2). Jeong-Min Im.
		if (this.hotkeys.clear_bookmark) {
			//clear all bookmarks. Jeong-Min Im.
			this.hotkeys_fn.clear_bookmark = function(e, editor, context) { //e:event, editor: codemirror, context: edit object
				if (editor) {
					$("a[action=clear_bookmark]").get(0).click();

					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			};

			doc_obj.bind('keydown.' + this.make_namespace('clear_bookmark', this.hotkeys.clear_bookmark), this.hotkeys.clear_bookmark, this.hotkeys_fn.clear_bookmark);
		}

		//Search (Alt+H)
		if (this.hotkeys.search) {
			this.hotkeys_fn.search = function(e) {

				var window_manager = core.module.layout.workspace.window_manager;

				core.dialog.search.show();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('search', this.hotkeys.search), this.hotkeys.search, this.hotkeys_fn.search);
		}

		//Find Next (Ctrl+G)

		if (this.hotkeys.do_find_next) {
			this.hotkeys_fn.do_find_next = function(e) {

				var window_manager = core.module.layout.workspace.window_manager;
				var editor = window_manager.window[window_manager.active_window].editor;

				if (editor) {
					// only called when search highlight not activated.
					// codemirror default shortcut will be activated in search mode. we need to remove duplicate action.
					if (editor.editor) {
						core.dialog.find_and_replace.find();
					}
					core.status.keydown = true;
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('do_find_next', this.hotkeys.do_find_next), this.hotkeys.do_find_next, this.hotkeys_fn.do_find_next);
		}

		//Find Previous (Ctrl+Shift+G)

		if (this.hotkeys.do_find_previous) {
			this.hotkeys_fn.do_find_previous = function(e) {
				var window_manager = core.module.layout.workspace.window_manager;
				var editor = window_manager.window[window_manager.active_window].editor;

				if (editor) {
					// only called when search highlight not activated.
					// codemirror default shortcut will be activated in search mode. we need to remove duplicate action.
					// if (editor.editor && editor.editor.state.search.query) {
					if (editor.editor) { // jeongmin: query condition prevents prev, but we need to do prev even though we're not in search state
						core.dialog.find_and_replace.find_prev();
					}
					core.status.keydown = true;
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('do_find_previous', this.hotkeys.do_find_previous), this.hotkeys.do_find_previous, this.hotkeys_fn.do_find_previous);
		}
		
		//Open Preference (Alt+P)
		if (this.hotkeys.preference) {
			this.hotkeys_fn.preference = function(e) {

				core.dialog.preference.show();



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('preference', this.hotkeys.preference), this.hotkeys.preference, this.hotkeys_fn.preference);
		}

		//Main Menu : Edit

		//Debug (Alt+F5)
		if (this.hotkeys.debug) {
			this.hotkeys_fn.debug = function(e) {
				if (self.prevent($('a[action="debug"]').get(0))) // jeongmin: some projects don't support debug...
					return false;

				core.module.debug.debug_start();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('debug', this.hotkeys.debug), this.hotkeys.debug, this.hotkeys_fn.debug);
		}

		//Debug Terminate (F4)
		if (this.hotkeys.debug_terminate) {
			this.hotkeys_fn.debug_terminate = function(e) {
				if (self.prevent($('a[action="debug_terminate"]').get(0))) // jeongmin: some projects don't support debug...
					return false;

				core.module.debug.debug_terminate();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('debug_terminate', this.hotkeys.debug_terminate), this.hotkeys.debug_terminate, this.hotkeys_fn.debug_terminate);
		}

		//Debug Continue(Ctrl/Meta+Shift+Y)
		if (this.hotkeys.debug_continue) {
			this.hotkeys_fn.debug_continue = function(e) {
				if (self.prevent($('a[action="debug_continue"]').get(0))) // jeongmin: some projects don't support debug...
					return false;

				core.module.debug.debug_continue();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('debug_continue', this.hotkeys.debug_continue), this.hotkeys.debug_continue, this.hotkeys_fn.debug_continue);
		}

		//Debug Step Over(F6)
		if (this.hotkeys.debug_step_over) {
			this.hotkeys_fn.debug_step_over = function(e) {
				if (self.prevent($('a[action="debug_step_over"]').get(0))) // jeongmin: some projects don't support debug...
					return false;

				core.module.debug.debug_step_over();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('debug_step_over', this.hotkeys.debug_step_over), this.hotkeys.debug_step_over, this.hotkeys_fn.debug_step_over);
		}

		//Debug Step In(F7)
		if (this.hotkeys.debug_step_in) {
			this.hotkeys_fn.debug_step_in = function(e) {
				if (self.prevent($('a[action="debug_step_in"]').get(0))) // jeongmin: some projects don't support debug...
					return false;

				core.module.debug.debug_step_in();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('debug_step_in', this.hotkeys.debug_step_in), this.hotkeys.debug_step_in, this.hotkeys_fn.debug_step_in);
		}

		//Debug Step Out(F8)
		if (this.hotkeys.debug_step_out) {
			this.hotkeys_fn.debug_step_out = function(e) {
				if (self.prevent($('a[action="debug_step_out"]').get(0))) // jeongmin: some projects don't support debug...
					return false;

				core.module.debug.debug_step_out();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('debug_step_out', this.hotkeys.debug_step_out), this.hotkeys.debug_step_out, this.hotkeys_fn.debug_step_out);
		}
		
		var key_event_lock = false;

		//Build Current Project - F5
		if (this.hotkeys.build_project) {
			this.hotkeys_fn.build_project = function(e) {
				var project_path = core.status.current_project_path;
				var project_type = core.status.current_project_type;

				core.module.project.load_build({
					'project_path': project_path,
					'project_type': project_type,
					'check': true
				});

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('build_project', this.hotkeys.build_project), this.hotkeys.build_project, this.hotkeys_fn.build_project);
		}

		// Build...(Dialog) - Alt + Shift + F5
		if (this.hotkeys.build_dialog) {
			this.hotkeys_fn.build_dialog = function(e) {
				if (self.prevent($('a[action="build_dialog"]').get(0))) {
					return false;
				}

				core.module.layout.select('terminal');
				core.dialog.build_project.show();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('build_dialog', this.hotkeys.build_dialog), this.hotkeys.build_dialog, this.hotkeys_fn.build_dialog);
		}

		//Run - Shift + F5
		if (this.hotkeys.run) {
			this.hotkeys_fn.run = function(e) {
				if (self.prevent($('a[action="run"]').get(0))) {
					return false;
				}

				core.module.project.run();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('run', this.hotkeys.run), this.hotkeys.run, this.hotkeys_fn.run);
		}
		
		// var key_event_lock = false;
		document.onkeydown = function(e) {
			// hidden by jeongmin: these are changed to jquery event binding as above
			//Build Current Project - F5
			// if (e.keyCode == 116 && (e.ctrlKey === false && e.metaKey === false) && e.shiftKey === false) {
			// 	if (core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type] !== undefined) {



			// 		$.get("project/check_running_project", {},
			// 			function(data) {

			// 				if (data && data.result === 0) {
			// 					//build
			// 					core.module.plugin_manager.plugins["goorm.plugin." + core.status.current_project_type].build(core.status.current_project_path);
			// 				} else {
			// 					var result = {
			// 						result: false,
			// 						code: 7
			// 					};
			// 					core.module.project.display_error_message(result, 'alert');
			// 				}
			// 			}
			// 		);

			// 	}

			// 	e.stopPropagation();
			// 	e.preventDefault();
			// 	return false;
			// } // Build...(Dialog) - Alt + Shift + F5
			// else if (e.keyCode == 116 && e.ctrlKey === false && e.metaKey === false && e.shiftKey === true && e.altKey === true) {
			// 	if (self.prevent($('a[action="build_dialog"]').get(0))) {
			// 		return false;
			// 	}

			// 	core.module.layout.select('terminal');
			// 	core.dialog.build_project.show();

			// 	e.stopPropagation();
			// 	e.preventDefault();
			// 	return false;
			// } //Run - Shift + F5
			// else if (e.keyCode == 116 && e.ctrlKey === false && e.metaKey === false && e.shiftKey === true && e.altKey === false) {
			// 	if (self.prevent($('a[action="run"]').get(0))) {
			// 		return false;
			// 	}

			// 	core.module.project.run();

			// 	e.stopPropagation();
			// 	e.preventDefault();
			// 	return false;
			// } else if (e.keyCode == 191 && (e.ctrlKey === true || e.metaKey === true) && e.shiftKey === false) {
			// 	if (key_event_lock === false) {
			// 		key_event_lock = true;
			// 		var window_manager = core.module.layout.workspace.window_manager;

			// 		if (window_manager.window[window_manager.active_window].editor) {
			// 			window_manager.window[window_manager.active_window].editor.comment_selection();
			// 			core.status.keydown = true;
			// 		}
			// 		e.stopPropagation();
			// 		e.preventDefault();
			// 		window.setTimeout(function() {
			// 			key_event_lock = false;
			// 		}, 500);
			// 	}
			// 	return false;
			// } else

			if (self.get_focus() === "input" && core.status.focus_on_dialog) {
				var selected_dialog = core.status.selected_dialog;

				if (e.keyCode === 27) {
					// Dialog
					//
					if (core.status.selected_dialog.modal) {
						core.status.selected_dialog.modal('hide');
					}

					// Dialog Explorer
					//
					if (selected_dialog && selected_dialog.caller && selected_dialog.caller.panel.modal) {
						selected_dialog.caller.panel.modal('hide');
					}
				}
			}
		};

		//Clean (Ctrl+Del)
		if (this.hotkeys.build_clean) {
			this.hotkeys_fn.build_clean = function(e) {

				core.dialog.build_clean.show();

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('build_clean', this.hotkeys.build_clean), this.hotkeys.build_clean, this.hotkeys_fn.build_clean);
		}

		//Editor Fold (Ctrl+Q)
		//fold codes. This function is called from editor. Jeong-Min Im.
		this.hotkeys_fn.editor_fold = function(e, editor, context) { //e: event, editor: codemirror, context: edit object
			if (editor) {
				editor.foldCode(editor.getCursor());
				context.reset_breakpoints();

				e.stopPropagation();
				e.preventDefault();
				return false;
			}
		};
		doc_obj.bind('keydown.' + this.make_namespace('editor_fold', "Ctrl+Q"), "Ctrl+Q", this.hotkeys_fn.editor_fold);
		this.fixed_shortcut.push('Ctrl+Q');

		//Editor Hint (Ctrl+Space)
		//show codes' hint. This function is called from editor. Jeong-Min Im.
		this.hotkeys_fn.editor_hint = function(e, editor, context) { //e: event, editor: codemirror, context: edit object
			if (editor) {
				switch (context.mode) {
					case "application/xml":
						CodeMirror.showHint(editor, CodeMirror.xmlHint);
						break;

					default:
						if (context.dictionary.completable && $(context.dictionary.target).find("ul.dictionary_box").css("display") == "block") {
							context.dictionary.complete();
							editor.focus();
						} else {
							var cursor = editor.getCursor();
							var token = editor.getTokenAt(cursor);
							context.dictionary.search(token.string);
							context.dictionary.show();
							editor.focus();
							context.dictionary.select_top();
						}
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			}
		};
		doc_obj.bind('keydown.' + this.make_namespace('editor_hint', "Ctrl+Space"), "Ctrl+Space", this.hotkeys_fn.editor_hint);
		this.fixed_shortcut.push('Ctrl+Space');

		//Editor Import Java (Ctrl+Shift+O)
		//import java project. This function is called from editor. Jeong-Min Im.
		this.hotkeys_fn.editor_import_java = function(e, editor, context) { //e: event, editor: codemirror, context: edit object
			if (editor) {
				switch (context.mode) {
					case "text/x-java":
						var cursor = editor.getCursor();

						var postdata = {};
						postdata.err_java_file = core.status.err_java_file;
						postdata.missing_symbol = core.status.missing_symbol;
						postdata.selected_file_path = core.module.layout.workspace.window_manager.active_filename;

						if (!postdata.missing_symbol || postdata.missing_symbol.length === 0) break;
						_$.get('/edit/get_auto_import_java', postdata, function(data) {
							if (data.last_package_def_sentence != -1) {

								var start = data.last_package_def_sentence - 1;
								var end = data.first_class_def_sentence - 1;

								var add_statement_line = start;
								for (var i = start; i <= end; i++) {
									if (editor.getLine(i) === "") {
										add_statement_line = i;
										break;
									}
								}

								if (add_statement_line == -1) add_statement_line = 0;
								if (add_statement_line == end) {
									editor.setLine(end, "\n" + editor.getLine(end));
								}
								for (var i = 0; i < data.import_statement.length; i++) {
									editor.setLine(add_statement_line, editor.getLine(add_statement_line) + "\n" + (data.import_statement[i].content));

								}
								context.save(true, true);
							}

						});
						break;

					default:
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			}
		};
		doc_obj.bind('keydown.' + this.make_namespace('editor_import_java', "Ctrl+Shift+O"), "Ctrl+Shift+O", this.hotkeys_fn.editor_import_java);
		this.fixed_shortcut.push('Ctrl+Shift+O');

		//Editor Close Tags (Ctrl+Shift+C)
		//close tags. This function is called from editor. Jeong-Min Im.
		this.hotkeys_fn.editor_close_tags = function(e, editor, context) { //e: event, editor: codemirror, context: edit object
			if (editor) {
				var state = context.editor.options.autoCloseTags ? false : true;
				context.editor.setOption("autoCloseTags", state);

				e.stopPropagation();
				e.preventDefault();
				return false;
			}
		};
		doc_obj.bind('keydown.' + this.make_namespace('editor_close_tags', "Ctrl+Shift+C"), "Ctrl+Shift+C", this.hotkeys_fn.editor_close_tags);
		this.fixed_shortcut.push('Ctrl+Shift+C');

		//Editor Subtract Indent (Shift+Tab)
		//subtract indent. This function is called from editor. Jeong-Min Im.
		// this.hotkeys_fn.editor_subtract_indent = function(e, editor, context) { //e: event, editor: codemirror, context: edit object
		// 	if (editor) {console.log('editor:', editor);
		// 		editor.indentSelection("subtract");

		// 		e.stopPropagation();
		// 		e.preventDefault();
		// 		return false;
		// 	}
		// };
		// doc_obj.bind('keydown.' + this.make_namespace('editor_subtract_indent', "Shift+Tab"), "Shift+Tab", this.hotkeys_fn.editor_subtract_indent);
		this.fixed_shortcut.push('Shift+Tab');
		CodeMirror.keyMap.basic['Shift-Tab'] = 'indentLess'; // jeongmin: change basic keymap as our shortcut.

		//Main Menu : window

		//Previous window (Alt+Shift+[)
		if (this.hotkeys.previous_window) {
			this.hotkeys_fn.previous_window = function(e) {
				if (e.keyCode == 219 && e.shiftKey && e.altKey) {
					if (!core.status.keydown) {
						core.module.layout.workspace.window_manager.previous_window();
						core.status.keydown = true;
					}



					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			};

			doc_obj.bind('keydown.' + this.make_namespace('previous_window', this.hotkeys.previous_window), this.hotkeys_fn.previous_window);
		}

		//Next window (Alt+Shift+])
		if (this.hotkeys.next_window) {
			this.hotkeys_fn.next_window = function(e) {
				if (e.keyCode == 221 && e.shiftKey && e.altKey) {
					if (!core.status.keydown) {
						core.module.layout.workspace.window_manager.next_window();
						core.status.keydown = true;
					}



					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			};

			doc_obj.bind('keydown.' + this.make_namespace('next_window', this.hotkeys.next_window), this.hotkeys_fn.next_window);
		}

		//Left Layout Show/Hide (Alt+Shift+L)
		if (this.hotkeys.left_layout_toggle) {
			this.hotkeys_fn.left_layout_toggle = function(e) {
				if (!core.status.keydown) {
					// if (core.module.layout.layout.getUnitByPosition("left")._collapsed) {
					// 	core.module.layout.layout.getUnitByPosition("left").expand();
					// } else {
					// 	core.module.layout.layout.getUnitByPosition("left").collapse();
					// }
					core.module.layout.toggle('west');
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('left_layout_toggle', this.hotkeys.left_layout_toggle), this.hotkeys.left_layout_toggle, this.hotkeys_fn.left_layout_toggle);
		}

		// //Show Project Explorer (Alt+Shift+1)
		// if (this.hotkeys.left_project_explorer_show) {
		// 	this.hotkeys_fn.left_project_explorer_show = function(e) {
		// 		if (!core.status.keydown) {
		// 			// if (core.module.layout.layout.getUnitByPosition("left")._collapsed) {
		// 			// 	core.module.layout.layout.getUnitByPosition("left").expand();
		// 			// }
		// 			// core.module.layout.left_tabview.selectTab(0);
		// 			core.module.layout.select('project');
		// 		}



		// 		e.stopPropagation();
		// 		e.preventDefault();
		// 		return false;
		// 	};

		// 	doc_obj.bind('keydown.' + this.make_namespace('left_project_explorer_show', this.hotkeys.left_project_explorer_show), this.hotkeys.left_project_explorer_show, this.hotkeys_fn.left_project_explorer_show);
		// }

		//Show Packages (Alt+Shift+2)
		/*
		if (this.hotkeys.left_project_explorer_show) {
			this.hotkeys_fn.left_packages_show = function(e) {
				if (!core.status.keydown) {
					core.module.layout.select('packages');
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('left_packages_show', this.hotkeys.left_packages_show), this.hotkeys.left_packages_show, this.hotkeys_fn.left_packages_show);
		}
		*/
		
		//Right Layout Show/Hide (Alt+Shift+R)
		if (this.hotkeys.right_layout_toggle) {
			this.hotkeys_fn.right_layout_toggle = function(e) {
				if (!core.status.keydown) {
					// if (core.module.layout.inner_layout.getUnitByPosition("right")._collapsed) {
					// 	core.module.layout.inner_layout.getUnitByPosition("right").expand();
					// } else {
					// 	core.module.layout.inner_layout.getUnitByPosition("right").collapse();
					// }
					core.module.layout.toggle('east');
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('right_layout_toggle', this.hotkeys.right_layout_toggle), this.hotkeys.right_layout_toggle, this.hotkeys_fn.right_layout_toggle);
		}

		

		//Right Layout Outline (Alt+Shift+7)
		if (this.hotkeys.right_outline_show) {
			this.hotkeys_fn.right_outline_show = function(e) {
				if (!core.status.keydown) {
					// if (core.module.layout.inner_layout.getUnitByPosition("right")._collapsed) {
					// 	core.module.layout.inner_layout.getUnitByPosition("right").expand();
					// }
					// core.module.layout.inner_right_tabview.selectTab(3);
					var current_file_type = core.module.layout.workspace.window_manager.active_filename.split('.').pop();
					switch (current_file_type) {
						case 'c':
						case 'cpp':
						case 'java':
						case 'py':
						case 'js':
						case 'html':
						case 'css':
							core.module.layout.select('outline');
							break;

						default:

							break;

					}
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('right_outline_show', this.hotkeys.right_outline_show), this.hotkeys.right_outline_show, this.hotkeys_fn.right_outline_show);
		}

		//Bottom Layout Show/Hide (Alt+Shift+B)
		if (this.hotkeys.bottom_layout_toggle) {
			this.hotkeys_fn.bottom_layout_toggle = function(e) {
				if (!core.status.keydown) {
					// if (core.module.layout.inner_layout.getUnitByPosition("bottom")._collapsed) {
					// 	core.module.layout.inner_layout.getUnitByPosition("bottom").expand();
					// } else {
					// 	core.module.layout.inner_layout.getUnitByPosition("bottom").collapse();
					// }
					core.module.layout.toggle('south');
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('bottom_layout_toggle', this.hotkeys.bottom_layout_toggle), this.hotkeys.bottom_layout_toggle, this.hotkeys_fn.bottom_layout_toggle);
		}

		//Bottom Layout Toggle Debug (Alt+Shift+8)
		if (this.hotkeys.bottom_debug_show) {
			this.hotkeys_fn.bottom_debug_show = function(e) {
				if (!core.status.keydown) {
					// if (core.module.layout.inner_layout.getUnitByPosition("bottom")._collapsed) {
					// 	core.module.layout.inner_layout.getUnitByPosition("bottom").expand();
					// }
					core.module.layout.select('debug');
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};
			doc_obj.bind('keydown.' + this.make_namespace('bottom_debug_show', this.hotkeys.bottom_debug_show), this.hotkeys.bottom_debug_show, this.hotkeys_fn.bottom_debug_show);
		}

		//Bottom Layout console (Alt+Shift+9)
		if (this.hotkeys.bottom_console_show) {
			this.hotkeys_fn.bottom_console_show = function(e) {
				if (!core.status.keydown) {
					// if (core.module.layout.inner_layout.getUnitByPosition("bottom")._collapsed) {
					// 	core.module.layout.inner_layout.getUnitByPosition("bottom").expand();
					// }
					core.module.layout.select('terminal');
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('bottom_console_show', this.hotkeys.bottom_console_show), this.hotkeys.bottom_console_show, this.hotkeys_fn.bottom_console_show);
		}

		//Bottom Layout search (Alt+Shift+9)
		if (this.hotkeys.bottom_search_show) {
			this.hotkeys_fn.bottom_search_show = function(e) {
				if (!core.status.keydown) {
					// if (core.module.layout.inner_layout.getUnitByPosition("bottom")._collapsed) {
					// 	core.module.layout.inner_layout.getUnitByPosition("bottom").expand();
					// }
					core.module.layout.select('search');
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('bottom_search_show', this.hotkeys.bottom_search_show), this.hotkeys.bottom_search_show, this.hotkeys_fn.bottom_search_show);
		}

		// (Alt+Shift+W)
		if (this.hotkeys.toggle_full_workspace) {
			this.hotkeys_fn.toggle_full_workspace = function(e) {
				if (!core.status.keydown) {
					$($("a[action=toggle_full_workspace]").get(0)).trigger("click");
					core.status.keydown = true;
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('toggle_full_workspace', this.hotkeys.toggle_full_workspace), this.hotkeys.toggle_full_workspace, this.hotkeys_fn.toggle_full_workspace);
		}

		//Hide All window (Alt+Shift+H)
		if (this.hotkeys.hide_all_windows) {
			this.hotkeys_fn.hide_all_windows = function(e) {
				if (!core.status.keydown) {
					if ($("[action=hide_all_windows]").parent().hasClass("disabled") === true) {
						return false;
					} else {
						core.module.layout.workspace.window_manager.hide_all_windows();
					}

				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('hide_all_windows', this.hotkeys.hide_all_windows), this.hotkeys.hide_all_windows, this.hotkeys_fn.hide_all_windows);
		}

		//Show All window (Alt+Shift+S)
		if (this.hotkeys.show_all_windows) {
			this.hotkeys_fn.show_all_windows = function(e) {
				if (!core.status.keydown) {
					if ($("[action=show_all_windows]").parent().hasClass("disabled") === true) {
						return false;
					} else {
						core.module.layout.workspace.window_manager.show_all_windows();
					}
				}



				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('show_all_windows', this.hotkeys.show_all_windows), this.hotkeys.show_all_windows, this.hotkeys_fn.show_all_windows);
		}

		

		//View all shortcuts (Ctrl+H)
		if (this.hotkeys.view_all_shortcuts) {
			this.hotkeys_fn.view_all_shortcuts = function(e) {
				if (core.dialog.help_shortcuts.visible) {
					core.dialog.help_shortcuts.hide();
				} else {
					core.dialog.help_shortcuts.show();
				}

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

			doc_obj.bind('keydown.' + this.make_namespace('view_all_shortcuts', this.hotkeys.view_all_shortcuts), this.hotkeys.view_all_shortcuts, this.hotkeys_fn.view_all_shortcuts);

			// this.hotkeys_fn.view_all_shortcuts_up = function(e) {
			// 	if (core.dialog.help_shortcuts.visible) {
			// 		core.dialog.help_shortcuts.hide();
			// 	} else {
			// 		core.dialog.help_shortcuts.show();
			// 	}

			// 	e.stopPropagation();
			// 	e.preventDefault();
			// 	return false;
			// };

			// doc_obj.bind('keyup.' + this.make_namespace('view_all_shortcuts', this.hotkeys.view_all_shortcuts), this.hotkeys.view_all_shortcuts, this.hotkeys_fn.view_all_shortcuts_up);
		}

		// //Alt + Tab
		// doc_obj.bind('keydown.'+this.make_namespace, 'Alt+Tab', function (e) {
		// 	var window_manager = core.module.layout.workspace.window_manager;

		// 	if (!self.bind_transition) {
		// 		self.bind_transition = true;
		// 		window_manager.transition_manager.load_windows();
		// 		window_manager.transition_manager.load_css();
		// 		window_manager.transition_manager.show();
		// 	}

		// 	var next_window = (window_manager.active_window + 1) % window_manager.window.length;

		// 	window_manager.transition_manager.focus(next_window);
		// 	window_manager.window[next_window].activate();
		// 	window_manager.active_window = next_window;

		// 	e.stopPropagation();
		// 	e.preventDefault();
		// 	return false;
		// });
		// //Alt + Shift + Tab
		// doc_obj.bind('keydown.'+this.make_namespace, 'Alt+Shift+Tab', function (e) {
		// 	var window_manager = core.module.layout.workspace.window_manager;
		// 	var next_window;
		// 	if (!self.bind_transition) {
		// 		self.bind_transition = true;
		// 		window_manager.transition_manager.load_windows();
		// 		window_manager.transition_manager.load_css();
		// 		window_manager.transition_manager.show();
		// 	}

		// 	if (window_manager.active_window === 0) {
		// 		next_window = window_manager.window.length - 1;
		// 	} else {
		// 		next_window = window_manager.active_window - 1;
		// 	}

		// 	window_manager.transition_manager.focus(next_window);
		// 	window_manager.window[next_window].activate();
		// 	window_manager.active_window = next_window;

		// 	e.stopPropagation();
		// 	e.preventDefault();
		// 	return false;
		// });

		//Alt
		// doc_obj.bind('keyup', 'Ctrl', function (e) {
		// 	// if (self.bind_transition === true) {
		// 	// 	var window_manager = core.module.layout.workspace.window_manager;

		// 	// 	window_manager.transition_manager.hide();
		// 	// 	self.bind_transition = false;
		// 	// }

		// 	if (core.dialog.help_shortcuts.visible) {
		// 		core.dialog.help_shortcuts.hide();
		// 	}

		// 	e.stopPropagation();
		// 	e.preventDefault();
		// 	return false;
		// });

		// doc_obj.bind('keyup', 'Alt', function (e) {
		// 	if (core.dialog.help_shortcuts.visible) {
		// 		core.dialog.help_shortcuts.hide();
		// 	}

		// 	e.stopPropagation();
		// 	e.preventDefault();
		// 	return false;
		// });

		// console.log(this.hotkeys.view_all_shortcuts);
	},

	bind: function(action, key, fn) {
		$(document).bind('keydown.' + this.make_namespace(action, key), key, fn);
	},

	/**
	 * @brief Unbind specific key-event
	 * @details [long description]
	 *
	 * @param key : Keys in this.hotkeys
	 * @return Nothing
	 */
	unbind: function(action, key) {
		$(document).unbind('keydown.' + this.make_namespace(action, key));
		$(document).unbind('keyup.' + this.make_namespace(action, key));
	},

	get_focus: function() {
		if (document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "INPUT") {
			return "input";
		} else {
			return false;
		}
	},

	prevent: function(menu) { // if menu is disabled --> prevent click
		var pv = false;

		if ($(menu).parent().hasClass('disabled')) {
			pv = true;
		}

		return pv;
	}
};
