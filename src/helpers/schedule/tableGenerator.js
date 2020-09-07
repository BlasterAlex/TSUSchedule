const cheerio = require('cheerio'); // for html generating
const moment = require('moment-timezone'); // for working with dates

module.exports = function (param) {

  var today = param.today;
  var user = param.user;
  var schedule = param.schedule;

  // Формирование html
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
    days.push(moment(today).day(i));

  // Отбор дней текущей недели
  let coursesOnWeek = [];
  days.forEach(function (day) {
    let found = schedule.filter(d => d.date === day.format('DD.MM.YYYY'));
    coursesOnWeek.push(found.length ? found[0].courses : []);
  });
  if (!coursesOnWeek[coursesOnWeek.length - 1].length) coursesOnWeek.pop();

  // Заголовок таблицы
  for (let i = 0; i < coursesOnWeek.length; ++i) {

    // Выделение текущего дня
    let background = !param.withoutDay && today.day() === (i + 1) ? 'background: rgba(241, 242, 194, 0.4)' : '';

    $('body table tbody #table-header').append(
      '<td style="width: 200px; text-align: center; ' + background + '">' +
      days[i].format('dddd, DD MMMM').capitalize() +
      '</td>');

  }
  $('body table tbody #table-header').append(
    '<td style="background: #ebe2be; width:1px; white-space:nowrap; text-align: center;">Пара</td>');

  // Определение высоты таблицы
  var maxPairNum = 0;
  coursesOnWeek.forEach(function (dayCourses) {
    if (dayCourses.length) {
      let lastPairNum = dayCourses[dayCourses.length - 1].pairNum;
      if (maxPairNum < lastPairNum)
        maxPairNum = lastPairNum;
    }
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
        let found = coursesOnWeek[j].filter(course => course.pairNum === (i + 1));
        if (found.length) {
          // Разбор расписания на день
          let course = found[0];
          emptyLine = false;

          // Название курса
          let coursename = course.coursename + (course.coursetype.length ? (' (' + course.coursetype + ')') : '');

          // Практики и лабы
          if (!course.coursetype.length || course.coursetype === 'Пр' || course.coursetype === 'Лаб')
            text += '<span style="color: #2e58ff; font-weight: bold">' + coursename + '</span><br>';

          // Лекции
          else if (course.coursetype === 'Лек')
            text += '<span style="color: #ff583b; font-weight: bold">' + coursename + '</span><br>';

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
  }

  return $.html();
};