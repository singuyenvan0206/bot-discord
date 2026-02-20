const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const config = require('../../config');

module.exports = {
    name: 'reaction',
    aliases: ['react'],
    description: 'Kiểm tra tốc độ phản ứng của bạn',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const embed = new EmbedBuilder()
            .setTitle('⚡  Kiểm Tra Phản Ứng')
            .setDescription('Hãy đợi đấy...')
            .setColor(config.COLORS.ERROR);

        const msg = await message.reply({ embeds: [embed] });

        const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds

        setTimeout(async () => {
            const now = Date.now();
            embed.setDescription('**HÃY GÕ "NGAY"!**').setColor(config.COLORS.SUCCESS);
            await msg.edit({ embeds: [embed] });

            try {
                const collected = await message.channel.awaitMessages({
                    filter: m => (m.content.toLowerCase() === 'now' || m.content.toLowerCase() === 'ngay') && !m.author.bot,
                    max: 1,
                    time: 5000,
                    errors: ['time']
                });

                const winner = collected.first();
                const diff = winner.createdTimestamp - now;

                // Reward based on reaction speed
                let reward = config.ECONOMY.REACTION_REWARD_BASE;
                let speedRank = '🐢 Khá tốt';
                if (diff < 300) { reward = reward * 3 + 5; speedRank = '⚡ Thần tốc'; }
                else if (diff < 500) { reward = reward * 2; speedRank = '🏎️ Nhanh'; }
                db.addBalance(winner.author.id, reward);

                winner.reply(`${config.EMOJIS.SUCCESS} **${diff}ms!** Đạt hạng: ${speedRank}!\n${config.EMOJIS.COIN} **+${reward} coins!**`);
                startCooldown(message.client, 'reaction', message.author.id);
            } catch (reason) {
                message.channel.send(`${config.EMOJIS.TIMER} **Quá chậm rồi!** Không có ai phản ứng kịp thời.`);
                startCooldown(message.client, 'reaction', message.author.id);
            }
        }, delay);
    }
};
