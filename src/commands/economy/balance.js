const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'bl'],
    description: 'Check your or another user\'s balance',
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        const targetData = db.getUser(target.id);
        const embed = new EmbedBuilder()
            .setTitle(`💰  Balance: ${target.username}`)
            .setDescription(`💸 Cash: **${targetData.balance.toLocaleString()}** coins`)
            .setColor(0xF1C40F);
        return message.reply({ embeds: [embed] });
    }
};
