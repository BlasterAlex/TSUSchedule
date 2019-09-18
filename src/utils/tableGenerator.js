const cheerio = require('cheerio');
const moment = require('moment');

module.exports = function (param) {

  var today = param.today;
  var user = param.user;
  var schedule = param.schedule;

  // Формирование html
  $ = cheerio.load(
    '<html>' +
    '<head>' +
    '  <meta charset = "utf-8" />' +
    '</head>' +
    '<body>' +
    '  <table cellspacing="2" border="2" cellpadding="5" style="height: 100%;">' +
    '    <tr>' +
    '      <th colspan="8" style="background: #fff7d9; height: 40px;">' + user.group + '</th>' +
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
      background = 'background: #f1f2c2;';

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
        background = 'background: #f1f2c2;';

      $('body table tbody #' + lessoId).append(
        '<td valign="top" style="width:230px; text-align: center; ' + background + '">'
        + schedule[j][i].replace(/\n/g, '<br>') +
        '</td>');
    }
    $('body table tbody #' + lessoId).append('<td style="background: #f5f2e6; text-align: center;">' + (i + 1) + '-я</td>')
  }

  return $.html();
};