// var UserRepository = require('../../repositories/UserRepository');

const XLSX = require('xlsx'); // for reading xls
const request = require('request'); // for getting html
const cheerio = require('cheerio'); // for html parsing

const config = require('../../../config/config.json');
const InstituteRepository = require('../../repositories/InstituteRepository');

module.exports = function (bot, chatId) {

  let URL = config.scheduleURL;
  request(URL, function (err, res) {

    if (err) throw err;
    var $ = cheerio.load(res.body);

    // $('.container .row .col-lg-8 .card-body p').each(function () {
    //   let text = $(this).text();
    //   let weekRegex = /(\d+) неделя/i;
    //   if (text && text.match(weekRegex))
    //     console.log(text.match(weekRegex)[1]);
    // });

    // Получение списка институтов с ссылками
    const instSchedules = new Map();
    $('.container .row .col-lg-8 .card-body p a').each(function () {
      let link = $(this).attr('href');
      let name = $(this).text();
      if (name && !instSchedules.has(name))
        instSchedules.set(name, link);
    });


    instSchedules.forEach((link, name) => {

      // Загрузка файла расписания
      let url = 'https://www.tltsu.ru' + encodeURI(link).replace(/%25/g, '%');
      request(url, { encoding: null }, function (err, res, data) {

        if (err || res.statusCode !== 200)
          console.log(err);

        var groups = new Map();
        var wb = XLSX.read(data, { type: 'buffer' });
        wb.SheetNames.forEach((course) => {
          let g = [];
          $sheet = cheerio.load(XLSX.utils.sheet_to_html(wb.Sheets[course]));
          $sheet('body table tbody tr').each(function () { // каждая строка
            const text = $(this).text();
            if (text.match(/^[А-Яа-я]+-\d{4}[а-я]*$/i))
              g.push(text);
          });
          groups.set(course.replace('.', ''), g);
        });

        InstituteRepository.updateGroups(name, groups);
        console.log(name, groups);

      });

    });

  });
};