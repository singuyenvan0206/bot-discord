const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');
const { parseDuration, formatDuration } = require('../../utils/time');
const { generateWantedPoster } = require('../../utils/imageGenerator');

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

        const victimData = await db.getUser(target.id, message.guild.id);
        const now = Math.floor(Date.now() / 1000);
        if (Number(victimData.prison_until || 0) > now) {
            const timeLeft = Number(victimData.prison_until) - now;
            return message.reply(t('bounty.target_in_prison', lang, {
                target: target.username,
                time: formatDuration(timeLeft, lang)
            }));
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

        // Deduct from sender with 10% fee
        const feePercent = config.WANTED.FEE_PERCENT || 0.1;
        const fee = Math.floor(amount * feePercent);
        const totalDeduction = amount + fee;

        if (Number(user.balance || 0) < totalDeduction) {
            return message.reply(t('common.insufficient_funds', lang, { balance: Number(user.balance || 0).toLocaleString() }));
        }

        await db.removeBalance(message.guild.id, message.author.id, totalDeduction);

        // Update target's bounty and placers
        const placers = JSON.parse(victimData.bounty_placers || '[]');
        if (!placers.includes(message.author.id)) {
            placers.push(message.author.id);
        }

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
            'UPDATE users SET bounty = ?, wanted_level = ?, wanted_expires_at = ?, bounty_placers = ? WHERE id = ?',
            [newBounty, newStars, newExpiresAt, JSON.stringify(placers), target.id]
        );

        const embed = new EmbedBuilder()
            .setTitle(`🎯 ${t('bounty.title_success', lang)}`)
            .setColor(config.COLORS.SUCCESS)
            .setDescription(t('bounty.success_desc', lang, {
                user: message.author.username,
                target: target.username,
                amount: amount.toLocaleString(),
                fee: fee.toLocaleString(),
                emoji: config.EMOJIS.COIN,
                stars: '⭐'.repeat(newStars)
            }))
            .addFields({
                name: '⏰ ' + t('common.duration', lang),
                value: formatDuration(duration, lang) + ` (${t('bounty.expires_in', lang, { time: `<t:${newExpiresAt}:R>` })})`,
                inline: false
            })
            .setImage('attachment://wanted.png')
            .setTimestamp();

        try {
            const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 512 });
            const imageBuffer = await generateWantedPoster(avatarUrl, target.username, newBounty);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'wanted.png' });

            return message.reply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            console.error('Failed to generate wanted poster:', error);
            return message.reply({ embeds: [embed] });
        }
    }
};
