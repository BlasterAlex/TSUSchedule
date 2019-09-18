const fs = require('fs');

module.exports = function (bot, chatId) {
  require('../repositories/UserRepository').findByChatId(chatId, function (user) {
    if (!user.length)
      return bot.sendMessage(chatId, "Кто вы, я вас не знаю... " +
        fs.readFileSync('data/messages/registration.txt'),
        { parse_mode: 'markdown' });

    bot.sendMessage(chatId, 'Немного о вас:\n' +
      '*Институт*: ' + user[0].institute +
      '\n*Курс*: ' + user[0].course +
      '\n*Группа*: ' + user[0].group, {
      parse_mode: 'markdown'
    });
  });
};