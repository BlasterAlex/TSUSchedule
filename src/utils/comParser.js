const fs = require('fs'); // for working with files
const moment = require('moment-timezone'); // for working with dates

var config = JSON.parse(fs.readFileSync('config/config.json'));

module.exports = function (bot, chatId, messages) {

  var today = moment().tz(config.timeZone, true);
  var commands = {
    registration: false,
    exit: false,
    onWeek: false
  };

  messages.forEach(function (com, index) {
    switch (com.toLowerCase()) {
      case '/yesterday':
      case 'вчера':
        commands.day = today.day() - 1;
        break;
      case '/today':
      case 'сегодня':
        commands.day = today.day();
        break;
      case '/tomorrow':
      case 'завтра':
        commands.day = today.day() + 1;
        break;
      case '/week':
      case 'неделя':
        commands.onWeek = true;
        break;
      case '/reg':
      case 'рег':
      case 'регистрация':
        commands.registration = index;
        break;
      case '/help':
      case 'помощь':
        commands.exit = true;
        bot.sendMessage(chatId, fs.readFileSync('data/messages/help.txt'), {
          parse_mode: 'markdown'
        });
        break;
      default:
        if (commands.registration === false) {
          commands.exit = true;
          bot.sendMessage(chatId, 'Я не знаю, что такое _' + com + '_', { parse_mode: 'markdown' });
        }
        break;
    }
  });

  return commands;
}