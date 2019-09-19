const moment = require('moment-timezone'); // for working with dates
const puppeteer = require('puppeteer'); // for screenshotting html table

module.exports = function (param) {

  var bot = param.bot;
  var chatId = param.chatId;
  var schedule = param.schedule;

  bot.sendMessage(chatId, 'Формирую расписание на \n_'
    + moment(param.today).day(1).locale('ru').format('DD MMMM') + ' — ' +
    moment(param.today).day(schedule.length).locale('ru').format('DD MMMM') + '_', {
    parse_mode: 'markdown'
  });

  let html = require('../utils/tableGenerator')({
    today: param.today,
    withoutDay: param.withoutDay,
    user: param.user,
    schedule: schedule
  });
  (async () => {

    const width = 1550;
    const height = 1350;

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--window-size=${width},${height}`
      ]
    });
    const page = await browser.newPage();

    await page.setViewport({
      width: width,
      height: height,
      deviceScaleFactor: 1,
    });

    await page.setContent(html);
    bot.sendPhoto(chatId, await page.screenshot(), {}, {
      filename: 'schedule',
      contentType: 'image/png',
    });
    await browser.close();
  })();
}