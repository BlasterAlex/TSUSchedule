const fs = require('fs'); // for working with files
const cheerio = require('cheerio'); // for html parsing
const request = require('request'); // for getting html
const XLSX = require('xlsx'); // for reading xls
const he = require('he'); // for decoding html entities
const moment = require('moment-timezone'); // for working with dates
const puppeteer = require('puppeteer'); // for working with a virtual browser

const config = require('../../../config/config.json');
const UserRepository = require('../../repositories/UserRepository');
const InstituteRepository = require('../../repositories/InstituteRepository');
const adminId = process.env.ADMIN_CHAT_ID || require('../../../config/private.json').ADMIN_CHAT_ID;

module.exports = function (param, callback) {

  const bot = param.bot;
  const user = param.user;
  const chatId = user._id;
  const cookies = user.cookies;
  const today = param.today;
  const week = param.week;
  const group = user.group;
  const silenceMode = param.silenceMode;
  const anotherGroup = param.anotherGroup;

  // Страница Росдистант
  var page;

  // Проверка статуса авторизации на Росдистант
  async function checkLogIn() {
    try {

      // Установить сохраненные куки
      if (cookies)
        await page.setCookie(...cookies);

      // Перейти на страницу расписания
      await page.goto(config.scheduleRosdistant, { waitUntil: ['networkidle0', 'domcontentloaded'], timeout: 0 });

      // Проверить статус пользователя в системе
      return await page.evaluate(() => {
        return (!document.querySelector('.loginform')) ? true : false;
      });

    } catch (err) {
      page.browser().close();
      return bot.sendMessage(chatId,
        'Ошибка авторизации:\n' + err.message, { parse_mode: 'markdown' });
    }
  }

  // Авторизация пользователя в системе
  var authorization = resolve => {
    const foo = (sender) => {
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
                  console.error(err);
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
            UserRepository.setCookies(chatId, await page.cookies());

            // Получение расписания с сайта
            getScheduleRosdistant(resolve);

          } catch (err) {
            page.browser().close();
            return bot.sendMessage(chatId,
              'Ошибка авторизации:\n' + err.message, { parse_mode: 'markdown' });
          } finally {
            if (sender)
              bot.deleteMessage(chatId, sender.message_id);
          }
        })();

      });
    };
    if (silenceMode)
      return foo();
    bot.sendMessage(chatId, 'Авторизация в системе Росдистант, ожидайте...').then(foo);
  };

  // Получение расписания с страницы пользователя
  var getScheduleRosdistant = resolve => {
    const bar = (sender) => {
      (async () => {
        try {

          // Добавление JQuery для парсинга
          await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });

          // Разбор расписания
          let schedule = await page.evaluate((pairNumbers) => {
            const $ = window.$;
            var array = [];

            // Проверка наличия блока расписания на странице
            if (!$('.mycourses').length)
              return;

            // Получение расписания
            $('.mycourses .coursebox').each(function () {
              const html = $(this).html();
              const dateStr = html.match(/<b>(\d{1,2}:\d{2})\s+(\d{1,2}.\d{2}.\d{4})/);

              if (dateStr && dateStr.length) {
                const time = dateStr ? dateStr[1] : '';
                const date = dateStr ? dateStr[2] : '';

                const teacher = html.match(/<b>Преподаватель:<\/b>\s*([^<]+)<br>/);
                const audience = html.match(/<b>Аудитория:<\/b>\s*([^<]+)<br>/);
                const link = html.match(/<a href="([^"]+)">/);

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
                  'coursename': $(this).find('.coursename a').text().trim(),
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
          }, config.pairNumbers);

          // Работа с полученным расписанием
          if (chatId == adminId) {
            bot.sendPhoto(chatId, await page.screenshot(), {}, {
              filename: 'schedule',
              contentType: 'image/png',
            });
            let bodyHTML = await page.evaluate(() => document.body.innerHTML);
            bot.sendDocument(chatId, Buffer.from(bodyHTML, 'utf8'), {}, { fileName: 'index.html' });
          }

          // Не удалось перейти на страницу с расписанием
          if (schedule != undefined)
            resolve(schedule);
          else
            bot.sendMessage(chatId, fs.readFileSync('data/messages/someRosdistantError.txt'), { parse_mode: 'markdown' });

        } catch (err) {
          console.error(err);
        } finally {
          page.browser().close();
          if (sender)
            bot.deleteMessage(chatId, sender.message_id);
        }
      })();
    };
    if (silenceMode)
      return bar();
    bot.sendMessage(chatId, 'Получение расписания, ожидайте...').then(bar);
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
          var $ = cheerio.load(res.body, { decodeEntities: false });

          // Поиск ссылки на расписание
          let link;
          let startSearching = false;
          $('.container .row .col-lg-8 .card-body').children()
            .filter(function () { return $(this).text().trim().length; })
            .each(function () {
              let name = $(this).text().trim();

              // Поиск начала недели
              if (!startSearching && name.replace(/\s+/g, '').match(new RegExp(week + 'неделя'))) {
                startSearching = true;
              }

              if (startSearching) {

                // Неделя закончилась, ссылка не найдена
                if (name.replace(/\s+/g, '').match(/\d+неделя/) &&
                  !name.replace(/\s+/g, '').match(new RegExp(week + 'неделя')))
                  return false;

                // Если сам блок является ссылкой
                if ($(this).attr('href') && name === inst) {
                  link = $(this).attr('href');
                  return false;
                }

                // Поиск ссылок
                let matches;
                let regExp = /<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g;

                // Если есть ссылки в дочерних блоках
                /* eslint-disable no-cond-assign */
                while (matches = regExp.exec($(this).html())) {
                  const name = matches[2];
                  if (name === inst) {
                    link = matches[1];
                    return false;
                  }
                }

              }
            });

          // Нет расписания
          if (!link) {
            console.error('Не найдена ссылка на сайте ТГУ (' + week + ' неделя)');
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
                    if (text.match(/^\d-я/)) {
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
                          if (text && text.length && dayNum < 6) {
                            // console.log(text);
                            var courseName = text.match(/^(.*)\s+\(([А-Я][А-Яа-я]*)\)$/m);
                            var teaher = text.match(/^([А-Я][a-zA-Zа-яА-ЯёЁ]+\s([А-Я]\.){1,2})$/m);
                            var audience = text.match(/^([А-Я][А-Яа-я]*(-\d+)*)$/m);
                            var timeMatch = text.match(/^\s*\[(.*)\]\s*$/m);
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
    // if (!anotherGroup) {
    //   const schRos = await rosdistant();
    //   return callback(mergeSchedules(schTSU, schRos));
    // }
    callback(schTSU);
  };

  scheduleGetter();

};
