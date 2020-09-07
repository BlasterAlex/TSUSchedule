const XLSX = require('xlsx'); // for reading xls
const request = require('request'); // for getting html
const cheerio = require('cheerio'); // for html parsing
const he = require('he'); // for decoding html entities
const moment = require('moment-timezone'); // for working with dates
const puppeteer = require('puppeteer'); // for working with a virtual browser

const config = require('../../../config/config.json');
const adminId = process.env.ADMIN_CHAT_ID || require('../../../config/private.json').ADMIN_CHAT_ID;
const userPages = require('../auth').userPages;

module.exports = function (param, callback) {

  var bot = param.bot;
  var user = param.user;
  var chatId = user._id;

  // Проверка статуса авторизации на Росдистант
  async function checkLogIn() {
    const user = userPages.find(o => o.chatId === chatId);
    if (!user) return false;
    await user.page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
    return await user.page.evaluate(() => {
      return ((!document.querySelector('.loginform') && document.querySelector('#page'))
        || document.querySelector('.loginerrors')) ? true : false;
    });
  }

  if (!config.rosdistant) {

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

    // Расписание пар
    const pairNumbers = ['08:30', '10:15', '12:45', '14:30', '16:15', '18:00'];

    // Получение расписания с страницы пользователя
    var getSchedule = () => {
      bot.sendMessage(chatId, 'Получение расписания, ожидайте...').then(function (sender) {
        const messageId = sender.message_id;
        (async () => {
          try {
            const page = userPages.find(o => o.chatId === chatId).page;
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
                  const dateStr = datetime.text().split(/\s+/);
                  const time = dateStr[0];
                  const date = dateStr[1];

                  const html = content.html();
                  const teacher = html.match(/<b>Преподаватель:<\/b>\s*([^<]+)<br>/);
                  const audience = html.match(/<b>Аудитория:<\/b>\s*([^<]+)<br>/);
                  const link = html.match(/<a href="(.*)">/);

                  // Получение объекта даты для сравнения
                  const getTime = t => {
                    const timeS = t.split(':', 2);
                    return (new Date()).setHours(timeS[0], timeS[1]);
                  };

                  // Определение номера пары
                  const pairNum = pairNumbers.indexOf(pairNumbers.reduce(function (prev, curr) {
                    const t = getTime(time);
                    return (Math.abs(getTime(curr) - t) < Math.abs(getTime(prev) - t) ? curr : prev);
                  })) + 1;

                  var course = {
                    'pairNum': pairNum,
                    'time': time,
                    'coursename': $(this).find('.coursename a').text(),
                    'teacher': teacher ? teacher[1] : '',
                    'audience': audience ? audience[1] : '',
                    'link': link ? link[1] : '',
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
            if (chatId == adminId) {
              bot.sendPhoto(chatId, await page.screenshot(), {}, {
                filename: 'schedule',
                contentType: 'image/png',
              });
              let bodyHTML = await page.evaluate(() => document.body.innerHTML);
              bot.sendDocument(chatId, Buffer.from(bodyHTML, 'utf8'), { fileName: 'index.html' });
            } else
              callback(schedule);

          } catch (err) {
            console.log(err);
          } finally {
            bot.deleteMessage(chatId, messageId);
          }
        })();
      });
    };

    // Авторизация пользователя в системе
    var authorization = () => {
      bot.sendMessage(chatId, 'Авторизация в системе Росдистант, ожидайте...').then(function (sender) {
        const messageId = sender.message_id;

        require('../auth').getRosdistant(bot, chatId, function (user) {
          (async () => {
            try {

              // Проверка на наличие открытой страницы
              const userPage = userPages.find(o => o.chatId == chatId);
              if (userPage) {
                userPage.page.browser().close();
                userPages.splice(userPages.indexOf(userPages), 1);
              }

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

                // Создание страницы с расписанием
                const page = await browser.newPage();
                await page.setViewport({
                  width: 1920,
                  height: 1080,
                });
                await page.goto(config.scheduleRosdistant, { waitUntil: ['networkidle0', 'domcontentloaded'] });

                // Авторизация пользователя в системе
                await page.evaluate(function (login, password) {
                  let inputs = document.querySelector('.loginform');
                  inputs.querySelector('#username').value = login;
                  inputs.querySelector('#password').value = password;
                  document.querySelector('#loginbtn').click();
                }, user.login, user.password);
                await page.waitForNavigation();

                // Ожидание завершения авторизации
                await new Promise((resolve) => {
                  const interval = async function () {
                    try {
                      const successful = await page.evaluate(() => {
                        return (!document.querySelector('.loginform') && document.querySelector('#page'))
                          || document.querySelector('.loginerrors');
                      });
                      if (successful)
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
                const state = await page.evaluate(() => {
                  let error = document.querySelector('.loginerrors .error');
                  if (error && error.innerText === 'Неверный логин или пароль, попробуйте заново.')
                    return 'wrong user data';
                  else return 'ok';
                });

                // Ошибка авторизации
                switch (state) {
                  case 'wrong user data':
                    return bot.sendMessage(chatId,
                      'Неправильные данные для входа:\n' +
                      'Логин:  *' + user.login + '*\n' +
                      'Пароль: ' + '/showpassword',
                      { parse_mode: 'markdown' });
                }

                // Кэширование страницы
                userPages.push({ 'chatId': chatId, 'page': page });

                // Получение расписания с сайта
                getSchedule();

              } catch (err) {
                return bot.sendMessage(chatId,
                  'Ошибка авторизации:\n' + err.message, { parse_mode: 'markdown' });
              } finally {
                bot.deleteMessage(chatId, messageId);
              }

            } catch (err) {
              console.log(err);
              return bot.sendMessage(chatId,
                'Не удалось запустить браузер',
                { parse_mode: 'markdown' });
            }

          })();

        });
      });
    };

    checkLogIn().then((isLogIn) => {
      if (isLogIn) getSchedule();
      else authorization();
    });

  }

};