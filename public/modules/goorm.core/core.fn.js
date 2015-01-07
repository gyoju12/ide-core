/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.fn = {
	init: function () {
				// Expand jquery function : reverse()

		var _fn = $.fn;	//jeongmin: access object member less
		
		_fn.reverse = function () {
			return this.pushStack(this.get().reverse(), arguments);
		};

		//I forgot why I needed this function... fuck 
		_fn.formatForDisplay = function () {
			if (this.size() === 0) return "<em>wrapped set is empty</em>";
			var text = '';
			this.each(function () {
				text += '<div>' + this.tagName;
				if (this.id) text += '#' + this.id;
				text += '</div>';
			});
			return text;
		};

		_fn.move = function (old_index, new_index) {
			while (old_index < 0) {
				old_index += this.length;
			}
			while (new_index < 0) {
				new_index += this.length;
			}
			if (new_index >= this.length) {
				var k = new_index - this.length;
				while ((k--) + 1) {
					this.push(undefined);
				}
			}
			this.splice(new_index, 0, this.splice(old_index, 1)[0]);
			return this; // for testing purposes
		};

		var arr_proto = Array.prototype;	//jeongmin: access object member less

		arr_proto.remove = function (from, to) {
			var rest = this.slice((to || from) + 1 || this.length);
			this.length = from < 0 ? this.length + from : from;
			return this.push.apply(this, rest);
		};

		arr_proto.diff = function (a) {
			return this.filter(function (i) {
				return !(a.indexOf(i) > -1);
			});
		};

		arr_proto.unique = function () {
			var r = [];

			// for (var i = 0, n = this.length; i < n; i++) {
			// 	for (var x = 0, y = r.length; x < y; x++) {
			o: for (var i = this.length - 1; 0 <= i; i--) {	//jeongmin: conditional evaluation using 0(false)
				for (var x = r.length; 0 < x; x--) {
					if (r[x] == this[i]) {
						continue o;
					}
				}
				r[r.length] = this[i];
			}
			return r;
		};

		arr_proto.contains = function (element) {
			var len = this.length;	//jeongmin: prevent calculating length at each loop

			// var i = 0; i < this.length; i++
			for (var i = len; 0 < i; i--) {	//jeongmin: conditional evaluation using 0(false)
				if (this[i] == element) {
					return true;
				}
			}
			return false;
		};

		arr_proto.inArray = function (element) {
			var len = this.length;	//jeongmin: prevent calculating length at each loop

			// var i = 0; i < this.length; i++
			for (var i = len; 0 < i; i--) {	//jeongmin: conditional evaluation using 0(false)
				if (this[i] == element) {
					return i;
				}
			}
			return -1;
		};

		arr_proto.shuffle = function () {
			var i = this.length,
				j, t;
			while (i--) {
				j = Math.floor((i + 1) * Math.random());
				t = arr[i];
				arr[i] = arr[j];
				arr[j] = t;
			}
		};

		arr_proto.hasObject = (!Array.indexOf ? function (o) {
			var l = this.length + 1;

			// while (l -= 1)
			while (l--) {	//jeongmin: -- is better than -=
				if (this[l - 1] === o) {
					return true;
				}
			}
			return false;
		} : function (o) {
			return (this.indexOf(o) !== -1);
		});

		var bool_proto = Boolean.prototype;

		bool_proto.normalize = function () {
			return this;
		}

		var str_proto = String.prototype;

		str_proto.normalize = function() {
			if (this == "true" || this == true) {
				return true;
			} else if (this == "false" || this == false) {
				return false;
			} else {
				return this;
			}
		}
	}
};
