// import { ReplyKeyboard } from 'node-telegram-keyboard-wrapper';

module.exports = function (bot, msg) {
  let chatId = msg.chat.id;
  let words = msg.text.split(' ');

  if (words.length < 2) {
    return bot.sendMessage(chatId, require('fs')
      .readFileSync('data/messages/keyboard.txt'), { parse_mode: 'markdown' });
  }
  switch (words[1]) {
    case 'on': { // создать клавиатуру 

      let firstLoad = [
        { text: 'Сегодня', callback_data: 'keyboard today' },
        { text: 'Завтра', callback_data: 'keyboard tomorrow' },
      ];
      let secondLoad = [
        { text: 'Неделя', callback_data: 'keyboard week' },
        { text: 'След неделя', callback_data: 'keyboard next week' },
      ];

      bot.sendMessage(
        msg.chat.id,
        'Клавиатура добавлена',
        { reply_markup: JSON.stringify({ keyboard: [firstLoad, secondLoad], resize_keyboard: true }) }
      );
      break;
    }
    case 'off': // удалить клавиатуру
      bot.sendMessage(
        msg.chat.id,
        'Клавиатура убрана',
        { reply_markup: JSON.stringify({ remove_keyboard: true }) }
      );
      break;
    default:
      bot.sendMessage(msg.chat.id, 'Неизвестный параметр _' + words[1] + '_', { parse_mode: 'markdown' });
  }
};