var User = require('../models/User');

module.exports.getAll = function (callback) {
  User.find({}, function (err, list) {
    if (err)
      return console.error(err);

    callback(list);
  });
};

module.exports.find = function (chatId, callback) {
  User.find({ _id: chatId }, function (err, user) {
    if (err)
      return console.error(err);

    callback(user);
  });
};

module.exports.findByGroup = function (group, callback) {
  User.find({ group: group }, function (err, list) {
    if (err)
      return console.error(err);

    callback(list);
  });
};

module.exports.updateName = function (chatId, fullName) {
  User.findOneAndUpdate({ _id: chatId }, { fullName: fullName }, { upsert: true }, function (err) {
    if (err) console.error(err);
  });
};

module.exports.setNotify = function (chatId, notifications) {
  User.findOneAndUpdate({ _id: chatId }, { notifications: notifications }, { upsert: true }, function (err) {
    if (err) console.error(err);
  });
};