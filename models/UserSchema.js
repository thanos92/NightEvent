var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
    username : {type: String, required : true, unique: true},
    email : {type: String, required : true, unique: true},
    location: { locationName: String, latLon: String},
    events: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}]
}, {
    versionKey: false // You should be aware of the outcome after set to false
});

var User = mongoose.model('User', UserSchema);
module.exports = User;