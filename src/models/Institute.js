var mongoose = require('mongoose');

var instituteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // realName: { type: String, required: true },
  // template: { type: String, required: true }
  groups: { type: Map }
}, { _id: false, versionKey: false });

module.exports = mongoose.model('Institute', instituteSchema, 'Institute');