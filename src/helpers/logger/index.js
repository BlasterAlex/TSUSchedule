const fs = require('fs');
const path = require('path');

// Запись в log-файл
const write = (fileName, text) => {

  // Путь файла
  const file = path.join(process.cwd(), 'log', fileName);

  // Контроль макс размера log-файла
  if (fs.existsSync(file)) {

    // Пророверка размера log-файла
    let stats = fs.statSync(file);
    var fileSizeInMegabytes = stats['size'] / 1000000.0;

    // Удаление, если файл слишком большой
    if (fileSizeInMegabytes > 10)
      fs.unlinkSync(file);
  }

  // Запись в файл
  fs.appendFileSync(file, text + '\n');

};

module.exports = { write };