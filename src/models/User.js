var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  fullName: { type: String, required: true },
  group: { type: String, required: true },
  login: { type: String, required: true },
  password: { type: String, required: true },
  notifications: { type: Map, of: String },
  cookies: { type: Array }
}, { _id: false, versionKey: false });

module.exports = mongoose.model('User', userSchema, 'User');