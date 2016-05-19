var mongoose = require('mongoose');

var GcmTokenSchema = new mongoose.Schema({
    token : {type: String, required : true},
    userId: {type: String, required: true}

}, {
    versionKey: false
});

var Token = mongoose.model('GcmToken', GcmTokenSchema);
module.exports = Token;
