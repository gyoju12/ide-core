// var fs = require('fs'),
	// walk = require('walk'),
	emitter,
var exec = require('child_process').exec,
	common = require(global.__path + "plugins/goorm.plugin.web/modules/common.js");

module.exports = {
	do_new : function(req, evt) {
		// var workspace = global.__workspace + "/" + req.data.project_author + "_" + req.data.project_name;
		var workspace = global.__workspace + "/" + req.data.project_dir;
		var template = common.path + "template";

		
		
// 		emittor = walk.walk(template);
		
// 		emittor.on('file', function (path, stat, next){
// 			var abs_path = (path+"/"+stat.name).replace(template,"");
// 			fs.readFile(path + "/" + stat.name, "utf-8" , function(err, data) {
// 				if (err) throw err;
// //				console.log(data);
// 				data = data.replace("{PROJECTNAME}", req.data.project_name);
// 				fs.writeFile(workspace + abs_path, data, function(err) {
// 					if (err) throw err;

// 					if( __service_mode ) {
// 						if(uid && gid) {
// 							fs.chownSync(workspace+abs_path, uid, gid);
// 						}
// 					}
// 				});
// 			});
// 			next();
// 		});
		
// 		emittor.on("directory", function (path, stat, next) {
// 		  // dirStatsArray is an array of `stat` objects with the additional attributes
// 		  // * type
// 		  // * error
// 		  // * name
// 			var abs_path = (path+"/"+stat.name).replace(template,"");
// 			fs.exists(workspace+abs_path, function(exists) {
// 				if(!exists) {
// 					fs.mkdirSync(workspace+abs_path);
// 				}

// 				if( __service_mode ) {
// 					if(uid && gid) {
// 						fs.chownSync(workspace+abs_path, uid, gid);
// 					}
// 				}
				
// 				next();
// 			});
			
// 			next();
// 		});
		
// 		emittor.on("end", function () {
// 			evt.emit("do_new_complete", {
// 				code : 200,
// 				message : "success"
// 			});
// 		});

		exec('cp -r '+template+'/* '+workspace, function(__err){
			evt.emit("do_new_complete", {
				code : 200,
				message : "success"
			});

			
		});		
	}
};