const moment = require('moment-timezone'); // for working with dates
const puppeteer = require('puppeteer'); // for screenshotting html table

var config = JSON.parse(require('fs').readFileSync('config/config.json'));

module.exports = function (param) {

  var bot = param.bot;
  var today = param.today;
  var user = param.user;
  var group = param.group;
  var chatId = user.chatId;

  let URL = config.scheduleURL_DE;
  var dateStr = moment(today).format('DD.MM.YYYY');

  (async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 926 });
    await page.goto(URL);

    // Выбор даты расписания
    await page.evaluate(function (date) {
      let dialog = document.querySelector('#parameterDialog .dialogBackground');
      dialog.querySelector('#date_beg').value = date;
      dialog.querySelector('#parameterDialogokButton').click();
    }, dateStr);

    // Ожидание завершения загрузки расписания
    await new Promise((resolve) => {
      const interval = async function () {
        let waiting = await page.evaluate(() => { return document.querySelector('#progressBar').style.display; });
        if (waiting !== 'none') {
          setTimeout(interval, 2000);
        } else {
          resolve();
        }
      };
      setTimeout(interval, 2000);
    });

    await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });

    // Проверка наличия таблицы расписания
    let hasSchedule = await page.evaluate(function () {
      const $ = window.$;
      return $.trim($('#Document').html()) != '';
    });

    console.log(hasSchedule);

    // Разбор расписания
    let res = await page.evaluate(function (group) {
      const $ = window.$;
      var array = [];
      $('#Document table table tr td [id*=\'__bookmark\'] tr tbody:contains(\'' + group + '\')').each(function () {
        array.push([$(this).closest('.style_4').index(), $(this).html().replace(/\t/g, '')]);
      });
      return array;
    }, group);

    if (res.length) {
      console.log(res);
    }

    bot.sendPhoto(chatId, await page.screenshot(), {}, {
      filename: 'schedule',
      contentType: 'image/png',
    });

    // require('fs').writeFileSync('test.html', data);
  })();
};