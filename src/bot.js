const fs = require('fs'); // for working with files
const moment = require('moment-timezone'); // for working with dates

const TelegramBot = require('node-telegram-bot-api');
const config = JSON.parse(fs.readFileSync('config/config.json'));

// Настройки подключения бота
var bot;
if (process.env.TELEGRAM_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true, });
} else {
  const configPrivate = JSON.parse(fs.readFileSync('config/private.json'));
  bot = new TelegramBot(configPrivate.TELEGRAM_TOKEN, {
    polling: true,
    request: {
      agentClass: require('socks5-https-client/lib/Agent'),
      agentOptions: {
        socksHost: 'localhost',
        socksPort: '9050'
      }
    }
  });
}

// Отслеживание действий пользователя
// module.exports.listener = function (bot) {

// Обработка сообщений
bot.onText(/(.+)/, (msg) => {
  const chatId = msg.chat.id;

  // Разбор команд
  var commands = require('./helpers/parsing/text')(bot, chatId, msg);
  if (commands.exit) return;

  // Запуск основного алгоритма
  run(chatId, commands);
});

// Обработка кнопок ответа
bot.on('callback_query', (msg) => {
  require('./helpers/parsing/callbackQuery')(bot, msg);
});

// Вывод ошибок
bot.on('polling_error', (err) => console.log(err));

// Запуск основного алгоритма
var run = function (chatId, commands) {

  // Сдвиг текущего дня
  var today = moment().tz(config.timeZone, true).locale(config.locale);
  today.add(commands.fromNow, 'days');

  // Выполнение команд пользователя
  require('./repositories/UserRepository').find(chatId, function (user) {

    // Пользователь не зарегистрировался
    if (user.length === 0)
      return bot.sendMessage(chatId, 'Вы не зарегистрированы в боте. ' +
        fs.readFileSync('data/messages/registration.txt'), {
        parse_mode: 'markdown'
      });

    // Поиск института пользователя
    require('./repositories/InstituteRepository').findByName(user[0].institute, function (inst) {

      if (!config.rosdistant && inst.length === 0)
        return bot.sendMessage(chatId, 'Не могу найти институт *"' + user[0].institute + '"*.\n' +
          'Пожалуйста, выполните повторную регистрацию.\n' +
          fs.readFileSync('data/messages/instituteList.txt'), {
          parse_mode: 'markdown'
        });

      // Формирование объекта для отправки
      let data = { bot: bot, user: user[0], };
      if (!config.rosdistant) {
        data.inst = inst[0];
        data.today = today;
        data.week = today.diff(moment(config.academYBegin, 'DD/MM/YYYY'), 'weeks') + 1;
      }

      // Получение расписания с сайта
      require('./helpers/schedule/scheduleGetter')(data, function (schedule) {

        // Вывод ошибки
        if (!config.rosdistant) {
          let isEmpty = a => Array.isArray(a) && a.every(isEmpty);
          if (isEmpty(schedule))
            return bot.sendMessage(chatId, 'Я не смог найти расписание для группы *"' +
              user[0].group + '"*.\n\n' +
              fs.readFileSync('data/messages/whoami.txt'), {
              parse_mode: 'markdown'
            });
        }

        // Требуется расписание на один день
        if (commands.onWeek === false)
          return require('./commands/user/getOneDay')({
            bot: bot,
            chatId: chatId,
            today: today,
            schedule: !config.rosdistant ?
              schedule[today.day() - 1] :
              schedule.filter(day => day.date === today.format('DD.MM.YYYY'))
          });

        // Требуется расписание на неделю
        require('./commands/user/getOneWeek')({
          bot: bot,
          chatId: chatId,
          today: today,
          withoutDay: commands.withoutDay,
          user: user[0],
          schedule: schedule
        });

      });
    });
  });

};

module.exports = { bot, run };