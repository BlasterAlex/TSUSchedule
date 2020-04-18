const fs = require('fs'); // for working with files
const moment = require('moment-timezone'); // for working with dates

var config = JSON.parse(fs.readFileSync('config/config.json'));

module.exports = function (bot) {

  // Обработка сообщений
  bot.onText(/(.+)/, (msg) => {
    const chatId = msg.chat.id;

    // Разбор команд
    var commands = require('./utils/parsing/text')(bot, chatId, msg);
    if (commands.exit) return;

    // Запуск основного алгоритма
    run(bot, chatId, commands);

  });

  // Обработка кнопок ответа
  bot.on('callback_query', (msg) => {
    require('./utils/parsing/callbackQuery')(bot, msg);
  });

};

// Запуск основного алгоритма
function run(bot, chatId, commands) {

  // Сдвиг текущего дня
  var today = moment().tz(config.timeZone, true);
  today.add(commands.fromNow, 'days');

  // Выполнение команд пользователя
  require('./repositories/UserRepository').findByChatId(chatId, function (user) {

    // Пользователь не зарегистрировался
    if (user.length === 0)
      return bot.sendMessage(chatId, 'Вы не зарегистрированы в боте. ' +
        fs.readFileSync('data/messages/registration.txt'), {
        parse_mode: 'markdown'
      });

    // Поиск института пользователя
    require('./repositories/InstituteRepository').findByName(user[0].institute, function (inst) {

      if (inst.length === 0)
        return bot.sendMessage(chatId, 'Не могу найти институт *"' + user[0].institute + '"*.\n' +
          'Пожалуйста, выполните повторную регистрацию.\n' +
          fs.readFileSync('data/messages/instituteList.txt'), {
          parse_mode: 'markdown'
        });

      if (config.DE_mode == 'active') {
        require('./utils/shedule/scheduleGetterDE')({
          bot: bot,
          user: user[0],
          group: user[0].group,
          today: today,
        });
        return bot.sendMessage(chatId, 'Дистанционка в работе', { parse_mode: 'markdown' });
      }

      // Получение расписания с сайта
      require('./utils/shedule/scheduleGetter')({
        bot: bot,
        user: user[0],
        inst: inst[0],
        today: today,
        week: today.diff(moment(config.academYBegin, 'DD/MM/YYYY'), 'weeks') + 1
      }, function (schedule) {

        let isEmpty = a => Array.isArray(a) && a.every(isEmpty);
        if (isEmpty(schedule))
          return bot.sendMessage(chatId, 'Я не смог найти расписание для группы *"' +
            user[0].group + '"*.\n\n' +
            fs.readFileSync('data/messages/whoami.txt'), {
            parse_mode: 'markdown'
          });

        // Требуется расписание на один день
        if (commands.onWeek === false)
          return require('./commands/user/getOneDay')({
            bot: bot,
            chatId: chatId,
            today: today,
            schedule: schedule[today.day() - 1]
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
}