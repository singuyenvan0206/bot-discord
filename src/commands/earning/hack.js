const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'hack',
    aliases: ['hacker', 'exploit'],
    description: 'Xâm nhập hệ thống (Digital exploitation) - Hacker Only',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);

        if (user.job !== 'hacker') {
            return message.reply(t('hack.hacker_only', lang));
        }

        let skillData = {};
        try { skillData = JSON.parse(user.skill_data || '{}'); } catch { skillData = {}; }

        const now = Math.floor(Date.now() / 1000);
        const cooldown = 3600; // 1 hour cooldown
        const lastHack = skillData.last_hack || 0;

        if (now - lastHack < cooldown) {
            const timeLeft = cooldown - (now - lastHack);
            return message.reply(t('hack.cooldown', lang, { time: formatDuration(timeLeft, lang) }));
        }

        // Logic choice
        if (!args[0]) {
            return message.reply(t('hack.usage', lang));
        }

        const sub = args[0].toLowerCase();

        // Update Cooldown early to prevent spam
        skillData.last_hack = now;
        await db.updateUser(message.guild.id, message.author.id, { skill_data: JSON.stringify(skillData) });

        if (sub === 'coins' || sub === 'tien') {
            // Attempt to hack a bank/server for digital coins
            const success = Math.random() < 0.6;
            if (success) {
                const amount = Math.floor(Math.random() * 5000) + 2000 + (user.level * 200);
                await db.addBalance(message.guild.id, message.author.id, amount);
                return message.reply(t('hack.success_coins', lang, { amount: amount.toLocaleString(), emoji: config.EMOJIS.COIN }));
            } else {
                return message.reply(t('hack.fail_security', lang));
            }
        }

        if (sub === 'luck' || sub === 'may') {
            // Attempt to gain a temporary fishing luck buff
            const success = Math.random() < 0.5;
            if (success) {
                const duration = 1800; // 30 mins
                const buffItem = { id: 610, name: 'Hacker Intelligence', multiplier: 0.5, duration: duration, type: 'luck', fishLuck: 1.25 };

                let buffs = [];
                try { buffs = JSON.parse(user.active_buffs || '[]'); } catch { buffs = []; }
                buffs.push({ itemId: 610, expiresAt: now + duration });

                await db.updateUser(message.guild.id, message.author.id, { active_buffs: JSON.stringify(buffs) });
                return message.reply(t('hack.success_luck', lang));
            } else {
                return message.reply(t('hack.fail_proxy', lang));
            }
        }

        return message.reply(t('hack.invalid_sub', lang));
    }
};
