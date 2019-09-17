const fs = require('fs'); // for working with files
const moment = require('moment-timezone'); // for working with dates

var config = JSON.parse(fs.readFileSync('config/config.json'));

module.exports = function (bot) {
  bot.onText(/(.+)/, (msg) => {
    const chatId = msg.chat.id;
    const messages = msg.text.split(' ');
    var today = moment().tz(config.timeZone, true);

    // Разбор команд
    var commands = require('./utils/comParser')(bot, chatId, messages);
    var day = commands.day;

    if (commands.exit) return;

    // Корректная смена недели
    if (day <= 0) {
      day = 6;
      week--;
    } else if (day > 6) {
      day = 1;
      week++;
    }
    // Установка даты для вывода
    let distance = (day + 7 - today.day()) % 7;
    today.add(distance, 'days');

    // Регистрация
    if (commands.registration !== false)
      return require('./commands/registration')(bot, chatId, messages.slice(commands.registration + 1));

    // Выполнение команд пользователя
    require('./repositories/UserRepository').findByChatId(chatId, function (user) {

      // Пользователь не зарегистрировался
      if (user.length === 0)
        return bot.sendMessage(chatId, 'Вы не зарегистрированы в боте. ' +
          fs.readFileSync('data/messages/registration.txt'), {
          parse_mode: 'markdown'
        });

      // Получение расписания с сайта
      require('./utils/scheduleGetter')({
        bot: bot,
        user: user[0],
        today: today
      }, function (schedule) {

        // Требуется расписание на один день
        if (commands.onWeek === false)
          return require('./commands/getOneDay')({
            bot: bot,
            chatId: chatId,
            today: today,
            schedule: schedule[day - 1]
          });

        // Требуется расписание на неделю
        require('./commands/getOneWeek')({
          bot: bot,
          chatId: chatId,
          today: today,
          user: user[0],
          schedule: schedule
        });
      });
    });
  });
}