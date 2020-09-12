const moment = require('moment-timezone'); // for working with dates
const puppeteer = require('puppeteer'); // for screenshotting html table

module.exports = function (param) {

  var bot = param.bot;
  const chatId = param.chatId;
  const schedule = param.schedule;
  const today = moment(param.today).startOf('week').isoWeekday(1);

  let dates = moment(today).day(1).format('DD MMMM') + ' - ' + moment(today).day(6).format('DD MMMM');
  bot.sendMessage(chatId, 'Формирую расписание на \n' + '_' + dates + '_', { parse_mode: 'markdown' })
    .then(function (sender) {
      const messageId = sender.message_id;

      const html = require('../../helpers/schedule/tableGenerator')({
        today: today,
        withoutDay: param.withoutDay,
        user: param.user,
        schedule: schedule
      });

      if (!html) {
        bot.deleteMessage(chatId, messageId);
        return bot.sendMessage(chatId, '*' + dates + '*\n' + 'Пустая неделя', { parse_mode: 'markdown' });
      }

      // Формирование изображения таблицы
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

            // Установка размеров скриншота
            await page.setViewport({
              width: width,
              height: height,
              deviceScaleFactor: 1,
            });

            // Отправка скриншота
            bot.sendPhoto(chatId, await page.screenshot(), { caption: dates }, {
              filename: 'schedule',
              contentType: 'image/png',
            });

          } catch (err) {
            return bot.sendMessage(chatId,
              'Произошла ошибка при генерации таблицы расписания:\n' + err.message,
              { parse_mode: 'markdown' });
          } finally {
            bot.deleteMessage(chatId, messageId);
            await browser.close();
          }

        } catch (err) {
          console.error(err);
          bot.deleteMessage(chatId, messageId);
          return bot.sendMessage(chatId,
            'Не удалось запустить браузер',
            { parse_mode: 'markdown' });
        }

      })();

    });
};