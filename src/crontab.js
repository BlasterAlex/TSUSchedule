const fs = require('fs'); // for working with files
const moment = require('moment-timezone'); // for working with dates

var CronJob = require('cron').CronJob; // for running scheduled commands
var config = JSON.parse(fs.readFileSync('config/config.json'));

module.exports = function (bot) {
  // Обновлять имена пользователей каждую полночь 
  new CronJob('0 0 0 * * *', function () {

    console.log('Запушено обновление пользовательских имен');
    let fileName = 'log/cronjobs';

    // Контроль макс размера log-файла
    if (fs.existsSync(fileName)) {

      // Пророверка размера log-файла
      let stats = fs.statSync(fileName);
      var fileSizeInMegabytes = stats['size'] / 1000000.0;

      // Удаление, если файл слишком большой
      if (fileSizeInMegabytes > 10)
        fs.unlinkSync(fileName);
    }

    // Получение текущей даты
    let datetime = moment()
      .tz(config.timeZone, true)
      .locale('ru')
      .format('DD MMM YYYY в h:mm:ss').capitalize();

    // Запись текущей даты в log-файл
    fs.appendFileSync(fileName, 'Обновление имен пользователей ' + datetime + '\n');

    // Обновление имен 
    require('./commands/admin/updateNames')(bot, (text) => {
      fs.appendFileSync(fileName, text + '\n');
    });

  }, null, true, config.timeZone);
};