const moment = require('moment-timezone'); // for working with dates

module.exports = function (param) {
  let message = '*' + moment(param.today).locale('ru').format('dddd, DD MMMM').capitalize() + '*\n\n';
  for (var i = 0; i < param.schedule.length; i++)
    message += '*' + (i + 1) + '-я*\n' + param.schedule[i].replace(/ \[/g, '\\[') + '\n\n';
  param.bot.sendMessage(param.chatId, message, { parse_mode: 'markdown' });
}