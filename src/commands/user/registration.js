const fs = require('fs'); // for working with files

const auth = require('../../helpers/auth');

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
    case '/rosdistant':
    case 'росдистант':
      if (data.length < 2)
        return bot.sendMessage(chatId, fs.readFileSync('data/messages/rosdistant.txt'), { parse_mode: 'markdown' });
      user.login = data[0];
      user.password = data[1];
      break;
    case '/login':
    case 'логин':
      if (data.length < 1) return bot.sendMessage(chatId, 'Необходимо передать параметр', { parse_mode: 'markdown' });
      user.login = data[0];
      break;
    case '/password':
    case 'пароль':
      if (data.length < 1) return bot.sendMessage(chatId, 'Необходимо передать параметр', { parse_mode: 'markdown' });
      user.password = data[0];
      break;
    case '/showpassword':
      return auth.showPassword(bot, chatId);
    default:
      return bot.sendMessage(chatId, 'Я не знаю, что такое _' + command + '_', { parse_mode: 'markdown' });
  }

  // Регистрация пользователя
  auth.registrate(bot, chatId, user);
};