const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config/config.json'));

module.exports = function (bot, chatId) {
  require('../../repositories/UserRepository').find(chatId, function (user) {
    if (!user.length)
      return bot.sendMessage(chatId, 'Кто вы, я вас не знаю... ' +
        fs.readFileSync('data/messages/registration.txt'), {
        parse_mode: 'markdown'
      });

    bot.sendMessage(chatId,
      '*' + user[0].fullName + '*' +
      (!config.rosdistant ? (
        (user[0].institute ? ('\n*Институт*: ' + user[0].institute) : '') +
        (user[0].course ? ('\n*Курс*: ' + user[0].course) : '') +
        (user[0].group ? ('\n*Группа*: ' + user[0].group) : '')) : ((user[0].login ? ('\n*Логин*: ' + user[0].login) : '') +
          (user[0].password ? ('\n*Пароль*: ' + '/showpassword') : ''))),
      { parse_mode: 'markdown' });
  });
};