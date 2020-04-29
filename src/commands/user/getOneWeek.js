const moment = require('moment-timezone'); // for working with dates
const puppeteer = require('puppeteer'); // for screenshotting html table

module.exports = function (param) {

  var bot = param.bot;
  var today = param.today;
  var chatId = param.chatId;
  var schedule = param.schedule;

  bot.sendMessage(chatId, 'Формирую расписание на \n' +
    '_' + moment(today).day(1).format('DD MMMM') + ' — ' + moment(today).day(6).format('DD MMMM') + '_', {
    parse_mode: 'markdown'
  });

  let html = require('../../helpers/schedule/tableGenerator')({
    today: today,
    withoutDay: param.withoutDay,
    user: param.user,
    schedule: schedule
  });

  (async () => {

    try {

      // Запуск браузера
      const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--window-size=1550,2000',
          '--start-maximized'
        ]
      });

      try {

        // Создание новой вкладки
        const page = await browser.newPage();
        await page.setViewport({
          width: 0,
          height: 0,
        });
        await page.setContent(html);
        await page.evaluateHandle('document.fonts.ready');
        await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' });

        // Определение размеров таблицы
        let sizes = await page.evaluate(() => {
          const $ = window.$;
          return [$('body table').width(), $('body table').height()];
        });

        const width = sizes[0] + 25;
        const height = sizes[1] + 25;

        // Установка поля зрения
        await page.setViewport({
          width: width,
          height: height,
          deviceScaleFactor: 1,
        });

        // Создание скриншота
        bot.sendPhoto(chatId, await page.screenshot(), {}, {
          filename: 'schedule',
          contentType: 'image/png',
        });

      } catch (err) {
        return bot.sendMessage(chatId,
          'Произошла ошибка при генерации таблицы расписания:\n' + err.message,
          { parse_mode: 'markdown' });
      } finally {
        await browser.close();
      }

    } catch (err) {
      return bot.sendMessage(chatId,
        'Не удалось запустить браузер',
        { parse_mode: 'markdown' });
    }

  })();
};