const XLSX = require('xlsx'); // for reading xls
const request = require('request'); // for getting html
const cheerio = require('cheerio'); // for html parsing

const config = require('../../../config/config.json');
const InstituteRepository = require('../../repositories/InstituteRepository');

// Обновление списка групп для института
var updateGroupList = (url, name, callback) => {
  request(url, { encoding: null }, function (err, res, data) {

    if (err || res.statusCode !== 200)
      return callback(err, null);

    var groups = new Map();
    var wb = XLSX.read(data, { type: 'buffer' });
    wb.SheetNames.forEach((course) => {
      let g = [];
      $sheet = cheerio.load(XLSX.utils.sheet_to_html(wb.Sheets[course]));
      $sheet('body table tbody tr').each(function () { // каждая строка
        const text = $sheet(this).text();
        if (text.match(/^[А-Яа-я]+-\d{4}[а-я]*$/))
          g.push(text);
      });
      groups.set(course.replace('.', ''), g);
    });

    InstituteRepository.updateGroups(name, groups);
    console.log(name, groups);
    return callback(null, 'OK');
  });
};

module.exports = function (bot, chatId) {

  let URL = config.scheduleURL;
  request(URL, function (err, res) {

    if (err) throw err;
    var $ = cheerio.load(res.body);

    // Получение списка институтов с ссылками
    const instSchedules = new Map();
    $('.container .row .col-lg-8 .card-body p a').each(function () {
      let link = $(this).attr('href');
      let name = $(this).text();
      if (name && !instSchedules.has(name))
        instSchedules.set(name, link);
    });

    let left = instSchedules.size;
    new Promise((resolve) => {
      instSchedules.forEach((link, name) => {
        // Загрузка файла расписания
        const url = 'https://www.tltsu.ru' + encodeURI(link).replace(/%25/g, '%');
        updateGroupList(url, name, (err) => {
          if (err)
            resolve('Ошибка обновления института *' + name + '*:\n' + err);
          if (--left === 0) resolve();
        });
      });
    })
      .then((err) => bot.sendMessage(chatId, err ? err : 'Список групп успешно обновлен', { parse_mode: 'markdown' }));

  });
};