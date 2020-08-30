process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

// Создание бота
const bot = require('./src/bot').bot;

// Подключение к бд
require('mongoose').connect(process.env.MONGODB_URI || require('./config/private.json').MONGODB_URI, {
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