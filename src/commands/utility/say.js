const { getLanguage, t } = require('../../utils/i18n');

module.exports = {
    name: 'say',
    aliases: ['echo', 'repeat'],
    description: 'Yêu cầu bot lặp lại tin nhắn văn bản (Echo a text message)',
    usage: '<text>',
    category: 'utility',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const text = args.join(' ');

        if (!text) {
            return message.reply(t('say.no_text', lang));
        }

        // Delete user message to make it look like the bot is saying it
        message.delete().catch(() => { });

        // Send the message
        return message.channel.send(text);
    },
};
