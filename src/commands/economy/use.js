const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const { checkAndSendMilestone } = require('../../utils/leveling');
const config = require('../../config');

module.exports = {
    name: 'use',
    description: 'Sử dụng một vật phẩm từ túi đồ',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild?.id);
        const itemQuery = args[0]?.toLowerCase();

        if (!itemQuery) {
            return message.reply(t('use.prompt', lang, { prefix: config.PREFIX }));
        }

        const user = db.getUser(message.author.id);
        const inv = JSON.parse(user.inventory || '{}');

        // Find item in inventory
        const itemId = Object.keys(inv).find(id =>
            id === itemQuery ||
            (SHOP_ITEMS.find(i => String(i.id) === id)?.name.toLowerCase().includes(itemQuery))
        );

        if (!itemId || !inv[itemId] || inv[itemId] <= 0) {
            return message.reply(t('use.not_found', lang));
        }

        const item = SHOP_ITEMS.find(i => String(i.id) === itemId);
        const itemName = t(`items.${itemId}.name`, lang);

        // Usage Logic
        if (itemId === '37') { // Career Change Voucher (ID updated by user)
            if (!user.job) {
                return message.reply(t('use.no_job_to_reset', lang));
            }

            db.removeItem(message.author.id, itemId, 1);
            db.updateUser(message.author.id, { job: null });

            await message.reply(t('use.success', lang, { item: itemName }));
            await message.channel.send(t('use.career_reset', lang));

            return checkAndSendMilestone(message, true, lang);
        }

        // --- Duration-based Buffs ---
        if (item && item.duration) {
            db.removeItem(message.author.id, itemId, 1);

            let buffs = [];
            try {
                buffs = JSON.parse(user.active_buffs || '[]');
            } catch (e) {
                buffs = [];
            }

            const expiresAt = Math.floor(Date.now() / 1000) + item.duration;
            buffs.push({ itemId: item.id, expiresAt });

            db.updateUser(message.author.id, { active_buffs: JSON.stringify(buffs) });

            const hours = Math.floor(item.duration / 3600);
            const durationStr = hours > 0 ? `${hours}h` : `${Math.floor(item.duration / 60)}m`;

            return message.reply(`${t('use.success', lang, { item: itemName })}\n✨ **Buff Activated:** +${Math.round(item.multiplier * 100)}% ${item.type} bonus for **${durationStr}**!`);
        }

        // Add other usable items here if needed in the future
        return message.reply(t('use.not_usable', lang));
    }
};
