process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs'); // for working with files
const fetch = require('node-fetch'); // for keeping bot active
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
    request: {
      agentClass: require('socks5-https-client/lib/Agent'),
      agentOptions: {
        socksHost: 'localhost',
        socksPort: '9050'
      }
    }
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
require('./src/bot').listener(bot);

// Задачи по расписанию
require('./src/crontab')(bot);

// Вывод ошибок
bot.on('polling_error', (err) => console.log(err));

// Держать бота активным
// https.createServer().listen(process.env.PORT || 5000).on('request', function (req, res) { res.end(''); });
// setInterval(function () { https.get('https://tsu-schedule-bot.herokuapp.com'); }, 300000); // every 5 minutes (300000)

const interval = 1 * 60 * 1000; // interval in milliseconds - {25mins x 60s x 1000}ms
function wake() {
  var handler;
  try {
    handler = setInterval(() => {
      fetch('https://tsu-schedule-bot.herokuapp.com')
        .then(res => console.log('Keep bot active: ' + (res.ok ? 'OK' : 'NOT OK') + `, status: ${res.status}`))
        .catch(err => console.error(`Error occured: ${err}`));
    }, interval);
  } catch (err) {
    console.error('Error occured: retrying...');
    clearInterval(handler);
    return setTimeout(() => wake(), 10000);
  }
}
wake();
