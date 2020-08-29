const fs = require('fs');

module.exports = function (bot, chatId) {
  // bot.sendVideo(chatId, 'data/mailing/video.mp4', {
  //   caption: require('fs').readFileSync('data/mailing/message.txt'),
  //   parse_mode: 'markdown'
  // });
  bot.sendMessage(chatId, 'Так выглядит ваше сообщение:\n\n' +
    fs.readFileSync('data/mailing/message.txt') + '\n\nОтправляю?', {
    parse_mode: 'markdown',
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: 'Да', callback_data: 'send to everyone' }],
        [{ text: 'Нет', callback_data: 'cancel sending' }],
      ]
    })
  });
};