var User = require('../models/User');

module.exports.getAll = function (callback) {
  User.find({}, function (err, list) {
    if (err)
      return console.error(err);

    callback(list);
  });
};

module.exports.findByChatId = function (chatId, callback) {
  User.find({ chatId: chatId }, function (err, user) {
    if (err)
      return console.error(err);

    callback(user);
  });
};