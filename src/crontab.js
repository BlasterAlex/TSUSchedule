const CronJob = require('cron').CronJob;
const moment = require('moment-timezone');
const logger = require('./helpers/logger');
const config = require('../config/config.json');

module.exports = function (bot) {

  // Обновлять имена пользователей каждую полночь 
  new CronJob('0 0 0 * * *', function () {

    console.log('Запушено обновление пользовательских имен');
    const fileName = 'cronjobs';

    // Получение текущей даты
    const datetime = moment()
      .tz(config.timeZone, true)
      .locale('ru')
      .format('DD MMM YYYY в h:mm:ss').capitalize();

    // Запись текущей даты в log-файл
    let text = 'Обновление имен пользователей ' + datetime + '\n';

    // Обновление имен 
    require('./commands/admin/updateNames')(bot, (t) => {
      text += t + '\n';
      logger.write(fileName, text);
    });

  }, null, true, config.timeZone);
};