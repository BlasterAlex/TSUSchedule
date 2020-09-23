const fs = require('fs'); // for working with files
const crypto = require('crypto');  // for password encryption
const puppeteer = require('puppeteer'); // for working with a virtual browser
const ENCRYPTION_KEY = // Must be 256 bits (32 characters)
  process.env.ENCRYPTION_KEY ||
  JSON.parse(fs.readFileSync('config/private.json')).ENCRYPTION_KEY;

const User = require('../../models/User');
const UserRepository = require('../../repositories/UserRepository');
const InstituteRepository = require('../../repositories/InstituteRepository');

function encrypt(password) {
  let iv = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(password);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(password) {
  let textParts = password.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);

  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

// Регистрация пользователя
var registrate = function (bot, chatId, data) {

  // Авторизация пользователя в системе
  const authorization = (sender) => {
    const config = require('../../../config/config.json');

    return new Promise(resolve => {
      UserRepository.find(chatId, user => {

        // Обработка данных
        if (user.length) {
          user = user[0];
          if (data.login) user.login = data.login;
          if (data.group) user.group = data.group;
          user.password = data.password ? data.password : (user.password ? decrypt(user.password) : '');
        } else
          user = data;

        // Проверка группы пользователя
        InstituteRepository.findByGroup(user.group, (inst) => {
          if (!inst) {
            bot.deleteMessage(chatId, sender.message_id);
            return bot.sendMessage(chatId, 'Мы не нашли вашу группу, пожалуйста, уточните данные\n\n' +
              fs.readFileSync('data/messages/registration.txt'), { parse_mode: 'markdown' });
          }

          // Запуск браузера
          (async () => {
            try {
              const browser = await puppeteer.launch({
                headless: true,
                defaultViewport: null,
                args: [
                  '--no-sandbox',
                  '--disable-setuid-sandbox'
                ]
              });

              const page = await browser.newPage();
              await page.goto(config.scheduleRosdistant, { waitUntil: ['networkidle0', 'domcontentloaded'] });

              try {

                // Авторизация пользователя в системе
                await page.evaluate(function (login, password) {
                  let inputs = document.querySelector('.loginform');
                  inputs.querySelector('#username').value = login;
                  inputs.querySelector('#password').value = password;
                  document.querySelector('#loginbtn').click();
                }, user.login, user.password);
                await page.waitForNavigation();

                // Ожидание завершения авторизации
                await new Promise((resolve) => {
                  const interval = async function () {
                    try {
                      const successful = await page.evaluate(() => {
                        return (!document.querySelector('.loginform') && document.querySelector('#page'))
                          || document.querySelector('.loginerrors');
                      });
                      if (successful)
                        resolve();
                      else
                        setTimeout(interval, 2000);
                    } catch (err) {
                      console.error(err);
                    }
                  };
                  setTimeout(interval, 2000);
                });

                // Проверка статуса авторизации
                const state = await page.evaluate(() => {
                  let error = document.querySelector('.loginerrors .error');
                  if (error && error.innerText === 'Неверный логин или пароль, попробуйте заново.')
                    return 'wrong user data';
                  else return 'ok';
                });

                // Ошибка авторизации
                switch (state) {
                  case 'wrong user data':
                    return bot.sendMessage(chatId,
                      'Неправильные данные для входа:\n' +
                      'Логин:  *' + user.login + '*\n' +
                      'Пароль: ' + '/showpassword',
                      { parse_mode: 'markdown' });
                }

                // Кэширование страницы
                UserRepository.setCookies(chatId, await page.cookies());

                // Завершение проверки пользователя Росдистант
                resolve();

              } catch (err) {
                return bot.sendMessage(chatId,
                  'Ошибка авторизации:\n' + err.message, { parse_mode: 'markdown' });
              } finally {
                browser.close();
              }
            } catch (err) {
              console.error(err);
              return bot.sendMessage(chatId,
                'Не удалось запустить браузер для получения расписания с Росдистант',
                { parse_mode: 'markdown' });
            } finally {
              bot.deleteMessage(chatId, sender.message_id);
            }
          })();

        });
      });
    });
  };

  // Проверка названия группы
  if (data.group && !data.group.match(/^[А-Яа-я]+-\d{4}[а-я]*$/))
    return bot.sendMessage(chatId, fs.readFileSync('data/messages/groupFormat.txt'),
      { parse_mode: 'markdown' });

  // Проверка данных
  bot.sendMessage(chatId, 'Проверка введённых данных, ожидайте...')
    .then((sender) => {
      authorization(sender).then(() => {

        // Шифрование пароля
        if (data.password)
          data.password = encrypt(data.password);

        // Добавление нового или изменение старого пользователя
        User.findOneAndUpdate({ _id: chatId }, data, { upsert: true }, function (err, res) {
          if (err) return console.error(err);

          if (res)
            bot.sendMessage(chatId, 'Данные успешно обновлены');
          else
            bot.sendMessage(chatId, 'Данные успешно добавлены');

          require('../../commands/user/whoami')(bot, chatId);
        });

      });
    });

};

// Получение данных пользователя Росдистант
var getRosdistant = function (bot, chatId, callback) {
  UserRepository.find(chatId, function (user) {

    if (!user.length)
      return bot.sendMessage(chatId, 'Кто вы, я вас не знаю... ' +
        fs.readFileSync('data/messages/registration.txt'), {
        parse_mode: 'markdown'
      });

    if (!user[0].login || !user[0].password)
      return bot.sendMessage(chatId, 'Вы не зарегистрированы. ' +
        fs.readFileSync('data/messages/registration.txt'), {
        parse_mode: 'markdown'
      });

    callback({ login: user[0].login, password: decrypt(user[0].password) });

  });
};

// Отобразить пароль пользователя
var showPassword = function (bot, chatId) {
  getRosdistant(bot, chatId, function (user) {
    bot.sendMessage(chatId, 'Ваш пароль от Росдистант: *' + user.password + '*', {
      parse_mode: 'markdown'
    });
  });
};

module.exports = { registrate, getRosdistant, showPassword }; 