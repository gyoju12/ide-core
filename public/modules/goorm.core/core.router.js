/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.router = {
	socket: null,
	socket_fs: null,
	fs_load: false,
	fs_ready: false,

	init: function() {
		this._socket = function() {
			var self = this;

			// this.socket = goorm.core.router.socket;
			// this.socket_fs = goorm.core.router.socket_fs;

			// this.fs_load = goorm.core.router.fs_load;
			// this.fs_ready = goorm.core.router.fs_ready;

			

			
			this.fs_url = [];
			

			this.queue = [];

			this.wait_time = 30;
			this.work_time = 10;

			this.request_time = 0;
			this.request_limit = 1000; // 30 * 1000 = 30s

			this.worker = setInterval(function() {
				self.work();
			}, this.work_time);
		}

		this._socket.prototype = {
			router: goorm.core.router,
			set_url: function (url) {
				if (typeof(url) === 'string') {
					if (this.fs_url && this.fs_url.indexOf(url) === -1) {
						this.fs_url.push(url);
					}
				}
				else if (Array.isArray(url)) {
					this.fs_url = this.fs_url.concat(url);
					$.unique(this.fs_url);
				}
			},

			once: function(url, fn, loading) {
				var s = this.get(url);

				if (s && s.socket && s.socket.connected) {
					s.once(url, fn, loading);
				} else {
					this.push('once', [url, fn, loading]);
				}
			},

			on: function(url, fn) {
				var s = this.get(url);

				if (s && s.socket && s.socket.connected) {
					s.on(url, fn);
				} else {
					this.push('on', [url, fn]);
				}
			},

			emit: function(url, data) {
				var s = this.get(url);

				if (s && s.socket && s.socket.connected) {
					s.emit(url, data);
				} else {
					this.push('emit', [url, data]);
				}
			},

			get: function(url) {
				if (this.fs_url.indexOf(url) > -1) {
					if (this.router.fs_load && this.router.fs_ready) {
						return this.router.socket_fs;
					} else {
						return null;
					}
				} else {
					return this.router.socket;
				}
			},

			push: function(method, params) {
				this.queue.push({
					'method': method,
					'params': params
				});
			},

			work: function() {
				var self = this;

				if (this.router.fs_ready && this.queue && this.queue.length > 0) {
					if (this.request_time > this.request_limit) {
						var q = this.queue.shift();
						var s = this.router.socket;

						s[q.method].apply(s, q.params);
					} else {
						setTimeout(function() {
							var q = self.queue[0];

							if (q) {
								var url = q.params[0];

								var s = self.get(url);

								if (s && s.socket && s.socket.connected) {
									self.request_time = 0;
									q = self.queue.shift();

									s[q.method].apply(s, q.params);
								} else {
									self.request_time++;
									self.work();
								}
							}
						}, this.wait_time);
					}
				}
			}
		}

		this._$ = function () {
			var self = this;

			

			
			this.fs_url = [];
			
		};

		this._$.prototype = {
			router: goorm.core.router,
			set_option: function (host, port) {
				this.host = host;
				this.port = port;
			},
			set_url: function (url) {
				if (typeof(url) === 'string') {
					if (this.fs_url && this.fs_url.indexOf(url) === -1) {
						this.fs_url.push(url);
					}
				}
				else if (Array.isArray(url)) {
					this.fs_url = this.fs_url.concat(url);
					$.unique(this.fs_url);
				}
			},

			post: function(url, data, fn) {
				if (data && typeof (data) === 'function') {
					fn = data;
					data = null;
				}

				if (url && this.__get(url)) {
					if (url[0] === '/') url = url.substr(1);

					$.post('http://'+this.host+":"+this.port+'/'+url, data, fn, 'jsonp');
				}
				else {
					$.post(url, data, fn);
				}
			},

			get: function(url, data, fn) {
				if (data && typeof (data) === 'function') {
					fn = data;
					data = null;
				}

				if (url && this.__get(url)) {
					if (url[0] === '/') url = url.substr(1);

					$.ajax({
						url: 'http://'+this.host+":"+this.port+'/'+url,
						data: data,
						dataType: "jsonp",
						jsonp: 'callback',
						success: fn
					});
				}
				else {
					$.get(url, data, fn);
				}
			},

			__get: function(url) {
				if (this.fs_url.indexOf(url) > -1) {
					if (this.router.fs_load && this.router.fs_ready) {
						return true;
					} else {
						console.log('goormFS Fail', url);
						return false;
					}
				} else {
					return false;
				}
			}
		}
	},

	// manage socket connections. Jeong-Min Im.
	connect: function() {
		var self = this;

		var reconnect_attempts = 1;

		var generate_interval = function(k) {
			var maxInterval = (Math.pow(2, k) - 1) * 1000;

			if (maxInterval > 30 * 1000) {
				maxInterval = 30 * 1000; // If the generated interval is more than 30 seconds, truncate it down to 30 seconds.
			}

			// generate the interval to a random number between 0 and the maxInterval determined from above
			return Math.random() * maxInterval;
		};

		var disconnect = function() {
			console.log('Goorm IDE disconnect');
			var wm = core.module.layout.workspace.window_manager;

			$('#goorm_bottom').find('.connect-icon').hide();
			$('#goorm_bottom').find('.disconnect-icon').show();
			$('#goorm_bottom').find('.connect_state').hide();
			$('#goorm_bottom').find('.disconnect_state').show();

			var interval = generate_interval(reconnect_attempts);
			
			//setTimeout(function() {
			var temp = $.debounce(function() {
				reconnect_attempts++;

				self.socket.socket.reconnect();
			}, interval);
			temp();
		};

		var reconnect = function() {
			if (!core.force_disconnect) {
				var wm = core.module.layout.workspace.window_manager;

				// set User Data to Socket...
				//
				self.socket.emit('access', JSON.stringify({ // jeongmin: join channel code is moved to ajax from collaboration and named 'access' for oss
					'channel': 'join',
					'reconnect': true
				}));

				// set Project Data...
				//
				core.dialog.open_project.open(core.status.current_project_path, core.status.current_project_name, core.status.current_project_type);

				// set Terminal...
				//
				core.module.layout.terminal.refresh_terminal();
				core.module.terminal.terminal.refresh_terminal();
				
				// set state Image disconnect -> connect
				//
				$('#goorm_bottom').find('.connect-icon').show();
				$('#goorm_bottom').find('.disconnect-icon').hide();
				$('#goorm_bottom').find('.connect_state').show();
				$('#goorm_bottom').find('.disconnect_state').hide();
			}

			reconnect_attempts--;
		};

		// Socket Connect
		//
		if (!this.socket) {
			this.socket = io.connect();
		}

		if (this.socket.socket.connected) {
			$('#goorm_bottom').find('.connect-icon').show();
			$('#goorm_bottom').find('.disconnect-icon').hide();
			$('#goorm_bottom').find('.connect_state').show();
			$('#goorm_bottom').find('.disconnect_state').hide();
		}

		

		this.socket.on('disconnect', function() {
			disconnect();
		});

		this.socket.on('reconnect', function() {
			reconnect();
		});

		this.socket.on('reconnect_failed', function() {
			var msg = (core.module.localization) ? core.module.localization.msg.server_reconnect_fail : "A connection failure has occurred. Please reconnect to the server.";

			// Reconnect Fail --> Refresh !!
			//
			$('#g_alert_btn_ok').one('click', function() {
				document.location = '/';
			});

			alert.show(msg);
		});

		this.socket.on('/get_lxc_data_failed', function () {
			var msg = (core.module.localization) ? core.module.localization.msg.server_reconnect_fail : "A connection failure has occurred. Please reconnect to the server.";

			alert.show(msg);
		});

		window.addEventListener('offline', function(e) {
			disconnect();
		});

		window.addEventListener('online', function(e) {
			reconnect();
		});
	},

	get_socket: function() {
		return this.socket;
	}
};