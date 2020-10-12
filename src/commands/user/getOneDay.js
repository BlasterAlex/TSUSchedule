// Вывод одной пары
const onePair = course => {
  message = '*' + course.pairNum + '-я ' +
    (course.time.length ? ('[' + course.time + ']') : '') + '*\n';
  message += course.coursename + '\n';

  let coursetype;
  switch (course.coursetype) {
    case 'Пр':
      coursetype = 'Практика';
      break;
    case 'Лаб':
      coursetype = 'Лабораторная';
      break;
    case 'Лек':
      coursetype = 'Лекция';
      break;
    case 'СР':
      coursetype = 'СР';
      break;
    default:
      coursetype = '';
  }

  message += coursetype.length ? (coursetype + '\n') : '';
  message += course.teacher.length ? ('_' + course.teacher + '_\n') : '';
  message += course.link && course.link.length ? (course.link + '\n') : '';
  message += course.audience.length ? (course.audience + '\n') : '';
  message += '\n';
  return message;
};

// Вывести расписание на день
const allDay = param => {

  let message = '*' + param.today.locale('ru').format('dddd, DD MMMM').capitalize() + '*\n\n';

  if (!param.schedule.length || !param.schedule[0].courses.length)
    return param.bot.sendMessage(param.chatId, message +
      'Пустой день', {
      parse_mode: 'markdown'
    });

  let courses = param.schedule[0].courses;
  courses.forEach(function (course) { message += onePair(course); });

  return param.bot.sendMessage(param.chatId, message, { parse_mode: 'markdown' });

};

module.exports = { allDay, onePair };