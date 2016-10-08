var pg = require("pg");
var port = 5433;
var host = 'http://127.0.0.1';
var complete_url = ""+host+":"+port;
var conString = "postgres://lennartblom:@localhost/lennartblom";


/* File Upload dependencies */

var express=require("express");
var multer=require('multer');
var app=express();
var done=false;
var filename;
var fs=require('fs');



/*
app.use(multer({ 
	dest: '../server/uploads/5',
	rename: function (fieldname, filename) {
		return "gpxfile_"+Date.now();
	},

	onFileUploadStart: function (file) {
		console.log(file.originalname + ' is starting ...')
	},
	onFileUploadComplete: function (file) {
		console.log(file.fieldname + ' uploaded to  ' + file.path)
		done=true;
	}

}));*/

app.use(express.static(__dirname + '/static'));

/*Handling routes.*/

app.get('/', function (req, res) {
	res.sendfile("index.html");
});

app.get('/login', function (req, res) {
	res.sendfile("login.html");
});

app.get('/mitglieder', function (req, res) {
	res.sendfile("members.html");
});

app.get('/mitglieder/profil/:userid(\\d+)', function (req, res) {
	res.sendfile("profile.html");
});

app.get('/mitglieder/aktivitaet/:tourid(\\d+)', function (req, res) {
	res.sendfile("activity.html");
});

app.get('/registrieren', function (req, res) {
	res.sendfile("register.html");
});

app.get('/upload', function (req, res) {
	res.sendfile("upload.html");
});

app.get('/userGPXUpload', function (req, res) {
	res.sendfile("upload_auth.html");
});


/* Handling Server Post-Requests */

app.post('/mitglieder/profil/?:userid(\\d+)/',function(req,res){
	console.log("Show Profile");
	var userid = req.params.userid;
	getUserData(req, res, userid);
});

app.post('/mitglieder/aktivitaet/?:tourid(\\d+)',function(req,res){
	console.log("Show Activity");
	var tourid = req.params.tourid;
	getActivityData(req, res, tourid);
});


app.post('/mitglieder/aktivitaet/?:tourid(\\d+)/getTrackData',function(req,res){
	console.log("Get ActivityTrack");
	var tourid = req.params.tourid;
	getTrackData(req, res, tourid);
});

app.post('/members/getActivities',function(req,res){
	req.on('data', function(chunk) {
		var data = JSON.parse(chunk.toString());
		console.log("Get activitylist from DB");
		var userId = data[1]['userId'];
		getActivityList(req, res, userId);
	});
});


app.post('/test',function(req,res){
	var jsonData = [];

	
	jsonData.push({
		result: true
	});

	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(jsonData) + "\n");
	res.end();
	return console.log("Test complete.");
});


app.post('/members/showMembers',function(req,res){
	console.log("Get memberlist from DB.");
	getMemberList(req, res);
});

app.post('/registrieren/newUser',function(req,res){

    console.log("User hinzufügen.");
	req.on('data', function(chunk) {
		var data = JSON.parse(chunk.toString());


        var username = data[0]['username'];
		var password = data[0]['password'];
		var email = data[0]['email'];

		addUserToDB(req,res,username,password,email);
	});

});

app.post('/verifyLogin',function(req,res){

	console.log("Check if username exists.");
	req.on('data', function(chunk) {
		var data = JSON.parse(chunk.toString());

        var username = data[1]['username'];
		var password = data[1]['password'];

		checkUsername(req, res, username);
	});

});

app.post('/mitglieder/aktivitaet/:activityid/delete',function(req,res){

	var activityid = req.params.activityid;
	console.log("Delete Activity with ID="+activityid);
	deleteActivity(req,res,activityid);

});

app.post('/mitglieder/:userid/delete',function(req,res){

	var userid = req.params.userid;
	console.log("Delete Activity with ID="+userid);
	deleteUser(req,res,userid);

});

app.post('/checkPassword',function(req,res){

	console.log("Test PW Combination.");
	req.on('data', function(chunk) {
		var data = JSON.parse(chunk.toString());

        var username = data[1]['username'];
		var password = data[1]['password'];

		testPW(req, res, username, password);
	});

});

app.post('/mitglieder/aktivitaet/getEncounterActivity/:tourid', function(req, res){
	var activityid = req.params.tourid;
	

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");

	var query = client.query("select ST_AsGeoJSON(geo) from gps_data where activity_id=$1", [activityid], function(err, result){

		console.log(JSON.stringify(result.rows, null, "    "));
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(result.rows) + "\n");
    	res.end();
   		client.end();
		return console.log("GPX sent.");
	});
});

app.post('/mitglieder/aktivitaet/getEncounters/:tourid/:userid', function(req, res){
	var activityid = req.params.tourid;
	var userid = req.params.userid;
	

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");
	// Select Encounter Activity ID, Distance, Time
	var query = client.query("select * from encountersWithActivity($1,$2);", [activityid,userid], function(err, result){

		console.log(JSON.stringify(result.rows, null, "    "));
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(result.rows) + "\n");
    	res.end();
   		client.end();
		return console.log("Infos der Begegnung wurde geschickt.");
	});
});


app.post('/upload/transferFile/',function(req,res){
	
  	if(done==true){
		console.log(req.files);
		res.writeHead(301,{
			Location: complete_url+'/userGPXUpload?complete=true'
		});
		res.end();
	}
});

app.post('/upload/transferFile/:id', multer({
	dest: '../var-9.4/gpxdir/',
	rename: function (fieldname, filename) {
		filename = "gpxfile_"+Date.now();
		console.log("FileName =" + filename);
		return filename;
	},
	changeDest: function(dest, req, res) {
	    var newDestination = dest + req.params.id;
	    var stat = null;
	    try {
	        stat = fs.statSync(newDestination);
	    } catch (err) {
	        fs.mkdirSync(newDestination);
	    }
	    if (stat && !stat.isDirectory()) {

	        throw new Error('Directory cannot be created because an inode of a different type exists at "' + dest + '"');
	    }

	    console.log("Am Ende");
	    return newDestination
	},
	onFileUploadStart: function (file) {
		console.log(file.originalname + ' is starting ...');
	},
	onFileUploadComplete: function (file) {
		console.log(file.fieldname + ' uploaded to  ' + file.path);
		done=true;
		filename=file.name;
	}
}), function(req, res) {
    if(done==true){
    	var userid = req.params.id;
    	var currentFilename = filename;
		console.log(req.files);

    	importFileToDB(req, res, currentFilename, userid);

		
	}
});

/* Server Post-Request End */


app.listen(port,function(){
    console.log("Working on port " + port);
});

var deleteUser = function(req, res, userid){
	

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");

	var query = client.query("select deleteUser($1);", [userid], function(err, result){
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.end();
   		client.end();
		return console.log("User deleted.");
	});
}

var deleteActivity = function(req, res, activityid){
	

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");

	var query = client.query("select deleteActivity($1);", [activityid], function(err, result){
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.end();
   		client.end();
		return console.log("Activity deleted.");
	});
}

var getTrackData = function(req, res, tourid){
	

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");

	var query = client.query("select ST_AsGeoJSON(geo) from gps_data where activity_id=$1", [tourid], function(err, result){

		console.log(JSON.stringify(result.rows, null, "    "));
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(result.rows) + "\n");
    	res.end();
   		client.end();
		return console.log("GPX sent.");
	});
}

var importFileToDB = function(req, res, pfilename, userid){
	

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");
	var dest = userid + "/" + pfilename;

	console.log("SELECT createNewActivityWithData("+dest+","+userid+");#");
	var query = client.query("SELECT createNewActivityWithData($1,$2)", [dest,userid], function(err, result){


		res.writeHead(301,{
			Location: complete_url+'/userGPXUpload?complete=true'
		});
		res.end();
		return console.log("GPX Import ist fertig.");
	});
}

var checkUsername = function(req, res, username){
	

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");

	var query = client.query("SELECT usernameExists($1)", [username], function(err, result){

   		var jsonData = [];

		console.log(result.rows[0].usernameexists);

		if(result.rows[0].usernameexists){

			jsonData.push({
				result: true
			});

			

		}else{
			jsonData.push({
				result: false
			});

			


		}

		console.log(JSON.stringify(jsonData, null, "    "));
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.write(JSON.stringify(jsonData) + "\n");
		res.end();
		return console.log("Query ist fertig.");
	});
}

var testPW = function(req, res, username, password){
	
	var jsonData = [];

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");

	var query = client.query("SELECT password, id FROM users where username=$1", [username], function(err, result){
		console.log(password+":"+result.rows[0].password);

    	 if(result.rows[0].password == password){
    	 	console.log("Passwort stimmt überein.");
    	 	jsonData.push({
				result: true,
				id: result.rows[0].id
			});
    	 }else{
    	 	console.log("Passwort stimmt nicht überein.");
    	 	jsonData.push({
				result: false
			});
    	 }

   		console.log(JSON.stringify(jsonData, null, "    "));
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.write(JSON.stringify(jsonData) + "\n");
		res.end();
	});
	
	query.on("end", function (result) {
		
   	});


}

var showTestTable = function(req, res){
	

	var client = new pg.Client(conString);
	client.connect();

	console.log("Client connected");

	var query = client.query('SELECT * FROM test');
	
	query.on("row", function (row, result) {
    	 result.addRow(row);
   	});
   	query.on("end", function (result){
   		console.log(JSON.stringify(result.rows, null, "    "));
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(result.rows) + "\n");
    	res.end();
   		client.end();
   	});

}

var addUserToDB = function(req, res, username, passwort, email){
	

	var client = new pg.Client(conString);
	client.connect();
	console.log('client connected'); 

	client.query("SELECT createNewUser($1, $2, $3)",[username, passwort, email], function(err, result) {
	  console.log(result.rows);
	  res.writeHead(200, "OK", {'Content-Type': 'text/html'});
	  res.write(JSON.stringify(result.rows) + "\n");
	  res.end();
	  return console.log("inserted to DB.");
	});



   	
	/*

	});*/
}

var getMemberList = function(req, res){

	

	var client = new pg.Client(conString);
	client.connect();
	var counter = 0;
	console.log("Client connected");

	var query = client.query('select * from users');
	
	query.on("row", function (row, result) {
    	 
    	 result.addRow(row);
    	 
   	});
   	query.on("end", function (result){
   		console.log(JSON.stringify(result.rows, null, "    "));
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(result.rows) + "\n");
    	res.end();
   		client.end();
   	});
}

var getActivityList = function(req, res, userid){
	

	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT * FROM activities where user_id=$1",[userid], function(err, result) {

    	return (JSON.stringify(result.rows) + "\n");
	});
	
	query.on("row", function (row, result) {

   	});
   	query.on("end", function (result){
   		//console.log(JSON.stringify(result.rows, null, " "));
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(result.rows) + "\n");
    	res.end();
   		client.end();
   	});
}


var getUserData = function(req, res, userid){

	

	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT * FROM users where id=$1",[userid], function(err, result) {
    	return (JSON.stringify(result.rows) + "\n");
	});
	
   	query.on("end", function (result){
   		console.log(JSON.stringify(result.rows, null, " "));
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(result.rows) + "\n");
    	res.end();
   		client.end();
   	});
}


var getActivityData = function(req, res, activityid){
	

	var client = new pg.Client(conString);
	client.connect();

	var query = client.query("SELECT activities.id, users.username, activities.user_id, activities.start_time, activities.distance, activities.duration FROM activities, users WHERE activities.id=$1 AND users.id = activities.user_id",[activityid], function(err, result) {
    	return (JSON.stringify(result.rows) + "\n");
	});
	
   	query.on("end", function (result){
   		console.log(JSON.stringify(result.rows, null, " "));
    	res.writeHead(200, {'Content-Type': 'text/plain'});
    	res.write(JSON.stringify(result.rows) + "\n");
    	res.end();
   		client.end();
   	});
}
