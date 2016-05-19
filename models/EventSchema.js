var mongoose = require('mongoose');

var EventSchema = new mongoose.Schema({
    name : {type: String, required : true},
    description : {type: String, required : true},
    startDate: {type:Date,required: true},
	endDate: {type: Date, required:true},
    participants: [String],
    participantsNumber: {type: Number, default: 0},
    maxParticipants: {type: Number, default: 999},
    location: { locationName: String, latLon: String},
    fee: {type: Number,default: 0},
    creator: {type: String, required: true}

}, {
    versionKey: false
});

var Event = mongoose.model('Event', EventSchema);
module.exports = Event;
