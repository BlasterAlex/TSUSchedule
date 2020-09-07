var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  fullName: { type: String, required: true },
  group: { type: String, required: true },
  login: { type: String, required: true },
  password: { type: String, required: true }
}, { _id: false, versionKey: false });

module.exports = mongoose.model('User', userSchema, 'User');