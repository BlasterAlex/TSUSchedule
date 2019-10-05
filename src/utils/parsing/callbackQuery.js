module.exports = function (bot, msg) {
  switch (msg.data) {
    case 'send to everyone':
      require('../../repositories/UserRepository').getAll(function (list) {
        console.log('\nСписок получателей:');
        list.forEach(function (user) {
          bot.sendMessage(user.chatId, fs.readFileSync('data/messages/mailing.txt'), { parse_mode: 'markdown' });
          console.log(user.chatId);
        });
      });
      bot.answerCallbackQuery(msg.id, { text: 'Сообщение отправлено' }, true);
      break;
    case 'cancel sending':
      bot.answerCallbackQuery(msg.id, { text: 'Хорошо, не буду' }, true);
      break;
  }
};