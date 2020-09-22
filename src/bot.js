const moment = require('moment-timezone');
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/config.json');

// Настройки подключения бота
var bot;
if (process.env.TELEGRAM_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
  bot = new TelegramBot(require('../config/private.json').TELEGRAM_TOKEN, {
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
console.log('Bot server started in the ' + (process.env.NODE_ENV || 'development') + ' mode');

// Пользовательские уведомления
require('./helpers/notify').createCronJobs();

// Обработка сообщений
bot.onText(/(.+)/, (msg) => {
  const chatId = msg.chat.id;

  // Разбор команд
  const commands = require('./helpers/parsing/text')(bot, chatId, msg);
  if (commands.exit) return;

  // Запуск основного алгоритма
  run(chatId, commands);
});

// Обработка кнопок ответа
bot.on('callback_query', (msg) => {
  require('./helpers/parsing/callbackQuery')(bot, msg);
});

// Вывод ошибок
bot.on('polling_error', (err) => console.error(err));

// Получение расписания с сайта
const scheduleGetter = (data, callback) => {
  require('./helpers/schedule/scheduleGetter')(data, callback);
};

// Запуск основного алгоритма
const run = (chatId, commands) => {

  // Сегодня
  var today = moment().tz(config.timeZone, true).locale(config.locale);

  // Сдвиг текущей недели
  if (commands.onWeek && (today.day() === 6 || today.day() === 0)) {
    commands.fromNow = commands.fromNow === 0 ? commands.fromNow + 2 : commands.fromNow;
    commands.withoutDay = true;
  }

  // Сдвиг текущего дня
  today.add(commands.fromNow, 'days');

  // Начало учебного года
  const academYBegin = moment(config.academYBegin, 'DD/MM/YYYY')
    .tz(config.timeZone, true)
    .locale(config.locale)
    .startOf('week').isoWeekday(1);

  // Выполнение команд пользователя
  require('./repositories/UserRepository').find(chatId, function (user) {

    // Пользователь не зарегистрировался
    if (user.length === 0)
      return bot.sendMessage(chatId, 'Вы не зарегистрированы в боте. ' +
        fs.readFileSync('data/messages/registration.txt'), {
        parse_mode: 'markdown'
      });

    if (commands.anotherGroup)
      user[0].group = commands.anotherGroup;

    // Формирование объекта для отправки
    let data = { bot: bot, user: user[0] };
    data.today = today;
    data.silenceMode = commands.silenceMode;
    data.anotherGroup = commands.anotherGroup;
    data.week = moment(today).startOf('week').isoWeekday(1).week() - academYBegin.week() + 1;

    // Получение расписания с сайта
    scheduleGetter(data, schedule => {

      // Требуется расписание на один день
      if (commands.onWeek === false)
        return require('./commands/user/getOneDay').allDay({
          bot: bot,
          chatId: chatId,
          today: today,
          schedule: schedule.filter(day => day.date === today.format('DD.MM.YYYY'))
        });

      // Требуется расписание на неделю
      require('./commands/user/getOneWeek')({
        bot: bot,
        chatId: chatId,
        user: user[0],
        today: today,
        withoutDay: commands.withoutDay,
        schedule: schedule
      });

    });
  });

};

module.exports = { bot, run, scheduleGetter };
