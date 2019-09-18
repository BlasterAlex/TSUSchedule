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