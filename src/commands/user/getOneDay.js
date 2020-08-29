var config = JSON.parse(require('fs').readFileSync('config/config.json'));

module.exports = function (param) {

  let message = '*' + param.today.locale('ru').format('dddd, DD MMMM').capitalize() + '*\n\n';

  if (!config.rosdistant) {

    // Получение расписания с сайта вуза
    if (!param.schedule || param.schedule.every(a => a === ''))
      return param.bot.sendMessage(param.chatId, message +
        'Пустой день', {
        parse_mode: 'markdown'
      });

    for (var i = 0; i < param.schedule.length; i++)
      if (param.schedule[i] !== '')
        message += '*' + (i + 1) + '-я*\n' + param.schedule[i].replace(/ \[/g, '\\[').replace(/_/g, '* ') + '\n\n';
    param.bot.sendMessage(param.chatId, message, { parse_mode: 'markdown' });

  } else {

    if (!param.schedule.length)
      return param.bot.sendMessage(param.chatId, message +
        'Пустой день', {
        parse_mode: 'markdown'
      });

    let courses = param.schedule[0].courses;
    courses.forEach(function (course) {
      message += '*' + course.pairNum + '-я ' + course.time + '*\n';
      message += course.coursename + '\n';
      message += course.teacher.length ? ('_' + course.teacher + '_\n') : '';
      message += course.link.length ? (course.link + '\n') : '';
      message += course.audience.length ? (course.audience + '\n') : '';
      message += '\n';
    });

    return param.bot.sendMessage(param.chatId, message, { parse_mode: 'markdown' });
  }

};