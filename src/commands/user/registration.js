const fs = require('fs'); // for working with files
var User = require('../../models/User');

module.exports = function (bot, msg) {

  let words = msg.text.split(' ');
  const command = words[0];
  const data = words.slice(1);

  const chatId = msg.chat.id;
  const from = msg.from;

  // Формирование объекта пользователя
  let user = {
    chatId: chatId,
    fullName: from.first_name,
  };
  if (from.last_name)
    user.fullName += ' ' + from.last_name;

  // Получение данных для регистрации
  switch (command.toLowerCase()) {
    case '/group':
    case 'группа':
      if (data.length < 1) return bot.sendMessage(chatId, 'Необходимо передать параметр', { parse_mode: 'markdown' });
      user.group = data[0];
      break;
    case '/institute':
    case 'инст':
    case 'институт':
      if (data.length < 1) return bot.sendMessage(chatId, 'Необходимо передать параметр', { parse_mode: 'markdown' });
      user.institute = data[0];
      break;
    case '/course':
    case 'курс':
      if (data.length < 1) return bot.sendMessage(chatId, 'Необходимо передать параметр', { parse_mode: 'markdown' });
      user.course = parseInt(data[0]);
      break;
    case '/reg':
    case 'рег':
    case 'регистрация':
      if (data.length < 3)
        return bot.sendMessage(chatId, fs.readFileSync('data/messages/registration.txt'), { parse_mode: 'markdown' });
      user.institute = data[0];
      user.course = parseInt(data[1]);
      user.group = data[2];
      break;
    default:
      return bot.sendMessage(chatId, 'Я не знаю, что такое _' + command + '_', { parse_mode: 'markdown' });
  }

  // Проверка института
  require('../../repositories/InstituteRepository').findByName(user.institute, function (inst) {

    if (user.institute && inst.length === 0)
      return bot.sendMessage(chatId, 'Не могу найти институт *"' + user.institute + '"*.\n' +
        fs.readFileSync('data/messages/instituteList.txt'), {
        parse_mode: 'markdown'
      });

    // Проверка номера курса
    if (user.course && !(Number.isInteger(user.course) && user.course > 0))
      return bot.sendMessage(chatId, 'Неправильно введен номер курса, перепроверьте вводимые данные',
        { parse_mode: 'markdown' });

    // Добавление нового или изменение старого пользователя
    User.findOneAndUpdate({ chatId: chatId }, user, { upsert: true }, function (err, res) {
      if (err) return console.error(err);

      if (res)
        bot.sendMessage(chatId, 'Данные успешно обновлены');
      else
        bot.sendMessage(chatId, 'Данные успешно добавлены');

      require('./whoami')(bot, chatId);
    });
  });
};