var express = require("express");
var mongoose = require('mongoose');
var bodyParser = require("body-parser");
var GeoDistance = require("node-geo-distance");
var UserCredentials = require("./models/UserCredentialsSchema");
var Event = require("./models/EventSchema");
var User = require("./models/UserSchema");
var Token = require("./models/TokenSchema");

var app = express();
var gcm = require('node-gcm');
var sender = new gcm.Sender('AIzaSyCQoSMq6F_2HigCwMKSFYVoZZtsXa8cP2c');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));




mongoose.connect('mongodb://localhost/nightEventDB', function (db, err) {
	if (!err) {
		console.log("connected to DB");
	}
	else {
		db.close();
	}
});


app.get("/login", function (req, res) {
	var body = req.query;
	UserCredentials.findOne({email: body.email}, function (err, userCredential) {
		if(!err && userCredential){
			userCredential.comparePassword(body.password, function(err, validCredential){
				if (err) {
					res.status(400).send()
				}
				else if (!err && validCredential) {
					User.findOne({email: body.email}).populate('events').exec(function (err, user) {
						if(!err){
							console.log(user);
							res.json(user);
						}
						else{
							res.status(404).send();
						}
					});
				}
				else {
					res.status(404).send();
				}
			});
		}
		else{
			res.status(404).send();
		}
	});
});

app.post("/register", function (req, res) {
	var body = req.body;
	var credentials = new UserCredentials({email: body.email, password: body.password});
	credentials.save(function (err) {
		if (!err) {
			var user = new User({username: body.username, email: body.email});
			user.save(function (err) {
				if(!err)
				{
					console.log(user);
					res.send();
				}
				else{
					console.log(err);
					res.status(409).send();
				}
			});
		}
		else {
			console.log(err);
			res.status(400).send();
		}
	});

});

app.post("/createEvent", function (req, res) {
	var body = req.body;
	console.log("create event");
	User.findOne({_id: body.id}, function (err, user) {
		if (!err && user != null) {
			var event = new Event({
				name: body.name, description: body.description, startDate: body.startDate,
				endDate:body.endDate,
				maxParticipants: body.maxParticipants,
				location: {locationName: body.locationName, latLon: body.latLon}, fee: body.fee, creator: user.username
			});
			event.save(function (err, newEvent) {
				if (!err) {
					User.update({username: user.username}, {$push: {"events": event.id}}, function (err, u) {});
						User.find({},function(er, results){
							
							if(!er && results.length != 0){
							var latlon = body.latLon.split(",");
							var eventCoords = {latitude: parseFloat(latlon[0]), longitude: parseFloat(latlon[1])};
							console.log("result:    " +results);
							results.forEach(function(o){
								console.log(" asdasd "+ (o._id != body.id));
								console.log(o._id);
								console.log(body.id);
								if(o._id != body.id){
								if (typeof o.location.latLon === 'undefined') {}
								else{
								var coordArray = o.location.latLon.split(",")
								var userCoord = {latitude: parseFloat(coordArray[0]), longitude: parseFloat(coordArray[1])};
								var distance = GeoDistance.haversineSync(eventCoords, userCoord) / 1000;

								if(distance <= 100){
								Token.findOne({userId: o._id}, function(errrr, tok){
												if(!errrr){
													var tokens = [];
													tokens.push(tok.token);			
													var message = createNotification("Event creation",  user.username + " create event near you", JSON.stringify(event));
													sender.send(message, { registrationTokens: tokens }, function (err, response) {
														if(err) console.error(err);
														else console.log(response);
													});
												}
											});	
								}
								}
							}});
							
							}
							
						})
						res.json(newEvent);
					
				}
				else {
					console.log(err);
					res.status(400).send();
				}
			});
		}
		else{
			console.log(err);
			res.status(400).send();
		}
	});
});


app.get("/getEvents", function (req, res) {
	var userLatitude = req.query.latitude;
	var userLongitude = req.query.longitude;
	var requestSender = req.query.id;
	var threshold = req.query.maxDistance;
	var userCoords = {latitude: parseFloat(userLatitude), longitude: parseFloat(userLongitude)};
	
	

	if(!threshold){
		threshold = 100;
	}
	
	User.findOne({_id: requestSender}, function(err, user){
		if(!err && user){
		user.location = {locationName: "", latLon: userLatitude + "," + userLongitude};
		user.save(function(err){
			if(err) console.log(err);
		});
		}
		else {
			console.log(err);
		}
	});

	Event.find({}, function (err, events) {
		if (!err) {
			var nearEvents = [];
			User.findOne({_id: req.query.id}).populate('events').exec(function (err, user) {
				if(!err){
					for (var i = 0; i < events.length; i++) {
						var event = events[i];
						var coords = event.location.latLon.split(",");
						var eventCoords = {latitude: parseFloat(coords[0]), longitude: parseFloat(coords[1])};
						
						
						var distance = GeoDistance.haversineSync(eventCoords, userCoords) / 1000;
						console.log(events[i].startDate >= Date.now());
						if (distance <= 100 && events[i].endDate >= Date.now() && events[i].maxParticipants > events[i].participantsNumber) {
							
							var check = true;
							for(var j = 0; j < user.events.length; j++){
								if(user.events[j].id === events[i].id){
									check = false;
									break;
								}
							}
							
							if(check == true){
								
								nearEvents.push(events[i]);	
							}
							
						}
					}
					
					res.json(nearEvents);
				}
				else{
					res.status(400).send();
				}
			});
		}
		else {
			res.status(400).send();
		}
	});
});


app.post("/joinEvent", function (req, res) {
	var body = req.body;
	var id = body.userId;
	var eventId = body.eventId;
	console.log("join Event");
	User.findOne({_id:id }, function(errr, user){
		console.log("user:   " + user)
		if(!errr){
			Event.findById(eventId, function (err, ev) {
				console.log(ev);
				if (ev.participants.length < ev.maxParticipants) {
					Event.update({_id: ev.id}, {$set : {"participantsNumber":(ev.participantsNumber + 1)}, $push: {"participants": user.username}
				}, function (err, st) {
					if (!err || ev != null) {
						User.update({_id: id}, {$push: {"events": ev._id}}, function (err, u) {
							console.log(u);
							if (!err) {
								Event.findOne({_id: ev.id}, function(err, evento){
									User.findOne({username: ev.creator}, function(err, creator){
										if(!err){
											Token.findOne({userId: creator.id}, function(errrr, tok){
												
												if(!errrr){
													var tokens = [];
													tokens.push(tok.token);			
													var message = createNotification("Event joyned", user.username + " has joyned your event", JSON.stringify(evento));
													sender.send(message, { registrationTokens: tokens }, function (err, response) {
														if(err) console.error(err);
														else console.log(response);
													});
												}
											});	
										}
										else{console.log(errrr)}
									});	
									res.json(evento);	
								});
								
							}
							else{
								console.log(err);
								res.status(400).send();
							}
						});
					}
					else {
						res.status(404).send();
					}
				});
					
					
				}
				else {
					res.status(400).send();
				}
			});
		}
		else{
			res.status(400).send();
		}
	});
});

app.get("/checkEmail", function (req, res) {
	var email = req.query.email;
	console.log(email);
	User.findOne({email: email}, function (err, email) {
		if (!err && email != null) {
			console.log("asdasd"+email);
			res.status(409).send();
		}
		else if (!err) {
			res.send();
		}
	});
});

app.get("/checkUsername", function (req, res) {
	var username = req.query.username;
	console.log("user" + username);
	User.findOne({username: username}, function (err, user) {
		if (!err && user != null) {
			console.log(user);
			res.status(409).send();
		}
		else if (!err) {
			res.send();
		}
	});
});

app.post("/leaveEvent", function (req, res){
	var body = req.body;
	var userId = body.userId;
	var eventId = body.eventId;
	console.log(body);
	
	Event.findOne({_id : eventId},function(err, ev){

		User.findOne({_id: userId}, function(err, us){
			if(us.username === ev.creator){
				var participants = ev.participants;
				console.log("qui");
				console.log(participants);
				for(var i = 0; i < ev.participants.length; i++){
					console.log(participants);
					console.log(participants[i]);
					User.update({username: participants[i]},{$pull: {events: eventId}}, function(err, res){
						});
						
							console.log("qua")
							console.log(participants[i]);
							User.findOne({username:ev.participants[i]}, function(err, usrr){
								if(!err && usrr){
								var tokens = [];
							console.log(usrr);
							Token.findOne({userId: usrr.id}, function(err, tk){
								console.log(tk);
								tokens.push(tk.token);
								console.log(ev);
								var message = createNotification("Event removed",  ev.name + " is canceled", null);
													sender.send(message, { registrationTokens: tokens }, function (err, response) {
														if(err) console.error(err);
														else console.log(response);
													});
								
							});
								}
							
							});
					
				}
				Event.remove({_id : eventId}, function(err, el){
					if(!err){
						User.update({_id: userId}, {$pull: {"events": eventId}}, function(err, result){
							console.log(result);
							res.send();
						});								
					}
					else{
						console.log(err);
					}
				});
			}
			else{
				
				var actualnumber = ev.participantsNumber;
				console.log(actualnumber);
				ev.participantsNumber = actualnumber - 1;
				ev.participants.pull(us.username);
				ev.save(function(err,evento){
					if (!err) {
						User.update({_id: userId}, {$pull: {"events": eventId}}, function(err, result){
							res.send();
						});
					}
					else {
						console.log(err);
						res.status(400).send();
					}
				});
			}
		});
	});
});

app.post("/registerNotification", function(req, res){
	var body = req.body;
	var gcmToken = body.token;
	var id = body.userId;
	console.log(gcmToken);
	
	Token.findOneAndUpdate({userId: id},{userId: id, token:gcmToken },{upsert: true}, function(err, token){
		if(!err){
			res.send();
		}
		else{
			res.status(400).send();
		}
	});
});


function createNotification(title, description, jsonContent){
	var message = new gcm.Message({
		collapseKey: 'demo',
		priority: 'high',
		contentAvailable: true,
		delayWhileIdle: true,
		timeToLive: 3,
		dryRun: false,
		data: {
			content: jsonContent,
			title : title,
			body: description
		},
		notification: {
			title: title,
			icon: "ic_launcher",
			body: description
		}
		
	});
	return message;
}

var port = process.env.PORT || 3000;
app.listen(port, function () {
	console.log(port);
});