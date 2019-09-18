process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs'); // for working with files
const mongoose = require('mongoose'); // for working with db

// Настройки подключения бота
var config = JSON.parse(fs.readFileSync('config/private.json'));
var bot = new TelegramBot(config.TELEGRAM_TOKEN, {
  polling: true,
  request: { proxy: "http://localhost:8118" }
});

// Подключение к бд
mongoose.connect(config.MONGODB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
}).then(() => {
  console.log(`Connection to database established`)
}).catch(err => {
  console.log(`DB error ${err.message}`);
  process.exit(-1)
});

// Отслеживания сообщений пользователя
bot.onText(/(.+)/, (msg) => {
  const chatId = msg.chat.id;

  if (chatId == config.ADMIN_CHAT_ID)
    bot.sendMessage(chatId, 'Так выглядит ваше сообщение:\n\n' +
      fs.readFileSync('mailing/message.txt') + '\n\nОтправляю?', {
      parse_mode: 'markdown',
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: 'Да', callback_data: 'yep' }],
          [{ text: 'Нет', callback_data: 'nope' }],
        ]
      })
    });
  else
    bot.sendMessage(chatId, 'Сейчас я не могу вам помочь, напишите через несколько минут');
});

// Обработка ответа пользователя
bot.on('callback_query', function (msg) {
  switch (msg.data) {
    case 'yep':
      require('../src/repositories/UserRepository').getAll(function (list) {
        console.log('\nСписок получателей:');
        list.forEach(function (user) {
          // bot.sendMessage(user.chatId, fs.readFileSync('mailing/message.txt'), { parse_mode: 'markdown' });
          console.log(user.chatId);
        });
      });
      bot.answerCallbackQuery(msg.id, { text: 'Сообщение отправлено' }, true);
      break;
    case 'nope':
      bot.answerCallbackQuery(msg.id, { text: 'Хорошо, не буду' }, true);
      break;
  }
});

// Вывод ошибок
bot.on("polling_error", (err) => console.log(err));

