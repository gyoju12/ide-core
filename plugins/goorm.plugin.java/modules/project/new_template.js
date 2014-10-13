/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/


var fs = require('fs'),
	// walk = require('walk'),
	emitter,
	common = require(global.__path + "plugins/goorm.plugin.java/modules/common.js");

module.exports = {
	make_template: function(req, evt) {
		if(req.type=="class"){
			var packageName=(req.package==""?"":req.package)
			var path= req.workspace+req.project_name+"/src/"+packageName.replace(/\./g,"/")
			var filename= req.name;
			var template;
			if(req.modifier=="public")
				template = common.path + "newtemplate/public_class.java";
			else if(req.modifier=="default")
				template = common.path + "newtemplate/default_class.java";
			else if(req.modifier=="final")
				template = common.path + "newtemplate/final_class.java";
			else if(req.modifier=="abstract")
				template = common.path + "newtemplate/abstract_class.java";

			fs.readFile(template, "utf-8" , function(err, data) {
				if (err) throw err;
				data = data.replace("{PACKAGENAME}", packageName);
				data = data.replace("{CLASSNAME}", filename);

				//remove package declaration in the file on default package --heeje
				if(packageName === "") {
					data = data.replace("package {PACKAGENAME};", "");
				}

				if(req.methods){
					if(req.methods[0]=='constructor')
					{
						data = data.replace("{METHODS}","");
						data = data.replace("{CLASSNAME}", filename);
						data = data.replace("{METHODS}","");

					}else{
						data = data.replace(data.substring(data.indexOf("{METHODS}"), data.lastIndexOf("{METHODS}")+"{METHODS}".length),"");

					}
				}else{
						data = data.replace(data.substring(data.indexOf("{METHODS}"), data.lastIndexOf("{METHODS}")+"{METHODS}".length),"");

				}
				fs.exists(path, function(exists) {
					if(!exists) {
						evt.emit("make_template_complete", {
							code : 203,
							message : "package_notexist"
						});
						return ;
							
					}else {
						fs.stat(path,function(err,stats){
							if(stats.isDirectory()){
								fs.exists(path+"/"+filename+".java", function(exists) {
									if(!exists){
										fs.writeFile(path+"/"+filename+".java", data, function(err) {
											if (err) {
												
												evt.emit("make_template_complete", {
													code : 202,
													message : "file_exist"
												});
												return ;
											
											}
											evt.emit("make_template_complete", {
												code : 200,
												message : "success"
											});
										});

									}else{

										evt.emit("make_template_complete", {
											code : 202,
											message : "file_exist"
										});
										return ;
										
									}


								});	
							}else{
								evt.emit("make_template_complete", {
										code : 204,
										message : "same_file_exist"
									});
							}
							
						});
						//already exist
					  	
					}
					
				});
				
			});		}else if(req.type=="interface"){
			var packageName=(req.package==""?"":req.package)
			var path= req.workspace+req.project_name+"/src/"+packageName.replace(/\./g,"/")
			var filename= req.name;
			var template;
			if(req.modifier=="public")
				template = common.path + "newtemplate/public_interface.java";
			else if(req.modifier=="default")
				template = common.path + "newtemplate/default_interface.java";
			
			fs.readFile(template, "utf-8" , function(err, data) {
				if (err) throw err;
				//console.log(data);
				data = data.replace("{PACKAGENAME}", packageName);
				data = data.replace("{CLASSNAME}", filename);
				fs.exists(path, function(exists) {
					if(!exists) {
						evt.emit("make_template_complete", {
							code : 203,
							message : "package_notexist"
						});
						return ;
							
					}else {
						fs.stat(path,function(err,stats){
							if(stats.isDirectory()){
								fs.exists(path+"/"+filename+".java", function(exists) {
									if(!exists){
										fs.writeFile(path+"/"+filename+".java", data, function(err) {
										//console.log(path+"/"+filename+".java")
											if (err) {
												
												evt.emit("make_template_complete", {
													code : 202,
													message : "file_exist"
												});
												return ;
											
											}
											evt.emit("make_template_complete", {
												code : 200,
												message : "success"
											});
										});

									}else{

										evt.emit("make_template_complete", {
											code : 202,
											message : "file_exist"
										});
										return ;
										
									}


								});	
							}else{
								evt.emit("make_template_complete", {
										code : 204,
										message : "same_file_exist"
									});
							}
							
						});
						//already exist
					  	
					}
					
				});
				
			});
			


		}else if(req.type=="package"){
			var packageName= req.name;
			var path= req.workspace+req.source_folder+packageName.replace(/\./g,"/")
			var path_sum1=req.workspace+req.source_folder;
			var path_sum2=req.workspace+req.source_folder;
			var packagename_split=packageName.split(".");
			var save=0;
			for(var i=0; i<packagename_split.length;i++){
				path_sum1+=("/"+packagename_split[i]);
				if(fs.existsSync(path_sum1)){
					path_sum2+=("/"+packagename_split[i]);
					if(i==packagename_split.length-1){
						
						evt.emit("make_template_complete", {
							code : 201,
							message : "package_exist"
						});
						return;
					}
					
				}else{
					save=i;
					break;
				}

			}
			for(var i=save; i<packagename_split.length;i++){
				path_sum2+=("/"+packagename_split[i]);	
				fs.mkdirSync(path_sum2);
				
			}
			evt.emit("make_template_complete", {
				code : 200,
				message : "success"
			});
		}
		
		
	}
};