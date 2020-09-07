var Institute = require('../models/Institute');

module.exports.getList = function (callback) {
  Institute.find({}).sort('name').exec(function (err, list) {
    if (err)
      return console.error(err);
    callback(list);
  });
};

module.exports.findByName = function (name, callback) {
  Institute.find({ name: name }, function (err, inst) {
    if (err)
      return console.error(err);

    callback(inst);
  });
};

module.exports.updateGroups = function (name, groups) {
  Institute.findOneAndUpdate({ name: name, groups: groups }, {}, { upsert: true }, function (err, res) {
    if (err) return console.error(err);
  });
};

module.exports.findByGroup = function (group, callback) {
  Institute.find({}).exec(function (err, list) {
    if (err)
      return console.error(err);
    console.log(list);
  });
}