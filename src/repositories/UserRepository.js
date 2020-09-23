var User = require('../models/User');

module.exports.getAll = callback => {
  User.find({}, (err, list) => {
    if (err)
      return console.error(err);

    callback(list);
  });
};

module.exports.find = (chatId, callback) => {
  User.find({ _id: chatId }, (err, user) => {
    if (err)
      return console.error(err);

    callback(user);
  });
};

module.exports.findByGroup = (group, callback) => {
  User.find({ group: group }, (err, list) => {
    if (err)
      return console.error(err);

    callback(list);
  });
};

module.exports.updateName = (chatId, fullName) => {
  User.findOneAndUpdate({ _id: chatId }, { fullName: fullName }, { upsert: true }, err => {
    if (err) console.error(err);
  });
};

module.exports.setNotify = (chatId, notifications) => {
  User.findOneAndUpdate({ _id: chatId }, { notifications: notifications }, { upsert: true }, err => {
    if (err) console.error(err);
  });
};

module.exports.setCookies = (chatId, cookies) => {
  User.findOneAndUpdate({ _id: chatId }, { cookies: cookies }, { upsert: true }, err => {
    if (err) console.error(err);
  });
};