const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');
const { parseDuration, formatDuration } = require('../../utils/time');

module.exports = {
    name: 'bounty',
    aliases: ['treothuong', 'bt'],
    description: 'Treo thưởng truy nã cho một người (Place a bounty on someone)',
    detailDescription: 'Cho phép bạn dùng tiền của mình để treo thưởng lên đầu người khác. Hỗ trợ đơn vị k, m, b và có thể tùy chỉnh thời hạn truy nã (ví dụ: 1h, 30m, 1d). Nếu không nhập thời hạn, hệ thống sẽ tự động tính toán dựa trên số tiền.',
    usage: '<@user> <amount> [duration]',
    examples: ['@user 50k', '@user 1m 2h', 'all 1h'],
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);

        const target = message.mentions.users.first();
        if (!target || target.id === message.author.id || target.bot) {
            return message.reply(t('bounty.invalid_target', lang));
        }

        const amountInput = args[1];
        if (!amountInput) {
            return message.reply(t('bounty.missing_amount', lang));
        }

        const user = await db.getUser(message.author.id, message.guild.id);
        const amount = parseAmount(amountInput, Number(user.balance || 0));
        const minReward = config.WANTED.MIN_REWARD || 50000;

        if (isNaN(amount) || amount < minReward) {
            return message.reply(t('bounty.invalid_amount', lang, { min: minReward.toLocaleString() }));
        }

        if (Number(user.balance || 0) < amount) {
            return message.reply(t('common.insufficient_funds', lang, { balance: Number(user.balance || 0).toLocaleString() }));
        }

        // Handle Duration
        let duration = 0;
        const durationInput = args[2];
        if (durationInput) {
            duration = parseDuration(durationInput);
            if (!duration || duration < 300) { // Min 5 mins
                return message.reply(t('bounty.invalid_duration', lang));
            }
        }

        // Deduct from sender
        await db.removeBalance(message.guild.id, message.author.id, amount);

        // Update target's bounty
        const victimData = await db.getUser(target.id, message.guild.id);
        const currentBounty = Number(victimData.bounty || 0);
        const newBounty = currentBounty + amount;

        // Calculate stars
        let newStars = 1;
        for (const threshold of config.WANTED.BOUNTY_THRESHOLDS) {
            if (newBounty >= threshold.min) {
                newStars = Math.max(newStars, threshold.stars);
            }
        }

        // Calculate expiration
        if (!duration) {
            // Default: based on stars if not provided
            duration = config.WANTED.DURATIONS[newStars] || 3600;
        }

        const newExpiresAt = Math.floor(Date.now() / 1000) + duration;

        await db.execute(
            'UPDATE users SET bounty = ?, wanted_level = ?, wanted_expires_at = ? WHERE id = ?',
            [newBounty, newStars, newExpiresAt, target.id]
        );

        const embed = new EmbedBuilder()
            .setTitle(`🎯 ${t('bounty.title_success', lang)}`)
            .setColor(config.COLORS.SUCCESS)
            .setDescription(t('bounty.success_desc', lang, {
                user: message.author.username,
                target: target.username,
                amount: amount.toLocaleString(),
                emoji: config.EMOJIS.COIN,
                stars: '⭐'.repeat(newStars)
            }))
            .addFields({
                name: '⏰ ' + t('common.duration', lang),
                value: formatDuration(duration, lang) + ` (${t('bounty.expires_in', lang, { time: `<t:${newExpiresAt}:R>` })})`,
                inline: false
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
};
