const fs = require('fs'); // for working with files

module.exports = function (bot, chatId, msg) {

  var commands = {
    registration: false,
    exit: false,
    onWeek: false
  };

  // Разбор фраз 
  switch (msg.toLowerCase()) {
    case '/lastweek':
    case 'пред неделя':
      commands.onWeek = true;
      commands.withoutDay = true;
      commands.fromNow = -7;
      return commands;
    case '/nextweek':
    case 'след неделя':
      commands.onWeek = true;
      commands.withoutDay = true;
      commands.fromNow = 7;
      return commands;
    case '/whoami':
    case 'кто я':
      commands.exit = true;
      require('../commands/whoami')(bot, chatId);
      break;
  }

  // Разбор отдельных команд
  if (!commands.exit) {
    const messages = msg.split(' ');
    messages.forEach(function (com, index) {
      switch (com.toLowerCase()) {
        case '/yesterday':
        case 'вчера':
          commands.fromNow = -1;
          break;
        case '/today':
        case 'сегодня':
          commands.fromNow = 0;
          break;
        case '/tomorrow':
        case 'завтра':
          commands.fromNow = 1;
          break;
        case '/week':
        case 'неделя':
          commands.onWeek = true;
          commands.fromNow = 0;
          break;
        case '/reg':
        case 'рег':
        case 'регистрация':
          commands.registration = index;
          break;
        case '/help':
        case 'помощь':
        case 'помогити':
          commands.exit = true;
          bot.sendMessage(chatId, fs.readFileSync('data/messages/help.txt'), {
            parse_mode: 'markdown'
          });
          break;
        case '/list':
        case 'список':
        case 'институты':
          commands.exit = true;
          require('../commands/getInstList')(bot, chatId);
          break;
        default:
          if (commands.registration === false) {
            commands.exit = true;
            bot.sendMessage(chatId, 'Я не знаю, что такое _' + com + '_', { parse_mode: 'markdown' });
          }
          break;
      }
    });
  }

  return commands;
}