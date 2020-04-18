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
    '</html>'
    , { decodeEntities: false });

  // Заголовок таблицы
  for (let i = 1; i <= schedule.length; ++i) {
    let background = '';
    if (i === moment(today).day() && !param.withoutDay)
      background = 'background: rgba(241, 242, 194, 0.4)';

    $('body table tbody #table-header').append(
      '<td style="width: 200px; text-align: center; ' + background + '">' +
      moment(today).day(i).locale('ru').format('dddd, DD MMMM').capitalize() +
      '</td>');
  }
  $('body table tbody #table-header').append(
    '<td style="background: #ebe2be; width:1px; white-space:nowrap; text-align: center;">Пара</td>');

  // Строки таблицы
  for (var i = 0; i < schedule[0].length; i++) {
    let lessoId = 'table_lesson_' + (i + 1);
    $('body table tbody').append('<tr id="' + lessoId + '">');

    $('body table tbody #' + lessoId).append('<td style="background: #f5f2e6; text-align: center;">' + (i + 1) + '-я</td>');

    // Столбцы таблицы
    for (let j = 0; j < schedule.length; ++j) {
      let background = '';
      if ((j + 1) === moment(today).day() && !param.withoutDay)
        background = 'background: rgba(241, 242, 194, 0.4)';

      // Разбор расписания на день
      let text = '';
      schedule[j][i].split('\n').forEach(function (el) {

        // Считывание очередной строки ячейки таблицы
        el = el.trim();
        let line = el;

        // Практики и лабы
        if (el.match(/\(Пр\)$/) || el.match(/\(Лаб\)$/))
          line = '<span style="color: #2e58ff; font-weight: bold">' + line + '</span>';

        // Лекции
        else if (el.match(/\(Лек\)$/))
          line = '<span style="color: #ff583b; font-weight: bold">' + line + '</span>';

        // Имя преподавателя
        else if (el.match(/^[А-Я]([а-я]+) [А-Я].[А-Я].$/))
          line = '<span style=" font-weight: bold">' + line + '</span>';

        // Название подгруппы
        else if (el.match(/_\d$/))
          line = '<span style="background: rgba(227, 201, 152, 0.85); font-weight: 800; line-height: 200%;' +
            ' padding: 5px; border-radius: 10px;">' + line + '</span>';

        // Кабинет
        else if (el.match(/^([а-яА-Я0-9]+)-(\d+)$/))
          line = '<span style="color: rgb(1%, 64%, 16%, 1); font-weight: bold">' + line + '</span>';

        // Время - разрыв строки для разделения предметов
        else if (el.match(/\d\]$/))
          line += '<br>';

        text += line + '<br>';
      });

      $('body table tbody #' + lessoId).append(
        '<td valign="top" style="width:230px; text-align: center; ' + background + '">'
        + text.slice(0, -4) +
        '</td>');
    }

    $('body table tbody #' + lessoId).append(
      '<td style="background: #f5f2e6; text-align: center;">' + (i + 1) + '-я</td>'
    );
  }

  return $.html();
};