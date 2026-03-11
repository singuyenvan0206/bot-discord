const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');
const SHOP_ITEMS = require('../../utils/shopItems');

module.exports = {
    name: 'market',
    aliases: ['trader', 'deal'],
    description: 'Thị trường thương nhân (Trader market deals) - Trader Only',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);

        if (user.job !== 'trader') {
            return message.reply(t('market.trader_only', lang));
        }

        // Sync memory cooldown
        const timestamps = message.client.cooldowns.get('market');
        if (timestamps) timestamps.set(message.author.id, Date.now());

        const now = Math.floor(Date.now() / 1000);

        // Logic choice
        if (!args[0]) {
            return message.reply(t('market.usage', lang));
        }

        const sub = args[0].toLowerCase();

        if (sub === 'deal' || sub === 'giao dich') {
            // Find a random shop item and offer a 30% discount
            const validItems = SHOP_ITEMS.filter(i => i.price > 1000 && !i.unbuyable);
            const randomItem = validItems[Math.floor(Math.random() * validItems.length)];
            const discountedPrice = Math.floor(randomItem.price * 0.7);

            const embed = new EmbedBuilder()
                .setTitle(`📈 ${t('market.deal_title', lang)}`)
                .setColor(config.COLORS.SUCCESS)
                .setDescription(t('market.deal_desc', lang, {
                    item: randomItem.name,
                    price: discountedPrice.toLocaleString(),
                    original: randomItem.price.toLocaleString(),
                    emoji: config.EMOJIS.COIN
                }))
                .setFooter({ text: t('market.deal_footer', lang) });

            const sent = await message.reply({ embeds: [embed] });

            // Interaction to buy? Or just inform? Let's make it a one-time purchase button
            // For now, let's just make it inform and update the last_market if they proceed.
            // Actually, let's keep it simple: inform and they can buy it once via a specific interaction if we had more time.
            // To keep it "active", let's just make it a "Market Luck" buff that makes the next item purchase 30% cheaper.

            const duration = 600; // 10 mins
            let buffs = [];
            try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
            buffs.push({ itemId: 611, expiresAt: now + duration, discount: 0.3 }); // Virtual item 611

            await db.updateUser(message.guild.id, message.author.id, {
                last_market: now,
                active_buffs: JSON.stringify(buffs)
            });

            return sent;
        }

        return message.reply(t('market.invalid_sub', lang));
    }
};
