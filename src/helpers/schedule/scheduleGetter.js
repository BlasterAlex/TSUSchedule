const XLSX = require('xlsx'); // for reading xls
const request = require('request'); // for getting html
const cheerio = require('cheerio'); // for html parsing
const he = require('he'); // for decoding html entities
const moment = require('moment-timezone'); // for working with dates
const puppeteer = require('puppeteer'); // for working with a virtual browser

var config = JSON.parse(require('fs').readFileSync('config/config.json'));

module.exports = function (param, callback) {

  var bot = param.bot;
  var user = param.user;
  var chatId = user.chatId;

  if (!config.DE_mode) {

    var today = param.today;
    var week = param.week;
    var inst = param.inst;

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

  } else {

    const URL = config.rosdistantURL + 'local/lk/myschedule.php';
    const pairNumbers = ['08:30', '10:15', '12:45', '14:30', '16:15'];

    bot.sendMessage(chatId, 'Получение информации с Росдистант, ожидайте...').then(function (sender) {
      var messageId = sender.message_id;

      require('../auth').getRosdistant(bot, chatId, function (user) {

        (async () => {

          try {

            // Запуск браузера
            const browser = await puppeteer.launch({
              headless: true,
              defaultViewport: null,
              args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
              ]
            });

            try {

              const page = await browser.newPage();
              await page.setViewport({
                width: 1920,
                height: 1080,
              });
              await page.goto(URL);

              // Авторизация пользователя в системе
              await page.evaluate(function (login, password) {
                let inputs = document.querySelector('.loginform');
                inputs.querySelector('#username').value = login;
                inputs.querySelector('#password').value = password;
                document.querySelector('#loginbtn').click();
              }, user.login, user.password);

              // Ожидание завершения авторизации
              await new Promise((resolve) => {
                const interval = async function () {
                  try {
                    let waiting = await page.evaluate(() => {
                      return (!document.querySelector('.loginform') && document.querySelector('#page'))
                        || document.querySelector('.loginerrors');
                    });
                    if (waiting)
                      resolve();
                    else
                      setTimeout(interval, 2000);
                  } catch (err) {
                    return bot.sendMessage(chatId,
                      'Ошибка получения расписания с Росдистант\nПопробуйте еще раз',
                      { parse_mode: 'markdown' });
                  }
                };
                setTimeout(interval, 2000);
              });

              // Проверка статуса авторизации
              let status = await page.evaluate(() => {
                let error = document.querySelector('.loginerrors .error');
                if (error && error.innerText === 'Неверный логин или пароль, попробуйте заново.')
                  return 'wrong user data';
                else return 'ok';
              });

              // Ошибка авторизации
              switch (status) {
                case 'wrong user data':
                  return bot.sendMessage(chatId,
                    'Неправильные данные для входа:\n' +
                    'Логин:  *' + user.login + '*\n' +
                    'Пароль: ' + '/showpassword',
                    { parse_mode: 'markdown' });
              }

              await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });

              // Разбор расписания
              let schedule = await page.evaluate(function (pairNumbers) {
                const $ = window.$;
                var array = [];

                $('.mycourses .coursebox').each(function () {
                  var mycourses = $(this).closest('.mycourses');
                  var content = mycourses.find('div:nth-child(2)');
                  var datetime = mycourses.find('div:nth-child(3)');

                  if (content.length && datetime.length) {
                    var dateStr = datetime.text().split(/\s+/);
                    var time = dateStr[0];
                    var date = dateStr[1];

                    var teacher = content.html().match(/<b>Преподаватель:<\/b>\s*([^<]+)<br>/);
                    var link = content.html().match(/<a href="(.*)">/);

                    var course = {
                      'pairNum': pairNumbers.indexOf(time) + 1,
                      'time': time,
                      'coursename': $(this).find('.coursename a').text(),
                      'teacher': teacher ? teacher[1] : 'undefined',
                      'link': link ? link[1] : 'undefined',
                    };

                    var found = false;
                    for (var i = 0; i < array.length; i++) {
                      if (array[i].date == date) {
                        found = true;
                        array[i].courses.push(course);
                        break;
                      }
                    }
                    if (!found)
                      array.push({ 'date': date, 'courses': [course] });
                  }
                });

                return array;
              }, pairNumbers);

              // Работа с полученным расписанием
              callback(schedule);

            } catch (err) {
              return bot.sendMessage(chatId,
                'Ошибка получения расписания с Росдистант:\n' + err.message,
                { parse_mode: 'markdown' });
            } finally {
              bot.deleteMessage(chatId, messageId);
              await browser.close();
            }

          } catch (err) {
            return bot.sendMessage(chatId,
              'Не удалось запустить браузер',
              { parse_mode: 'markdown' });
          }

        })();

      });

    });

  }
};