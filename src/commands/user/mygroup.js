const fs = require('fs');

module.exports = function (bot, chatId) {

  // Проверка пользователя
  require('../../repositories/UserRepository').find(chatId, function (user) {
    if (!user.length)
      return bot.sendMessage(chatId, 'Кто вы, я вас не знаю... ' +
        fs.readFileSync('data/messages/registration.txt'), {
        parse_mode: 'markdown'
      });

    // Поиск одногруппников
    require('../../repositories/UserRepository').findByGroup(user[0].group, function (list) {
      if (list.length === 1)
        return bot.sendMessage(chatId, 'Я ЗДЕСЬ ОДИН');

      let mygroup = [];
      list.forEach(function (user) {
        mygroup.push(user.fullName);
      });

      let text = '*' + user[0].group + '*:\n' + mygroup.sort().join('\n');
      bot.sendMessage(chatId, text.replace(/\n/g, '\n\- '), { parse_mode: 'markdown' });
    });
  });
};