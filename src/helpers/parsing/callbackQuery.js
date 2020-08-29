module.exports = function (bot, msg) {

  // Inline keyboard
  switch (msg.data) {
    case 'send to everyone':
      require('../../repositories/UserRepository').getAll(function (list) {
        console.log('\nСписок получателей:');
        list.forEach(function (user) {
          // bot.sendPhoto(msg.from.id, 'photo.jpg', {
          //   caption: require('fs').readFileSync('data/messages/mailing.txt'),
          //   parse_mode: 'markdown'
          // });
          bot.sendMessage(user._id, require('fs').readFileSync('data/mailing/message.txt'), { parse_mode: 'markdown' });
          console.log(user._id);
        });
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
          chat_id: msg.from.id,
          message_id: msg.message.message_id
        });
      });
      bot.answerCallbackQuery(msg.id, { text: 'Сообщение отправлено' }, true);
      break;
    case 'cancel sending':
      bot.answerCallbackQuery(msg.id, { text: 'Хорошо, не буду' }, true);
      bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: msg.from.id,
        message_id: msg.message.message_id
      });
      break;
  }

};