var UserRepository = require('../../repositories/UserRepository');

module.exports = function (bot, callback) {
  var text = '';
  UserRepository.getAll(function (list) {
    (async () => {
      for (var i = 0; i < list.length; ++i) {
        await bot.getChatMember(list[i]._id, list[i]._id)
          .then((chat) => {
            let fullName = chat.user.first_name;

            if (chat.user.last_name)
              fullName += ' ' + chat.user.last_name;

            UserRepository.updateName(list[i]._id, fullName);
            text += fullName + '\n';
          })
          .catch((e) => {
            if (e.response.body.error_code == 400)
              text += 'Пользователь с id ' + list[i]._id + ' не найден\n';
          });
      }
    })()
      .then(() => {
        callback(text);
      });
  });
};