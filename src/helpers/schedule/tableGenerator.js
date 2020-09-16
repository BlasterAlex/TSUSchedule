const cheerio = require('cheerio'); // for html generating
const moment = require('moment-timezone'); // for working with dates

module.exports = function (param) {

  const user = param.user;
  const today = param.today;
  const schedule = param.schedule;
  const dayOfWeek = moment(today).startOf('week').isoWeekday(1);

  // Формирование html
  var tableIsEmpty = true;
  $ = cheerio.load(
    '<html>' +
    '<head>' +
    '  <meta charset = "utf-8" />' +
    '  <link href="https://fonts.googleapis.com/css?family=Roboto+Mono" rel="stylesheet"></link>' +
    '  <style type="text/css">' +
    '    body { ' +
    '      font-family: "Roboto Mono";' +
    '    }' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <table cellspacing="2" border="2" cellpadding="5" style="border-radius: 10px">' +
    '    <tr>' +
    '      <th colspan="8" style="background: #fff7d9; height: 40px; font-weight: bold">' + user.group + '</th>' +
    '    </tr>' +
    '    <tr id="table-header" style="height: 50px; font-weight: bold">' +
    '     <td style="background: #ebe2be; width:1px; white-space:nowrap; text-align: center;">Пара</td>' +
    '    </tr>' +
    '  </table>' +
    '</body>' +
    '</html>', { decodeEntities: false });

  // Дни текущей недели
  let days = [];
  for (let i = 1; i <= 6; i++)
    days.push(moment(dayOfWeek).day(i));

  // Отбор дней текущей недели
  let coursesOnWeek = [];
  days.forEach(function (day) {
    let found = schedule.find(d => d.date == day.format('DD.MM.YYYY'));
    coursesOnWeek.push(found ? found.courses : []);
  });
  if (!coursesOnWeek[coursesOnWeek.length - 1].length) coursesOnWeek.pop();

  // Заголовок таблицы
  for (let i = 0; i < coursesOnWeek.length; ++i) {
    // Выделение текущего дня
    const background = !param.withoutDay && today.day() === (i + 1) ? 'background: rgba(241, 242, 194, 0.4)' : '';
    $('body table tbody #table-header').append(
      '<td style="width: 200px; text-align: center; ' + background + '">' +
      days[i].format('dddd, DD MMMM').capitalize() +
      '</td>');
  }
  $('body table tbody #table-header').append(
    '<td style="background: #ebe2be; width:1px; white-space:nowrap; text-align: center;">Пара</td>');

  // Определение максимального количества пар
  let maxPairNum = 0;
  coursesOnWeek.forEach(function (dayCourses) {
    if (dayCourses.length)
      maxPairNum = Math.max(maxPairNum, dayCourses[dayCourses.length - 1].pairNum);
  });

  // Строки таблицы
  for (let i = 0; i < maxPairNum; i++) {

    let lessonId = 'table_lesson_' + (i + 1);
    $('body table tbody').append('<tr id="' + lessonId + '">');
    $('body table tbody #' + lessonId).append('<td style="background: #f5f2e6; text-align: center;">' + (i + 1) + '-я</td>');

    // Столбцы таблицы
    let emptyLine = true;
    for (let j = 0; j < coursesOnWeek.length; j++) {

      // Выделение текущего дня
      let background = !param.withoutDay && today.day() === (j + 1) ? 'background: rgba(241, 242, 194, 0.4)' : '';

      // Разбор расписания на день
      let text = '';

      // Получение информации о текущей паре
      if (coursesOnWeek[j].length) {
        let found = coursesOnWeek[j].find(course => course.pairNum === (i + 1));
        if (found) {

          // Разбор расписания на день
          let course = found;
          emptyLine = false;

          // Неопределенный тип курса
          if (!course.coursetype || !course.coursetype.length)
            text += '<span style="color: #2b2a2a; font-weight: bold">' + course.coursename + '</span><br>';

          // Практики и лабы
          else if (course.coursetype === 'Пр' || course.coursetype === 'Лаб')
            text += '<span style="color: #2e58ff; font-weight: bold">' + course.coursename + ' (' + course.coursetype + ')' + '</span><br>';

          // Лекции
          else if (course.coursetype === 'Лек')
            text += '<span style="color: #ff583b; font-weight: bold">' + course.coursename + ' (' + course.coursetype + ')' + '</span><br>';

          // Имя преподавателя
          text += course.teacher.length ? ('<span style="font-weight: bold">' + course.teacher + '</span><br>') : '<br>';

          // Время занятия
          text += '<span>[' + course.time + ']</span><br>';

          // Аудитория
          text += course.audience.length ? ('<span>' + course.audience + '</span><br>') : '<br>';
        }
      }

      // Добавление текущей ячейки в таблицу
      $('body table tbody #' + lessonId).append(
        '<td valign="top" style="width:230px; text-align: center; ' + background + '">'
        + text +
        '</td>');
    }

    $('body table tbody #' + lessonId).append(
      '<td style="background: #f5f2e6; text-align: center;">' + (i + 1) + '-я</td>'
    );

    if (emptyLine)
      $('body table tbody #' + lessonId).remove();
    else
      tableIsEmpty = false;
  }

  return !tableIsEmpty ? $.html() : false;
};