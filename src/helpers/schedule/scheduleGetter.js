const fs = require('fs'); // for working with files
const cheerio = require('cheerio'); // for html parsing
const request = require('request'); // for getting html
const XLSX = require('xlsx'); // for reading xls
const he = require('he'); // for decoding html entities
const moment = require('moment-timezone'); // for working with dates
const puppeteer = require('puppeteer'); // for working with a virtual browser

const config = require('../../../config/config.json');
const InstituteRepository = require('../../repositories/InstituteRepository');
const adminId = process.env.ADMIN_CHAT_ID || require('../../../config/private.json').ADMIN_CHAT_ID;

// Массив открытых страниц пользователей
var userCookies = new Map();

module.exports = function (param, callback) {

  var bot = param.bot;
  const user = param.user;
  const chatId = user._id;
  const today = param.today;
  const week = param.week;
  const group = user.group;
  const anotherGroup = param.anotherGroup;

  // Страница Росдистант
  var page;

  // Проверка статуса авторизации на Росдистант
  async function checkLogIn() {
    // Установить сохраненные куки
    if (userCookies.has(chatId))
      await page.setCookie(...userCookies.get(chatId));

    // Перейти на страницу расписания
    await page.goto(config.scheduleRosdistant, { waitUntil: ['networkidle0', 'domcontentloaded'] });

    // Проверить статус пользователя в системе
    return await page.evaluate(() => {
      return (!document.querySelector('.loginform')) ? true : false;
    });
  }

  // Авторизация пользователя в системе
  var authorization = resolve => {
    bot.sendMessage(chatId, 'Авторизация в системе Росдистант, ожидайте...').then(function (sender) {
      const messageId = sender.message_id;
      require('../auth').getRosdistant(bot, chatId, function (user) {
        (async () => {
          try {

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
            const cookies = await page.cookies();
            userCookies.set(chatId, cookies);

            // Получение расписания с сайта
            getScheduleRosdistant(resolve);

          } catch (err) {
            page.browser().close();
            return bot.sendMessage(chatId,
              'Ошибка авторизации:\n' + err.message, { parse_mode: 'markdown' });
          } finally {
            bot.deleteMessage(chatId, messageId);
          }
        })();

      });
    });
  };

  // Получение расписания с страницы пользователя
  var getScheduleRosdistant = resolve => {
    bot.sendMessage(chatId, 'Получение расписания, ожидайте...').then(function (sender) {
      const messageId = sender.message_id;
      (async () => {
        try {

          // Добавление JQuery для парсинга
          await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });

          // Разбор расписания
          let schedule = await page.evaluate(() => {
            const pairNumbers = ['08:30', '10:15', '12:45', '14:30', '16:15', '18:00'];
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
          });

          // Работа с полученным расписанием
          if (chatId == adminId) {
            bot.sendPhoto(chatId, await page.screenshot(), {}, {
              filename: 'schedule',
              contentType: 'image/png',
            });
            let bodyHTML = await page.evaluate(() => document.body.innerHTML);
            bot.sendDocument(chatId, Buffer.from(bodyHTML, 'utf8'), { fileName: 'index.html' });
          }

          resolve(schedule);

        } catch (err) {
          console.log(err);
        } finally {
          page.browser().close();
          bot.deleteMessage(chatId, messageId);
        }
      })();
    });
  };

  // Получение расписания с Росдистант
  var rosdistant = () => {
    return new Promise(resolve => {
      (async () => {
        const browser = await puppeteer.launch({
          headless: true,
          defaultViewport: null,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 926 });
      })()
        .then(() => {
          checkLogIn().then((isLogIn) => {
            if (isLogIn) getScheduleRosdistant(resolve);
            else authorization(resolve);
          });
          // checkLogIn().then((isLogIn) => {
          //   if (isLogIn) checkLogIn().then((isLogIn) => {
          //     if (isLogIn) getScheduleRosdistant(resolve);
          //     else authorization(resolve);
          //   });
          //   else authorization(resolve);
          // });
        })
        .catch((err) => {
          console.error(err);
          return bot.sendMessage(chatId,
            'Не удалось запустить браузер для получения расписания с Росдистант',
            { parse_mode: 'markdown' });
        });
    });
  };

  // Получение расписания с сайта ТГУ
  var getSchedule = () => {
    return new Promise(resolve => {

      // Определение института
      InstituteRepository.findByGroup(group, (inst) => {
        if (!inst)
          return bot.sendMessage(chatId, 'Мы не нашли вашу группу, пожалуйста, уточните данные\n\n' +
            fs.readFileSync('data/messages/registration.txt'), { parse_mode: 'markdown' });

        // Поиск нужного файла с расписанием
        request(config.scheduleURL, function (err, res) {
          if (err) throw err;
          var $ = cheerio.load(res.body);

          // Поиск ссылки на расписание
          let link;
          let startSearching = false;
          $('.container .row .col-lg-8 .card-body p').each(function () {
            let name = $(this).text().trim();
            if (name.includes(week + ' неделя'))
              startSearching = true;
            else if (startSearching) {
              if (!name || !name.length)
                return false;
              if (name === inst) {
                link = $(this).find('a').attr('href');
                return false;
              }
            }
          });

          // Нет расписания
          if (!link) {
            console.error('Не найдена ссылка на сайте ТГУ');
            return resolve([]);
          }

          // Загрузка файла расписания
          const URL = 'https://www.tltsu.ru' + encodeURI(link).replace(/%25/g, '%');
          request(URL, { encoding: null }, function (err, res, data) {

            // Ошибка загрузки файла
            if (err || res.statusCode !== 200) {
              console.error(err);
              return resolve([]);
            }

            // Формируемая таблица
            var schedule = [];
            const weekStart = today.clone().startOf('week');
            for (let i = 0; i < 6; i++)
              schedule.push({ 'date': moment(weekStart).add(i, 'days').format('DD.MM.YYYY'), 'courses': [] });

            // Получение таблицы с расписанием для группы
            var wb = XLSX.read(data, { type: 'buffer' });
            let startSearching = false;
            let stopSearching = false;
            wb.SheetNames.forEach((course) => {
              if (!stopSearching) {
                $sheet = cheerio.load(XLSX.utils.sheet_to_html(wb.Sheets[course]));
                $sheet('body table tbody tr').each(function () { // каждая строка
                  const text = $sheet(this).text();
                  if (text === group)
                    startSearching = true;
                  else if (startSearching) {
                    if (text.match(/^\d-я/i)) {
                      let pairNum;
                      let dayNum = 0;

                      $(this).find('td').each(function () { // каждый столбец

                        let myhtml = $(this).html().replace(/<br\s?\/?>/gi, '\n'); // заменяет <br> на \n
                        let text = he.decode(myhtml);

                        let match = $(this).text().match(/(\d)-я/);
                        if (match) { // это номер пары
                          if (!pairNum)
                            pairNum = match[1];
                        } else {  // это предмет
                          if (text && dayNum < 6) {
                            var timeMatch = text.match(/\[(.*)\]/i);
                            var courseName = text.match(/^(.*)\s+\(([А-Я][А-Яа-я]*)\)/i);
                            var teaher = text.match(/([А-Я][А-Яа-я]+\s[А-Я]\.[А-Я]\.)\n/i);
                            var audience = text.match(/([А-Я][А-Яа-я]*(-\d+)*)\n/i);
                            var course = {
                              'pairNum': parseInt(pairNum),
                              'time': timeMatch && timeMatch.length > 1 ? timeMatch[1] : '',
                              'coursename': courseName && courseName.length > 1 ? courseName[1] : '',
                              'coursetype': courseName && courseName.length > 2 ? courseName[2] : '',
                              'teacher': teaher && teaher.length > 1 ? teaher[1] : '',
                              'audience': audience && audience.length > 1 ? audience[1] : ''
                            };
                            schedule[dayNum].courses.push(course);
                          }
                          dayNum++;
                        }
                      });
                    } else {
                      stopSearching = true;
                      return false;
                    }
                  }
                });
              }
            });

            resolve(schedule);
          });
        });
      });
    });
  };

  // Слияние двух таблиц в одну
  var mergeSchedules = (schTSU, schRos) => {

    let endMerge;
    for (let i = 0; i < schTSU.length; i++)
      if (schTSU[i].courses.length) {
        let found = schRos.find(el => el.date === schTSU[i].date);
        if (found) {

          // Слияние таблиц
          if (endMerge !== undefined && endMerge !== -1) {
            let newSch = schTSU.slice(0, endMerge + 1);
            schRos = newSch.concat(schRos);
            endMerge = -1; // завершение поиска
          }

          // Добавление инфы в таблицу с Росдистанта
          const schRosIndex = schRos.indexOf(found);
          for (let j = 0; j < schTSU[i].courses.length; j++) {
            let pair = schTSU[i].courses[j];
            let found = schRos[schRosIndex].courses
              .find(el => el.pairNum === pair.pairNum);
            if (found) {
              const schRosPair = schRos[schRosIndex].courses.indexOf(found);
              schRos[schRosIndex].courses[schRosPair].coursetype = pair.coursetype;
              schRos[schRosIndex].courses[schRosPair].time = pair.time;
            }
          }

        } else if (endMerge !== -1)
          endMerge = i;
      }

    // Незавершенное слияние
    if (endMerge !== undefined && endMerge !== -1) {
      let newSch = schTSU.slice(0, endMerge + 1);
      schRos = newSch.concat(schRos);
    }

    return schRos;
  };

  // Асинхронное получение расписания с Росдистант и сайта ТГУ
  var scheduleGetter = async () => {
    const schTSU = await getSchedule();
    if (!anotherGroup) {
      const schRos = await rosdistant();
      return callback(mergeSchedules(schTSU, schRos));
    }
    callback(schTSU);
  };

  scheduleGetter();

};
