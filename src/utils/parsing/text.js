const fs = require('fs'); // for working with files

var configPrivate = JSON.parse(fs.readFileSync('config/private.json'));

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
      require('../../commands/user/whoami')(bot, chatId);
      break;
    case '/mygroup':
    case 'моя группа':
      commands.exit = true;
      require('../../commands/user/mygroup')(bot, chatId);
      break;
  }

  // Команды администратора
  if (!commands.exit && chatId == configPrivate.ADMIN_CHAT_ID) {
    switch (msg.toLowerCase()) {
      case 'send mail':
        commands.exit = true;
        require('../../commands/admin/checkMsg')(bot, chatId);
        break;
      case 'update names':
        commands.exit = true;
        bot.sendMessage(chatId,
          'Работа с обновлениями\n' +
          'Не выключайте компьютер'
        );
        require('../../commands/admin/updateNames')(bot, (text) => {
          bot.sendMessage(chatId, 'Список пользователей:\n' + text);
        });
        break;
    }
  }

  // Разбор отдельных команд
  if (!commands.exit) {
    const messages = msg.split(' ');
    messages.forEach(function (com) {
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
        case '/group':
        case 'группа':
        case '/institute':
        case 'инст':
        case 'институт':
        case '/course':
        case 'курс':
          commands.registration = true;
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
          require('../../commands/user/getInstList')(bot, chatId);
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
};