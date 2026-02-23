const db = require('../../database');
const SHOP_ITEMS = require('../../utils/shopItems');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');

// Helper: activate a single buff item for a user
function activateBuff(userId, item, buffs, isChef) {
    let duration = item.duration;
    if (isChef) duration *= 2;
    const expiresAt = Math.floor(Date.now() / 1000) + duration;
    buffs.push({ itemId: item.id, expiresAt });
    db.removeItem(userId, String(item.id), 1);
    const hours = Math.floor(duration / 3600);
    return hours > 0 ? `${hours}h` : `${Math.floor(duration / 60)}m`;
}

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
        let inv = {};
        try { inv = JSON.parse(user.inventory || '{}'); } catch { inv = {}; }

        // ─── USE ALL ──────────────────────────────────
        if (itemQuery === 'all') {
            let buffs = [];
            try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

            const activated = [];
            let totalCount = 0;
            const isChef = user.job === 'chef';

            for (const [id, count] of Object.entries(inv)) {
                if (!count || count <= 0) continue;
                const item = SHOP_ITEMS.find(i => String(i.id) === id);
                if (!item || !item.duration) continue; // Skip non-buff items
                if (id === '503') continue; // Skip Career Change Voucher

                // Activate all stacks of this item (compact display)
                const qty = Number(count);
                for (let n = 0; n < qty; n++) {
                    let duration = item.duration;
                    if (isChef) duration *= 2;
                    const expiresAt = Math.floor(Date.now() / 1000) + duration;
                    buffs.push({ itemId: item.id, expiresAt });
                    db.removeItem(message.author.id, String(item.id), 1);
                }

                const durationStr = (() => {
                    let d = item.duration;
                    if (isChef) d *= 2;
                    const h = Math.floor(d / 3600);
                    return h > 0 ? t('common.duration_hours', lang, { hours: h }) : t('common.duration_minutes', lang, { minutes: Math.floor(d / 60) });
                })();

                const itemName = t(`items.${id}.name`, lang);
                const effectType = t(`effects.${item.type}`, lang) || item.type;
                let displayPercent = Math.round(item.multiplier * 100);
                if (item.id === 501) displayPercent = 50;
                if (item.id === 502) displayPercent = 100;

                const label = qty > 1
                    ? t('use.multi_label', lang, { qty, itemName, percent: displayPercent, type: effectType, duration: durationStr })
                    : t('use.single_label', lang, { itemName, percent: displayPercent, type: effectType, duration: durationStr });
                activated.push(label);
                totalCount += qty;
            }

            db.updateUser(message.author.id, { active_buffs: JSON.stringify(buffs) });

            if (totalCount === 0) {
                return message.reply(t('use.all_nothing', lang));
            }

            const lines = [`${t('use.all_success', lang, { count: totalCount })}`, ...activated];
            // Safe truncate if somehow too long
            let reply = lines.join('\n');
            if (reply.length > 1900) reply = reply.slice(0, 1900) + '…';

            return message.reply(reply);
        }

        // ─── USE SINGLE ITEM ──────────────────────────
        const itemId = Object.keys(inv).find(id =>
            id === itemQuery ||
            (SHOP_ITEMS.find(i => String(i.id) === id)?.name.toLowerCase().includes(itemQuery))
        );

        if (!itemId || !inv[itemId] || inv[itemId] <= 0) {
            return message.reply(t('use.not_found', lang));
        }

        const item = SHOP_ITEMS.find(i => String(i.id) === itemId);
        const itemName = t(`items.${itemId}.name`, lang);

        // Career Change Voucher
        if (itemId === '503') {
            if (!user.job) {
                return message.reply(t('use.no_job_to_reset', lang));
            }
            db.removeItem(message.author.id, itemId, 1);
            db.updateUser(message.author.id, { job: null });
            return message.reply(t('use.career_reset', lang, { prefix: config.PREFIX }));
        }

        // Duration-based Buffs
        if (item && item.duration) {
            let buffs = [];
            try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }

            const isChef = user.job === 'chef';
            const durationStr = activateBuff(message.author.id, item, buffs, isChef);

            db.updateUser(message.author.id, { active_buffs: JSON.stringify(buffs) });

            const effectType = t(`effects.${item.type}`, lang) || item.type;
            let displayPercent = Math.round(item.multiplier * 100);
            if (item.id === 501) displayPercent = 50;
            if (item.id === 502) displayPercent = 100;

            return message.reply(`${t('use.success', lang, { item: itemName })}${t('use.buff_activated', lang, { percent: displayPercent, type: effectType, duration: durationStr })}`);
        }

        return message.reply(t('use.not_usable', lang));
    }
};
