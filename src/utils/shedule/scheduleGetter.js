const XLSX = require('xlsx'); // for reading xls
const request = require('request'); // for getting html
const cheerio = require('cheerio'); // for html parsing
const he = require('he'); // for decoding html entities
const moment = require('moment-timezone'); // for working with dates

var config = JSON.parse(require('fs').readFileSync('config/config.json'));

module.exports = function (param, callback) {

  var bot = param.bot;
  var today = param.today;
  var week = param.week;
  var user = param.user;
  var inst = param.inst;
  var chatId = user.chatId;

  // Разбор шаблона
  inst.template = inst.template
    .replace(/\<%=year%\>/g, today.year())
    .replace(/\<%=number%\>/g, '/\d+/');

  // Получение страницы сайта расписаний
  let URL = config.scheduleURL;
  request(URL, function (err, res) {
    if (err) throw err;
    var $ = cheerio.load(res.body);

    // Поиск ссылки на файл
    var file;
    $('.container .row .col-lg-8 .card-body p a').each(function () {
      let link = $(this).attr('href');
      if (file === undefined && link.indexOf(inst.realName) !== -1 && link.search(week + inst.template) !== -1)
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
      var ws;
      if (['ИЗОиДПИ', 'АСИ-Д', 'ГумПИ-Ф', 'ИФКиС'].indexOf(user.institute) === -1)
        ws = wb.Sheets[wb.SheetNames[user.course - 1]];
      else
        ws = wb.Sheets[wb.SheetNames[1]];

      // Выход с сообщением об ошибке
      if (!ws)
        return bot.sendMessage(chatId, 'Данные получены. Не найдено расписание для вашего курса\n\n' +
          '*Институт*: ' + user.institute +
          '\n*Курс*: ' + user.course +
          '\n*Группа*: ' + user.group +
          '\n*День*: ' + moment(today).locale('ru').format('dd, DD MMM') + ', неделя ' + week, {
          parse_mode: 'markdown'
        });

      $ = cheerio.load(XLSX.utils.sheet_to_html(ws));

      var write = false; // флаг для записи нужного расписания
      var schedule = [[], [], [], [], [], []]; // расписание на неделю

      $('body table tbody tr').each(function () { // каждая строка

        // Поиск расписания для группы
        if ($(this).text() === user.group) {
          write = true;
        } else if (write && !$(this).find('td').text().match(/\d-я/)) {
          if ($(this).text().indexOf('Пара') === -1)
            write = false;
        } else {
          let pairNum;
          let dayNum = 0;

          if (write) {
            $(this).find('td').each(function () { // каждый столбец

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
};