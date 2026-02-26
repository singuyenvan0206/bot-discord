const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { calculateReward } = require('../../utils/multiplier');

module.exports = {
    name: 'reaction',
    aliases: ['react', 'rt'],
    description: 'Test your reaction speed',
    cooldown: 10,
    manualCooldown: true,
    data: new SlashCommandBuilder()
        .setName('reaction')
        .setDescription('Test your reaction speed (Button version)'),
    async execute(message, args) {
        const isBot = message.author ? message.author.bot : message.user.bot;
        if (isBot) return;

        const user = message.author || message.user;
        const lang = getLanguage(user.id, message.guild?.id);

        const embed = new EmbedBuilder()
            .setTitle(t('reaction.title', lang))
            .setDescription(t('reaction.wait', lang))
            .setColor(config.COLORS.ERROR);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('reaction_button')
                    .setLabel(t('reaction.label_wait', lang))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

        const msg = message.reply ?
            await message.reply({ embeds: [embed], components: [row] }) :
            await message.editReply({ embeds: [embed], components: [row] });

        const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
        let signalFired = false;
        let signalTime = 0;

        const timer = setTimeout(async () => {
            signalFired = true;
            signalTime = Date.now();

            embed.setDescription(t('reaction.go', lang)).setColor(config.COLORS.SUCCESS);

            const activeRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('reaction_button')
                        .setLabel(t('reaction.label_go', lang))
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(false)
                );

            try {
                await msg.edit({ embeds: [embed], components: [activeRow] });
            } catch (err) {
                // Ignore if message deleted
            }
        }, delay);

        const filter = i => i.customId === 'reaction_button' && i.user.id === user.id;
        const collector = msg.createMessageComponentCollector({ filter, time: delay + 10000 });

        collector.on('collect', async i => {
            if (!signalFired) {
                // This shouldn't happen with disabled buttons, but as a fallback
                clearTimeout(timer);
                collector.stop('too_early');
                return;
            }

            const diff = i.createdTimestamp - signalTime;
            collector.stop('win');

            let baseReward = config.ECONOMY.REACTION_REWARD_BASE || 100;
            if (diff < 300) { baseReward = baseReward * 3 + 100; }
            else if (diff < 500) { baseReward = baseReward * 2; }

            const { total: reward, bonus: bonusAmount, cap } = calculateReward(baseReward, i.user.id);
            let finalReward = reward;

            const u = db.getUser(i.user.id);
            let flowMsg = '';
            if (u.job === 'musician' && Math.random() < 0.15) {
                finalReward *= 2;
                flowMsg = t('common.flow_state', lang);
            }

            db.addBalance(i.user.id, finalReward);

            const { addXp, XP_AMOUNTS } = require('../../utils/leveling');
            const winXp = Math.floor(Math.random() * (XP_AMOUNTS.GAME_WIN.max - XP_AMOUNTS.GAME_WIN.min + 1)) + XP_AMOUNTS.GAME_WIN.min;
            addXp(i.user.id, winXp);

            let resultDesc = t('reaction.result', lang, { time: diff });
            resultDesc += t('reaction.win', lang, { emoji: config.EMOJIS.COIN, amount: reward.toLocaleString() });

            if (bonusAmount > 0) {
                resultDesc += t('common.bonus_capped', lang, { amount: bonusAmount.toLocaleString(), cap });
            }
            if (flowMsg) resultDesc += flowMsg;

            await i.update({
                embeds: [new EmbedBuilder()
                    .setTitle(t('common.success', lang))
                    .setDescription(resultDesc)
                    .setColor(config.COLORS.SUCCESS)],
                components: []
            });
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time' && !signalFired) {
                // Signal never fired (e.g. user early stop)
            } else if (reason === 'time') {
                try {
                    await msg.edit({
                        embeds: [new EmbedBuilder().setDescription(t('reaction.timeout', lang)).setColor(config.COLORS.ERROR)],
                        components: []
                    });
                } catch (err) { }
            }
            startCooldown(message.client, 'reaction', user.id);
        });
    }
};
