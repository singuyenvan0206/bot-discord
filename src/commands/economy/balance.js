const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'bl'],
    description: 'Check your or another user\'s balance',
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        const targetData = db.getUser(target.id);
        const embed = new EmbedBuilder()
            .setTitle(`${config.EMOJIS.COIN}  Balance: ${target.username}`)
            .setDescription(`💸 Cash: **${targetData.balance.toLocaleString()}** coins`)
            .setColor(config.COLORS.WARNING);
        return message.reply({ embeds: [embed] });
    }
};
