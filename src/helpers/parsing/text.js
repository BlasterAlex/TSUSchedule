const fs = require('fs'); // for working with files
const moment = require('moment-timezone'); // for working with dates
const Calendar = require('../calendar'); // for using inline-calendar in chat

const adminId = process.env.ADMIN_CHAT_ID || JSON.parse(fs.readFileSync('config/private.json')).ADMIN_CHAT_ID;
const config = JSON.parse(fs.readFileSync('config/config.json'));

module.exports = function (bot, chatId, msg) {

  var message = msg.text;
  var lowerMsg = message.toLowerCase();
  var commands = {
    exit: false,
    onWeek: false
  };

  // Разбор фраз 
  switch (lowerMsg) {
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
      return commands;
    case '/mygroup':
    case 'моя группа':
      commands.exit = true;
      require('../../commands/user/mygroup')(bot, chatId);
      return commands;
    case '/selectday':
    case 'выбрать день': {
      commands.exit = true;
      const calendar = new Calendar(bot, chatId);
      calendar.getDate((date) => {
        const now = moment().tz(config.timeZone, true).set({ 'hour': 0, 'minute': 0, 'second': 0 });
        const nw = moment(date, 'DD/MM/YYYY').tz(config.timeZone, true).set({ 'hour': 0, 'minute': 0, 'second': 0 });
        commands.fromNow = moment.duration(nw.diff(now)).asDays();
        require('../../bot').run(chatId, commands);
      });
      return commands;
    }
  }

  // Разбор команд с параметрами
  if (new RegExp(['/reg', 'рег', 'регистрация',
    '/group', 'группа', '/institute',
    'инст', 'институт', '/course', 'курс',
    '/login', 'логин', '/password', 'пароль', '/showpassword'
  ].join('|')).test(lowerMsg)) {
    commands.exit = true;
    require('../../commands/user/registration')(bot, msg);
    return commands;
  }
  else if (new RegExp(['/keyboard', 'клавиатура', 'клав'].join('|')).test(lowerMsg)) {
    commands.exit = true;
    require('../../commands/user/keyboard')(bot, msg);
    return commands;
  }

  // Разбор команд администратора
  if (chatId == adminId) {
    switch (lowerMsg) {
      case 'send mail':
        commands.exit = true;
        require('../../commands/admin/checkMsg')(bot, chatId);
        return commands;
      case 'update names':
        commands.exit = true;
        bot.sendMessage(chatId,
          'Работа с обновлениями\n' +
          'Не выключайте компьютер'
        );
        require('../../commands/admin/updateNames')(bot, (text) => {
          bot.sendMessage(chatId, 'Список пользователей:\n' + text);
        });
        return commands;
    }
  }

  // Разбор отдельных команд
  const words = message.split(' ');
  words.forEach(function (com) {
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
      case '/help':
      case '/start':
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
        commands.exit = true;
        bot.sendMessage(chatId, 'Я не знаю, что такое _' + com + '_', { parse_mode: 'markdown' });
        break;
    }
  });

  return commands;
};
