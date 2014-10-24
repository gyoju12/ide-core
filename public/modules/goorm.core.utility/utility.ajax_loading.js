/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.utility.ajax_loading = {
	init: function(socket) {
		if (!socket) return;

		this.queue = [];
		var _this = this;

		socket.once = socket._once;
		socket.once = function(name, fn, loading_bar, loading_option) {
			// original once
			/*
			var self = this;

		    function on () {
		      self.removeListener(name, on);
		      fn.apply(this, arguments);
		    };

		    on.listener = fn;
		    this.on(name, on);

		    return this;
		    */

			var self = this;

			function on() {
				self.removeListener(name, on);
				fn.apply(this, arguments);
				if (loading_bar === true) {
					var i = _this.queue.indexOf(name);
					_this.queue.splice(i, 1);
					if (_this.queue.length === 0) {
						core.module.loading_bar.stop();
					}
				}
			};

			on.listener = fn;
			this.on(name, on);

			if (loading_bar === true) {
				core.module.loading_bar.start(loading_option);
				_this.queue.push(name);
			}

			return this;
		}.bind(socket);
	}
}