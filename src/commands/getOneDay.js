const moment = require('moment-timezone'); // for working with dates

module.exports = function (param) {

  let message = '*' + moment(param.today).locale('ru').format('dddd, DD MMMM').capitalize() + '*\n\n';

  if (!param.schedule || param.schedule.every(a => a === ''))
    return param.bot.sendMessage(param.chatId, message +
      'Пустой день', {
      parse_mode: 'markdown'
    });

  for (var i = 0; i < param.schedule.length; i++)
    if (param.schedule[i] !== '')
      message += '*' + (i + 1) + '-я*\n' + param.schedule[i].replace(/ \[/g, '\\[').replace(/_/g, '* ') + '\n\n';
  param.bot.sendMessage(param.chatId, message, { parse_mode: 'markdown' });
}