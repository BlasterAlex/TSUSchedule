const XLSX = require('xlsx'); // for reading xls
const request = require('request'); // for getting html
const cheerio = require('cheerio'); // for html parsing
const he = require('he'); // for decoding html entities
const moment = require('moment-timezone'); // for working with dates

const weekTemplate = 'нед';
var config = JSON.parse(require('fs').readFileSync('config/config.json'));

module.exports = function (param, callback) {

  var bot = param.bot;
  var today = param.today
  var user = param.user;
  var chatId = user.chatId;
  var week = today.diff(moment(config.academYBegin, 'DD/MM/YYYY'), 'weeks') + 1;

  // Получение страницы сайта расписаний
  let URL = config.scheduleURL;
  request(URL, function (err, res) {
    if (err) throw err;
    var $ = cheerio.load(res.body);

    // Поиск ссылки на файл
    var file;
    $('.container .row .col-lg-8 .card-body p a').each(function () {
      let link = $(this).attr('href');
      if (link.indexOf(user.institute) !== -1 && link.indexOf(week + weekTemplate) !== -1)
        file = link;
    });

    // Загрузка файла
    let url = 'https://www.tltsu.ru' + encodeURI(file).replace(/%25/g, '%');
    request(url, { encoding: null }, function (err, res, data) {

      if (err || res.statusCode !== 200) {
        console.log(err);
        return bot.sendMessage(chatId, 'Невозможно получить данные для:\n' +
          '*Институт*: ' + user.institute +
          '\n*Курс*: ' + user.course +
          '\n*Группа*: ' + user.group +
          '\n*День*: ' + moment(today).locale('ru').format('dd, DD MMM') + ', неделя ' + week, {
          parse_mode: 'markdown'
        });
      }

      // Чтение полученного файла
      var wb = XLSX.read(data, { type: 'buffer' });
      var ws = wb.Sheets[wb.SheetNames[user.course - 1]];

      $ = cheerio.load(XLSX.utils.sheet_to_html(ws));
      var write = false; // флаг для записи нужного расписания
      var schedule = [[], [], [], [], [], []]; // расписание на неделю

      $('body table tbody tr').each(function () { // каждая строка

        // Поиск расписания для группы
        if ($(this).text() === user.group)
          write = true;
        else if (write && !$(this).find("td").text().match(/\d-я/))
          write = false;
        else {
          let pairNum;
          let dayNum = 0;

          if (write) {
            $(this).find("td").each(function () { // каждый столбец

              let myhtml = $(this).html().replace(/<br\s?\/?>/gi, '\n'); // заменяет <br> на \n
              let text = he.decode(myhtml);

              let match = $(this).text().match(/(\d)-я/);
              if (match) { // это номер пары
                if (!pairNum)
                  pairNum = match[1];
              } else {  // это предмет
                if (dayNum < 6)
                  schedule[dayNum++].push(text);
              }
            });
          }
        }
      });

      // Работа с полученным расписанием
      callback(schedule);
    });
  });
}