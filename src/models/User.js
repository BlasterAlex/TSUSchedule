var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  fullName: { type: String, required: true },

  institute: { type: String },
  course: { type: Number },
  group: { type: String },

  // Росдистант
  login: String,
  password: String
}, { _id: false, versionKey: false });

module.exports = mongoose.model('User', userSchema, 'User');