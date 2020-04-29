const fs = require('fs');

module.exports = function (bot, chatId) {
  require('../../repositories/UserRepository').findByChatId(chatId, function (user) {
    if (!user.length)
      return bot.sendMessage(chatId, 'Кто вы, я вас не знаю... ' +
        fs.readFileSync('data/messages/registration.txt'), {
        parse_mode: 'markdown'
      });

    bot.sendMessage(chatId,
      '*' + user[0].fullName + '*' +
      '\n*Институт*: ' + user[0].institute +
      '\n*Курс*: ' + user[0].course +
      '\n*Группа*: ' + user[0].group +
      (user[0].login ? ('\n\nРосдистант:\n*Логин*: ' + user[0].login) : '') +
      (user[0].password ? ('\n*Пароль*: ' + '/showpassword') : ''),
      { parse_mode: 'markdown' });
  });
};