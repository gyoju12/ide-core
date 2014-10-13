var fs = require('fs'),
	walk = require('walk'),
	emitter,
	common = require(global.__path + "plugins/goorm.plugin.dart/modules/common.js");



module.exports = {
	copyFileSync : function(srcFile, destFile) {
	  BUF_LENGTH = 64*1024;
	  buff = new Buffer(BUF_LENGTH);
	  fdr = fs.openSync(srcFile, 'r');
	  fdw = fs.openSync(destFile, 'w');
	  bytesRead = 1;
	  pos = 0;
	  while (bytesRead > 0) {
	    bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
	    fs.writeSync(fdw,buff,0,bytesRead);
	    pos += bytesRead;
	  }
	  fs.closeSync(fdr);
	  fs.closeSync(fdw);
	},

	run : function(req, evt) {
		var self = this;
		var workspace = global.__workspace + "/" + req.data.project_path;
		var target_path = common.run_path + req.data.project_path;
		var run_path = target_path.split("temp_files").pop();
		console.log("runProject "+run_path);
		
		if(!fs.existsSync(__temp_dir)) {
			fs.mkdirSync(__temp_dir);
		}
		if(!fs.existsSync(__temp_dir + "/plugins")) {
			fs.mkdirSync(__temp_dir + "/plugins");
		}
		if(!fs.existsSync(__temp_dir + "/plugins/dart")) {
			fs.mkdirSync(__temp_dir + "/plugins/dart");
		}
		if(!fs.existsSync(target_path)) {
			fs.mkdirSync(target_path);
		}
		
		emittor = walk.walk(workspace);
		
		emittor.on('file', function (path, stat, next){
			var abs_path = (path + "/"+stat.name).replace(workspace,"");
			self.copyFileSync(path + "/" + stat.name, target_path + abs_path);
			next();
		});
		
		emittor.on("directory", function (path, stat, next) {
		  // dirStatsArray is an array of `stat` objects with the additional attributes
		  // * type
		  // * error
		  // * name
			var abs_path = (path+"/"+stat.name).replace(workspace,"");
			fs.exists(target_path+abs_path, function(exists) {
				if(!exists) {
					fs.mkdirSync(target_path+abs_path);
				}
				next();
			});
			
			next();
		});
		
		emittor.on("end", function () {
			evt.emit("do_run_complete", {
				code : 200,
				message : "success",
				run_path : run_path
			});
		});

	}
};