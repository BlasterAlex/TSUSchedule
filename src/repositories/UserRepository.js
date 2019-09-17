var User = require('../models/User');

module.exports.findByChatId = function (chatId, callback) {
  User.find({ chatId: chatId }, function (err, user) {
    if (err)
      return console.error(err);

    callback(user);
  });
};