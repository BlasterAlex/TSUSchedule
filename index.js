process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

// const https = require('https'); // for keeping bot active
const mongoose = require('mongoose'); // for working with db
const fs = require('fs'); // for working with files
const bot = require('./src/bot').bot;

// Подключение к бд
mongoose.connect(process.env.MONGODB_URI || JSON.parse(fs.readFileSync('config/private.json')).MONGODB_URI, {
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

// Задачи по расписанию
require('./src/crontab')(bot);

// Запуск бота
require('./src/web')(bot);

// Держать бота активным
// https.createServer().listen(process.env.PORT || 5000).on('request', function (req, res) { res.end(''); });
// setInterval(function () { https.get('https://tsu-schedule-bot.herokuapp.com'); }, 30 * 1000); // every 5 minutes (300000)

// const interval = 1 * 60 * 1000; // interval in milliseconds - {25mins x 60s x 1000}ms
// function wake() {
//   var handler;
//   try {
//     handler = setInterval(() => {
//       fetch('https://tsu-schedule-bot.herokuapp.com')
//         .then(res => console.log('Keep bot active: ' + (res.ok ? 'OK' : 'NOT OK') + `, status: ${res.status}`))
//         .catch(err => console.error(`Error occured: ${err}`));
//     }, interval);
//   } catch (err) {
//     console.error('Error occured: retrying...');
//     clearInterval(handler);
//     return setTimeout(() => wake(), 10000);
//   }
// }
// wake();
