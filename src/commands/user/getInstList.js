module.exports = function (bot, chatId) {
  require('../../repositories/InstituteRepository').getList(function (list) {
    if (!list.length)
      return bot.sendMessage(chatId, 'На данный момент ни один институт не доступен, прошу прощения',
        { parse_mode: 'markdown' });

    let message = 'Доступны следующие институты:\n';
    list.forEach(inst => {
      message += '- ' + inst.name + '\n';
    });
    bot.sendMessage(chatId, message, { parse_mode: 'markdown' });
  });
};