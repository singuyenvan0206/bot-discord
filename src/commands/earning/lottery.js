const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'lottery',
    aliases: ['lot', 'vs'],
    description: 'Xổ số (Participate in lottery)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const action = args[0]?.toLowerCase();

        if (action === 'buy' || action === 'b') {
            const amount = parseInt(args[1]) || 1;
            if (amount <= 0) return message.reply(t('common.invalid_amount', lang));

            const cost = amount * config.ECONOMY.LOTTERY.TICKET_PRICE;
            const user = await db.getUser(message.author.id, message.guild.id);

            if ((user.balance || 0) < cost) {
                return message.reply(t('common.insufficient_funds', lang, { balance: (user.balance || 0).toLocaleString() }));
            }

            await db.removeBalance(message.guild.id, message.author.id, cost);
            await db.addLotteryTicket(message.guild.id, message.author.id, amount);
            await db.addLotteryJackpot(message.guild.id, Math.floor(cost * 0.8)); // 80% price goes to jackpot

            return message.reply(t('lottery.buy_success', lang, {
                amount,
                cost: cost.toLocaleString(),
                emoji: config.EMOJIS.COIN
            }) || `✅ Bạn đã mua **${amount.toLocaleString()}** vé số với giá **${cost.toLocaleString()}** ${config.EMOJIS.COIN}!`);
        }

        // Show status (guild-specific)
        const jackpot = await db.getLotteryJackpot(message.guild.id);
        const tickets = await db.getLotteryTickets(message.guild.id);
        const totalTickets = tickets.reduce((acc, t) => acc + t.count, 0);
        const userTickets = tickets.find(t => t.user_id === message.author.id)?.count || 0;

        const lastDraw = parseInt(await db.getGuildSetting(message.guild.id, 'last_lottery_draw', '0'));
        const nextDraw = lastDraw + config.ECONOMY.LOTTERY.DRAW_INTERVAL;
        const timeRemaining = Math.max(0, nextDraw - Math.floor(Date.now() / 1000));

        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);

        const embed = new EmbedBuilder()
            .setTitle(t('lottery.title', lang) || "🎫 Xổ Số May Mắn")
            .setDescription(t('lottery.status_desc', lang, {
                jackpot: jackpot.toLocaleString(),
                total: totalTickets.toLocaleString(),
                user: userTickets.toLocaleString(),
                emoji: config.EMOJIS.COIN,
                price: config.ECONOMY.LOTTERY.TICKET_PRICE.toLocaleString()
            }) || `💰 Jackpot hiện tại: **${jackpot.toLocaleString()}** ${config.EMOJIS.COIN}\n🎟️ Tổng số vé đã bán: **${totalTickets.toLocaleString()}**\n👤 Vé của bạn: **${userTickets.toLocaleString()}**\n\nGiá mỗi vé: **${config.ECONOMY.LOTTERY.TICKET_PRICE.toLocaleString()}** coins.`)
            .addFields({
                name: t('lottery.time_remaining', lang) || "⏱️ Thời gian còn lại",
                value: `**${hours}g ${minutes}p**`
            })
            .setColor(config.COLORS.INFO)
            .setFooter({ text: t('lottery.usage_tip', lang, { prefix: config.PREFIX }) || `Sử dụng ${config.PREFIX}lottery buy [số lượng] để mua vé.` });

        return message.reply({ embeds: [embed] });
    }
};
