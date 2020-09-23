module.exports = function (bot, chatId) {
  require('../../repositories/InstituteRepository').getList(function (list) {
    if (!list.length)
      return bot.sendMessage(chatId, 'На данный момент ни один институт не доступен, прошу прощения',
        { parse_mode: 'markdown' });

    let message = '';
    list.forEach(inst => {
      message += '' + inst.name + ':\n';
      inst.groups.forEach((course, name) => {
        message += '  ' + name + ': ' + course.join(', ') + '\n';
      });
      message += '\n';
    });

    bot.sendDocument(chatId, Buffer.from(message.trim(), 'utf8'), {
      caption: 'Доступны следующие группы'
    }, {
      filename: 'group_list.txt'
    });
  });
};