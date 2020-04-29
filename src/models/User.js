var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  fullName: { type: String, required: true },
  institute: { type: String, required: true },
  course: { type: String, required: true },
  group: { type: String, required: true },

  // Росдистант
  login: String,
  password: String
});

module.exports = mongoose.model('User', userSchema, 'User');