const fs = require('fs'); // for working with files
var User = require('../models/User');

module.exports = function (bot, chatId, data) {

  // Получение данных для регистрации
  if (data.length < 3)
    return bot.sendMessage(chatId, fs.readFileSync('data/messages/registration.txt'), {
      parse_mode: 'markdown'
    });

  // Формирование объекта пользователя
  let user = {
    chatId: chatId,
    institute: data[0],
    course: data[1],
    group: data[2]
  };

  require('../repositories/InstituteRepository').findByName(user.institute, function (inst) {

    if (inst.length === 0)
      return bot.sendMessage(chatId, 'Не могу найти институт *"' + user.institute + '"*.\n' +
        fs.readFileSync('data/messages/instituteList.txt'), {
        parse_mode: 'markdown'
      });

    // Добавление нового или изменение старого пользователя
    User.findOneAndUpdate({ chatId: chatId }, user, { upsert: true }, function (err, res) {
      if (err) return console.error(err);
      if (res) return bot.sendMessage(chatId, 'Данные успешно обновлены');
      bot.sendMessage(chatId, 'Данные успешно добавлены');
    });

    bot.sendMessage(chatId, '*Институт*: ' + data[0] +
      '\n*Курс*: ' + data[1] +
      '\n*Группа*: ' + data[2], {
      parse_mode: 'markdown'
    });
  });
}