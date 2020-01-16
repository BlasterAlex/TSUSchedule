module.exports = function (bot, msg) {

  var commands = {
    exit: false,
    onWeek: false
  };

  // Keyboard
  switch (msg.data) {
    case 'keyboard today':
      commands.fromNow = 0;
      return commands;
    case 'keyboard tomorrow':
      commands.fromNow = 1;
      return commands;
    case 'keyboard week':
      commands.onWeek = true;
      commands.fromNow = 0;
      return commands;
    case 'keyboard next week':
      commands.onWeek = true;
      commands.withoutDay = true;
      commands.fromNow = 7;
      return commands;
  }

  // Inline keyboard
  switch (msg.data) {
    case 'send to everyone':
      commands.exit = true;
      require('../../repositories/UserRepository').getAll(function (list) {
        console.log('\nСписок получателей:');
        list.forEach(function (user) {
          // bot.sendPhoto(msg.from.id, 'photo.jpg', {
          //   caption: require('fs').readFileSync('data/messages/mailing.txt'),
          //   parse_mode: 'markdown'
          // });
          bot.sendMessage(user.chatId, require('fs').readFileSync('data/messages/mailing.txt'), { parse_mode: 'markdown' });
          console.log(user.chatId);
        });
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
          chat_id: msg.from.id,
          message_id: msg.message.message_id
        });
      });
      bot.answerCallbackQuery(msg.id, { text: 'Сообщение отправлено' }, true);
      break;
    case 'cancel sending':
      commands.exit = true;
      bot.answerCallbackQuery(msg.id, { text: 'Хорошо, не буду' }, true);
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: msg.from.id,
        message_id: msg.message.message_id
      });
      break;
  }

  return commands;
};