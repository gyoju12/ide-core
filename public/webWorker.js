self.limit=60*60*1000;
self.timer=parseInt(self.limit, 10);



self.addEventListener('message', function(e) {
	var data=e.data;
	switch(data.cmd){
		case 'timer_start':
			self.timer_loop=setInterval(function(){
				self.timer-=1000;
				if(self.timer<=5000 && self.timer>=0){
					self.postMessage({
						cmd:'count_down',
						msg:parseInt(self.timer,10) 
					});
				}
			}, 1000);

			break;
		case 'timer_refresh':
			self.timer=self.limit;
			self.postMessage(e.data);
			break;
		default:
  			self.postMessage(e.data);
  			break;
	}
}, false);