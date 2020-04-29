const config = JSON.parse(require('fs').readFileSync('config/config.json'));

module.exports = function (bot, msg) {
  let chatId = msg.chat.id;
  let words = msg.text.split(' ');

  if (words.length < 2) {
    return bot.sendMessage(chatId, fs.readFileSync('data/messages/keyboard.txt'), { parse_mode: 'markdown' });
  }
  switch (words[1]) {
    case 'on': { // создать клавиатуру 

      var firstLoad, secondLoad;

      if (config.DE_mode) {
        firstLoad = [
          { text: 'Сегодня', callback_data: '/today' },
          { text: 'Завтра', callback_data: '/tomorrow' },
        ];
        secondLoad = [
          { text: 'Неделя', callback_data: '/week' },
          { text: 'Выбрать день', callback_data: '/selectday' },
        ];
      } else {
        firstLoad = [
          { text: 'Сегодня', callback_data: '/today' },
          { text: 'Завтра', callback_data: '/tomorrow' },
        ];
        secondLoad = [
          { text: 'Неделя', callback_data: '/week' },
          { text: 'След неделя', callback_data: '/nextweek' },
        ];
      }

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