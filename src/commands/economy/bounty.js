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

        // Handle Anonymous flag
        const isAnonymous = args.some(arg => arg?.toLowerCase() === 'anon' || arg?.toLowerCase() === 'anonymous');

        // Deduct from sender with 10% fee (2x if anonymous)
        let feePercent = config.WANTED.FEE_PERCENT || 0.1;
        if (isAnonymous) feePercent *= (config.WANTED.ANONYMOUS_FEE_MULTIPLIER || 2);

        const fee = Math.floor(amount * feePercent);
        const totalDeduction = amount + fee;

        if (Number(user.balance || 0) < totalDeduction) {
            return message.reply(t('common.insufficient_funds', lang, { balance: Number(user.balance || 0).toLocaleString() }));
        }

        await db.removeBalance(message.guild.id, message.author.id, totalDeduction);

        // Save to pending_bounties instead of updating users directly
        await db.execute(
            'INSERT INTO pending_bounties (guild_id, sender_id, target_id, amount, fee, duration, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [message.guild.id, message.author.id, target.id, amount, fee, duration, isAnonymous ? 1 : 0, Math.floor(Date.now() / 1000)]
        );

        return message.reply(t('bounty.pending_approval', lang, {
            amount: amount.toLocaleString(),
            emoji: config.EMOJIS.COIN
        }));
    }
};
