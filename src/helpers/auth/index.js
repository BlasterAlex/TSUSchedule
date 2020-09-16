const fs = require('fs'); // for working with files
const crypto = require('crypto');  // for password encryption
const ENCRYPTION_KEY = // Must be 256 bits (32 characters)
  process.env.ENCRYPTION_KEY ||
  JSON.parse(fs.readFileSync('config/private.json')).ENCRYPTION_KEY;

const User = require('../../models/User');
const UserRepository = require('../../repositories/UserRepository');

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

  // Проверка названия группы
  if (user.group && !user.group.match(/^[А-Яа-я]+-\d{4}[а-я]*$/))
    return bot.sendMessage(chatId, fs.readFileSync('data/messages/groupFormat.txt'),
      { parse_mode: 'markdown' });

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

    require('../../commands/user/whoami')(bot, chatId);
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

module.exports = { registrate, getRosdistant, showPassword }; 