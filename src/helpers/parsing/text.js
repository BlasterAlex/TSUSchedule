const fs = require('fs'); // for working with files
const moment = require('moment-timezone'); // for working with dates
const Calendar = require('../calendar'); // for using inline-calendar in chat

const config = JSON.parse(fs.readFileSync('config/config.json'));
const adminId = process.env.ADMIN_CHAT_ID || require('../../../config/private.json').ADMIN_CHAT_ID;

module.exports = function (bot, chatId, msg) {

  const message = msg.text;
  const lowerMsg = message.toLowerCase();
  var commands = {
    exit: false,
    onWeek: false
  };

  // Перевод из нижнего в обычный регистр
  var normalRegister = lower => {
    if (lower.length) {
      const start = lowerMsg.indexOf(lower);
      const end = start + lower.length;
      return message.substring(start, end);
    }
    else
      return false;
  };

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
      case 'update groups':
        commands.exit = true;
        require('../../commands/admin/updateGroups')(bot, chatId);
        return commands;
    }
  }

  let match;
  switch (lowerMsg) {
    case (match = lowerMsg.match(/(\/yesterday|вчера)\s*(.*)/) || {}).input:
      commands.anotherGroup = normalRegister(match[2]);
      commands.fromNow = -1;
      break;
    case (match = lowerMsg.match(/(\/today|сегодня)\s*(.*)/) || {}).input:
      commands.anotherGroup = normalRegister(match[2]);
      commands.fromNow = 0;
      break;
    case (match = lowerMsg.match(/(\/tomorrow|завтра)\s*(.*)/) || {}).input:
      commands.anotherGroup = normalRegister(match[2]);
      commands.fromNow = 1;
      break;
    case (match = lowerMsg.match(/(\/week|неделя)\s*(.*)/) || {}).input:
      commands.anotherGroup = normalRegister(match[2]);
      commands.onWeek = true;
      commands.fromNow = 0;
      break;
    case (match = lowerMsg.match(/(\/lastweek|пред неделя)\s*(.*)/) || {}).input:
      commands.anotherGroup = normalRegister(match[2]);
      commands.onWeek = true;
      commands.withoutDay = true;
      commands.fromNow = -7;
      break;
    case (match = lowerMsg.match(/(\/nextweek|след неделя)\s*(.*)/) || {}).input:
      commands.anotherGroup = normalRegister(match[2]);
      commands.onWeek = true;
      commands.withoutDay = true;
      commands.fromNow = 7;
      break;
    case (match = lowerMsg.match(/(\/selectday|выбрать день)\s*(.*)/) || {}).input: {
      commands.exit = true;
      commands.anotherGroup = normalRegister(match[2]);
      const calendar = new Calendar(bot, chatId);
      calendar.getDate((date) => {
        const now = moment().tz(config.timeZone, true).set({ 'hour': 0, 'minute': 0, 'second': 0 });
        const nw = moment(date, 'DD/MM/YYYY').tz(config.timeZone, true).set({ 'hour': 0, 'minute': 0, 'second': 0 });
        commands.fromNow = moment.duration(nw.diff(now)).asDays();
        require('../../bot').run(chatId, commands);
      });
      break;
    }

    case (lowerMsg.match(/\/reg|рег|регистрация|\/group|группа|\/login|логин|\/password|пароль|\/showpassword/) || {}).input:
      commands.exit = true;
      require('../../commands/user/registration')(bot, msg);
      break;
    case (lowerMsg.match(/\/keyboard|клавиатура|клав/) || {}).input:
      commands.exit = true;
      require('../../helpers/keyboard')(bot, msg);
      break;

    case (lowerMsg.match(/(\/notifications|уведс|мои уведомления)/) || {}).input: {
      commands.exit = true;
      require('../notify').getList(bot, chatId);
      break;
    }
    case (lowerMsg.match(/(\/delnotify|удалить уведомления)/) || {}).input: {
      commands.exit = true;
      require('../notify').clearList(bot, chatId);
      break;
    }
    case (match = lowerMsg.match(/(\/notify|увед|уведомление)\s*(.*)/) || {}).input: {
      commands.exit = true;
      require('../notify').createNotify({ bot: bot, chatId: chatId, notify: match[2] });
      break;
    }

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
    case 'группы':
      commands.exit = true;
      require('../../commands/user/getGroupList')(bot, chatId);
      break;
    default:
      commands.exit = true;
      bot.sendMessage(chatId, 'Я не знаю, что такое _' + message + '_', { parse_mode: 'markdown' });
      break;
  }

  return commands;
};