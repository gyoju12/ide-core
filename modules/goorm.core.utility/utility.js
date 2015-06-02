/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

Array.prototype.diff = function(a) {
	return this.filter(function(i) {
		return (a.indexOf(i) === -1);
	});
};

Array.prototype.unique = function() {
	var r = [];
	o: for (var i = 0, n = this.length; i < n; i++) {
		for (var x = 0, y = r.length; x < y; x++) {
			if (r[x] == this[i]) {
				continue o;
			}
		}
		r[r.length] = this[i];
	}
	return r;
};

Array.prototype.contains = function(element) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == element) {
			return true;
		}
	}
	return false;
};

Array.prototype.inArray = function(element) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == element) {
			return i;
		}
	}
	return -1;
};

Array.prototype.shuffle = function() {
	var i = this.length;
	var j;
	var t;

	var arr = this;
	while (i--) {
		j = Math.floor((i + 1) * Math.random());
		t = arr[i];
		arr[i] = arr[j];
		arr[j] = t;
	}
};

Array.prototype.hasObject = (!Array.indexOf ? function(o) {
	var l = this.length + 1;
	while (l--) {
		if (this[l - 1] === o) {
			return true;
		}
	}
	return false;
} : function(o) {
	return (this.indexOf(o) !== -1);
});


