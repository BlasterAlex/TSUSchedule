const fs = require('fs'); // for working with files
const crypto = require('crypto');  // for password encryption
const request = require('request'); // for getting html
const cheerio = require('cheerio'); // for html parsing

const config = require('../../../config/config.json');
const ENCRYPTION_KEY = // Must be 256 bits (32 characters)
  process.env.ENCRYPTION_KEY ||
  JSON.parse(fs.readFileSync('config/private.json')).ENCRYPTION_KEY;

const User = require('../../models/User');
const UserRepository = require('../../repositories/UserRepository');

// Массив открытых страниц пользователей
var userPages = [];

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
var registrate = function (bot, chatId, user) {

  // Проверка института
  require('../../repositories/InstituteRepository').findByName(user.institute, function (inst) {

    if (user.institute && inst.length === 0)
      return bot.sendMessage(chatId, 'Не могу найти институт *"' + user.institute + '"*.\n' +
        fs.readFileSync('data/messages/instituteList.txt'), {
        parse_mode: 'markdown'
      });

    // Проверка номера курса
    if (typeof user.course !== 'undefined') {
      if (!Number.isInteger(user.course))
        return bot.sendMessage(chatId, 'Номер курса должен быть целым числом',
          { parse_mode: 'markdown' });
      user.course = Number(user.course);
      if (user.course <= 0)
        return bot.sendMessage(chatId, 'Номер курса должен быть целым положительным числом',
          { parse_mode: 'markdown' });
    }

    // Шифрование пароля
    if (user.password)
      user.password = encrypt(user.password);

    // Добавление нового или изменение старого пользователя
    User.findOneAndUpdate({ _id: chatId }, user, { upsert: true }, function (err, res) {
      if (err) return console.error(err);

      if (res)
        bot.sendMessage(chatId, 'Данные успешно обновлены');
      else
        bot.sendMessage(chatId, 'Данные успешно добавлены');

      const userPage = userPages.find(o => o.chatId == chatId);
      if (userPage) {
        userPage.page.browser().close();
        userPages.splice(userPages.indexOf(userPages), 1);
      }

      require('../../commands/user/whoami')(bot, chatId);
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

    if (!user[0].password)
      return bot.sendMessage(chatId, 'Вы не зарегистрированы. ' +
        fs.readFileSync('data/messages/rosdistant.txt'), {
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

module.exports = { registrate, getRosdistant, showPassword, userPages }; 