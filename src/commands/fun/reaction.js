const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'reaction',
    aliases: ['react'],
    description: 'Test your reaction speed',
    cooldown: 30,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id);

        const embed = new EmbedBuilder()
            .setTitle(t('reaction.title', lang))
            .setDescription(t('reaction.wait', lang))
            .setColor(config.COLORS.ERROR);

        const msg = await message.reply({ embeds: [embed] });

        const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
        let signalFired = false;
        let signalTime = 0;

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot && (
                m.content.toLowerCase().trim() === 'now' ||
                m.content.toLowerCase().trim() === 'ngay'
            ),
            time: delay + 5000
        });

        const timer = setTimeout(async () => {
            signalFired = true;
            signalTime = Date.now();
            embed.setDescription(t('reaction.go', lang)).setColor(config.COLORS.SUCCESS);
            try {
                await msg.edit({ embeds: [embed] });
            } catch (err) {
                collector.stop('error');
            }
        }, delay);

        collector.on('collect', async m => {
            if (!signalFired) {
                clearTimeout(timer);
                collector.stop('too_early');
                await m.reply(t('reaction.too_early', lang));
            } else {
                const diff = m.createdTimestamp - signalTime;
                collector.stop('win');

                let reward = config.ECONOMY.REACTION_REWARD_BASE || 15;
                if (diff < 300) { reward = reward * 3 + 5; }
                else if (diff < 500) { reward = reward * 2; }
                db.addBalance(m.author.id, reward);

                let resultDesc = t('reaction.result', lang, { time: diff });
                resultDesc += t('reaction.win', lang, { emoji: config.EMOJIS.COIN, amount: reward });

                await m.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle(t('common.success', lang))
                        .setDescription(resultDesc)
                        .setColor(config.COLORS.SUCCESS)]
                });
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                message.channel.send(t('reaction.timeout', lang));
            }
            startCooldown(message.client, 'reaction', message.author.id);
        });
    }
};
