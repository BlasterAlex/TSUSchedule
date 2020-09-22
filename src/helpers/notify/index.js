const fs = require('fs');
const logger = require('../logger');
const CronJob = require('cron').CronJob;
const moment = require('moment-timezone');
const config = JSON.parse(fs.readFileSync('config/config.json'));
const UserRepository = require('../../repositories/UserRepository');

// Список cron-задач
var cronJobs = new Map();

// Добавить минуты к указанному времени
const addMinutes = (time, minsToAdd) => {
  const D = (J) => { return (J < 10 ? '0' : '') + J; };
  const piece = time.split(':');
  const mins = piece[0] * 60 + +piece[1] + +minsToAdd;
  return D(mins % (24 * 60) / 60 | 0) + ':' + D(mins % 60);
};

// Получение строки с текущей датой (для ведения лога)
const dateNow = () => {
  return moment()
    .tz(config.timeZone, true)
    .locale('ru')
    .format('DD MMM YYYY в h:mm:ss').capitalize();
};

// Вывод расписания на день
const allDay = (chatId) => {
  var commands = { onWeek: false, fromNow: 0, silenceMode: true };
  var today = moment().tz(config.timeZone, true).locale(config.locale);
  if (today.hour() >= 17) {
    today.add(1, 'days');
    commands.fromNow = 1;
  }
  if (today.day() !== 6 || today.day() !== 0)
    require('../../bot').run(chatId, commands);
};

// Вывод расписания одной пары по таймеру
const beforeLesson = (bot, chatId, time, delay) => {

  // Сегодня
  const today = moment().tz(config.timeZone, true).locale(config.locale);

  // Начало учебного года
  const academYBegin = moment(config.academYBegin, 'DD/MM/YYYY')
    .tz(config.timeZone, true)
    .locale(config.locale)
    .startOf('week').isoWeekday(1);

  if (today.day() !== 6 || today.day() !== 0)
    require('../../repositories/UserRepository').find(chatId, function (user) {
      if (user.length === 0)
        return console.log(`Пользователь ${chatId} не зарегистрировался в боте`);

      // Формирование объекта для отправки
      let data = { bot: bot, user: user[0] };
      data.today = today;
      data.silenceMode = true;
      data.anotherGroup = false;
      data.week = moment(today).startOf('week').isoWeekday(1).week() - academYBegin.week() + 1;

      // Получение расписания с сайта
      require('../../bot').scheduleGetter(data, schedule => {
        const day = schedule.find(day => day.date === today.format('DD.MM.YYYY'));
        const pair = day.courses.find(pair => pair.time.includes(time));
        console.log(pair);
        if (pair) {
          bot.sendMessage(chatId, `*${delay} мин до пары*\n\n` +
            require('../../commands/user/getOneDay').onePair(pair), {
            parse_mode: 'markdown'
          });
        }
      });
    });

};

// Функция для задачи вывода расписания на день
const everyDay = (chatId, key, time) => {
  const tmatch = time.match(/(\d{1,2}):(\d{2})/);
  const hours = tmatch[1];
  const minutes = tmatch[2];
  let jobs = cronJobs.get(chatId.toString());

  // Удаление текущей задачи
  if (jobs.has(key)) {
    jobs.get(key).stop();
    jobs.delete(key);
    console.log(`${chatId}: overwrited notify "${key}"`);
  }

  // Установка новой задачи
  jobs.set(key, new CronJob(`${minutes} ${hours} * * *`, () => allDay(chatId), null, true, config.timeZone));
};

// Функция для задачи вывода расписания пар по таймеру
const beforeEachLesson = (bot, chatId, key, time) => {
  const ntime = time.match(/(-{0,1}\d+)/)[1];
  let jobs = cronJobs.get(chatId.toString());

  // Удалениче текущих задач
  if (jobs.has(key)) {
    let tabs = jobs.get(key);
    let i = tabs.length;
    console.log(`${chatId}: overwrited notify "${key}" (${i} notifications)`);
    while (--i >= 0) {
      tabs[i].stop();
      tabs.splice(i, 1);
    }
    jobs.delete(key);
  }

  // Установка новых задач
  let cj = [];
  config.pairNumbers.forEach(t => {
    const cronTime = addMinutes(t, -ntime);
    const tmatch = cronTime.match(/(\d{1,2}):(\d{2})/);
    const hours = tmatch[1];
    const minutes = tmatch[2];
    cj.push(new CronJob(`${minutes} ${hours} * * *`, () => beforeLesson(bot, chatId, t, ntime), null, true, config.timeZone));
  });
  jobs.set(key, cj);
};

// Создание cron-задач на основе информации из БД (запускается при старте сервака)
const createCronJobs = (bot) => {
  UserRepository.getAll(users => {
    nusers = users.filter(user => user.notifications);
    let left = nusers.length;

    // Проход по пользовательским задачам
    new Promise((resolve) => {
      nusers.forEach((user) => {

        // Идентификатор пользователя
        const chatId = user._id;

        // Создание объекта для пользователя
        if (!cronJobs.has(chatId.toString()))
          cronJobs.set(chatId.toString(), new Map());

        // Получение списка задач пользователя
        const notifications = user.notifications;
        let nleft = notifications.size;

        // Создание cron-задач
        new Promise((res) => {
          notifications.forEach((time, key) => {
            if (key === 'every_day')
              everyDay(chatId, key, time);
            else
              beforeEachLesson(bot, chatId, key, time);
            if (--nleft === 0) res();
          });
          if (nleft === 0) res();
        }).then(() => { if (--left === 0) resolve(); });

      });
      if (left === 0) resolve();
    }).then(() => console.log('User notifications installed successfully'));
  });
};

// Создание уведомления (запускается пользователем)
const createNotify = (param) => {
  const bot = param.bot;
  const chatId = param.chatId;
  const notify = param.notify;

  // Разбор входных данных
  let time = notify.match(/(\d{1,2}:\d{2})/);
  let key = 'every_day';
  if (!time) {
    time = notify.match(/(-{0,1}\d+)/);
    key = 'before_each_lesson';
    if (!time)
      return bot.sendMessage(chatId, fs.readFileSync('data/messages/notify.txt'), {
        parse_mode: 'markdown'
      });
  }
  time = time[1];

  UserRepository.find(chatId, (user) => {
    let notifications = user[0].notifications;
    let lastNotify;
    if (!notifications)
      notifications = new Map();
    else if (notifications.has(key)) {
      const val = notifications.get(key);
      if (val == time)
        return bot.sendMessage(chatId, 'Такое уведомление уже установлено');
      lastNotify = { key: key, value: val };
    }

    // Добавление информации об уведомлении в БД
    notifications.set(key, time);
    UserRepository.setNotify(chatId, notifications);

    // Создание объекта для пользователя
    if (!cronJobs.has(chatId.toString()))
      cronJobs.set(chatId.toString(), new Map());

    // Создание cron-задачи
    if (key === 'every_day')
      everyDay(chatId, key, time);
    else
      beforeEachLesson(bot, chatId, key, time);

    bot.sendMessage(chatId, 'Уведомление успешно ' + (lastNotify ? 'обновлено' : 'создано') + ':\n\n' +
      '*' + (key === 'every_day' ? `каждый день в ${time}` : `за ${time} мин до пары`) + '*' +
      (lastNotify ? '\n\nСтарое значение уведомления:\n\n' +
        '_' + (lastNotify.key === 'every_day' ? `каждый день в ${lastNotify.value}` : `за ${lastNotify.value} мин до пары`) + '_' : ''), {
      parse_mode: 'markdown'
    });

  });
};

// Получить список уведомлений (запускается пользователем)
const getList = (bot, chatId) => {
  if (cronJobs.has(chatId.toString()))
    UserRepository.find(chatId, (user) => {
      const notifications = user[0].notifications;
      const jobs = cronJobs.get(chatId.toString());

      message = '';
      for (const entry of notifications.entries()) {
        if (jobs.has(entry[0]))
          message += '- ' + (entry[0] === 'every_day' ? `каждый день в ${entry[1]}` : `за ${entry[1]} мин до пары`) + '\n';
      }

      bot.sendMessage(chatId, message.length ? `*Ваши уведомления*:\n\n${message}\n` +
        'Для удаления всех уведомлений введите команду /delnotify' :
        ('Вы не создали ни одно уведомление\n\n' + fs.readFileSync('data/messages/notify.txt')), {
        parse_mode: 'markdown'
      });
    });
};

// Удалить уведомления пользователя (запускается пользователем)
const clearList = (bot, chatId) => {
  if (cronJobs.has(chatId.toString()))
    UserRepository.find(chatId, (user) => {
      const notifications = user[0].notifications;
      const jobs = cronJobs.get(chatId.toString());
      const empty = jobs.size === 0;
      if (!empty) {
        for (const entry of notifications.entries())
          if (jobs.has(entry[0])) {
            let tabs = jobs.get(entry[0]);
            if (Array.isArray(tabs)) {
              let i = tabs.length;
              console.log(`${chatId}: removed notify "${entry[0]}" (${i} notifications)`);
              while (--i >= 0) {
                tabs[i].stop();
                tabs.splice(i, 1);
              }
              jobs.delete(entry[0]);
            } else {
              tabs.stop();
              jobs.delete(entry[0]);
              console.log(`${chatId}: removed notify "${entry[0]}"`);
            }
          }
        UserRepository.setNotify(chatId, new Map());
      }
      bot.sendMessage(chatId, !empty ? 'Все уведомления были успешно удалены' :
        ('Вы не создали ни одно уведомление\n\n' + fs.readFileSync('data/messages/notify.txt')), {
        parse_mode: 'markdown'
      });
    });
};

module.exports = { createCronJobs, createNotify, getList, clearList };