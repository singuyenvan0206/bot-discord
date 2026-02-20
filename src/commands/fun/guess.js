const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'guess',
    aliases: ['gn'],
    description: 'Đoán số (1-100)',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const number = Math.floor(Math.random() * 100) + 1;
        let attempts = 0;

        const embed = new EmbedBuilder()
            .setTitle('🔢  Đoán Số')
            .setDescription(`Tôi đang nghĩ về một con số từ **1 đến 100**.\nBạn có **1 phút** để đoán nó!`)
            .setColor(config.COLORS.INFO);

        await message.reply({ embeds: [embed] });

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot && !isNaN(parseInt(m.content)),
            time: 60_000
        });

        collector.on('collect', m => {
            const guess = parseInt(m.content);
            attempts++;

            if (guess === number) {
                const reward = Math.max(10, config.ECONOMY.GUESS_REWARD_BASE - (attempts * 5));
                db.addBalance(m.author.id, reward);

                m.reply(`${config.EMOJIS.SUCCESS} **Chính xác!** Con số đó là **${number}**.\nBạn đã đoán đúng trong **${attempts}** lần thử và nhận được ${config.EMOJIS.COIN} **${reward}** coins!`);
                collector.stop();
            } else if (guess < number) {
                m.react('⬆️'); // Higher
            } else {
                m.react('⬇️'); // Lower
            }
        });

        collector.on('collect', m => { // Fixed redundant collector on collect
            // Already handled above
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                message.channel.send(`${config.EMOJIS.TIMER} **Hết thời gian!** Con số đó là **${number}**.`);
            }
            startCooldown(message.client, 'guess', message.author.id);
        });
    }
};
