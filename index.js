process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs'); // for working with files
const http = require('http'); // for using HTTP server 
const mongoose = require('mongoose'); // for working with db
var configPrivate;

// Настройки подключения бота
var bot;
if (process.env.TELEGRAM_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
    polling: true
  });
} else {
  configPrivate = JSON.parse(fs.readFileSync('config/private.json'));
  bot = new TelegramBot(configPrivate.TELEGRAM_TOKEN, {
    polling: true,
    request: { proxy: 'http://localhost:8118' }
  });
}

// Подключение к бд
mongoose.connect(process.env.MONGODB_URI || configPrivate.MONGODB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
}).then(() => {
  console.log('Connection to database established');
}).catch(err => {
  console.log(`DB error ${err.message}`);
  process.exit(-1);
});

// Форматирование строки как в предложении
String.prototype.capitalize = function () { return this.charAt(0).toUpperCase() + this.slice(1); };

// Работа с командами пользователя
require('./src/bot')(bot);

// Задачи по расписанию
require('./src/crontab')(bot);

// Вывод ошибок
bot.on('polling_error', (err) => console.log(err));

// Держать бота активным
http.createServer().listen(process.env.PORT || 5000).on('request', function (req, res) { res.end(''); });
setInterval(function () { http.get('http://tsu-schedule-bot.herokuapp.com'); }, 300000); // every 5 minutes (300000)