const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'mentor',
    aliases: ['dayhoc', 'teach'],
    description: 'Hướng dẫn (Mentor another user for XP boost) - Teacher Only',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const user = await db.getUser(message.author.id, message.guild.id);

        if (user.job !== 'teacher') {
            return message.reply(t('mentor.teacher_only', lang));
        }

        const target = message.mentions.users.first();
        if (!target || target.id === message.author.id || target.bot) {
            return message.reply(t('mentor.invalid_target', lang));
        }

        // Sync memory cooldown
        const timestamps = message.client.cooldowns.get('mentor');
        if (timestamps) timestamps.set(message.author.id, Date.now());

        const now = Math.floor(Date.now() / 1000);

        // Grant XP Boost to target
        const targetUser = await db.getUser(target.id, message.guild.id);
        let targetBuffs = [];
        try { targetBuffs = JSON.parse(targetUser.active_buffs || '[]'); } catch { targetBuffs = []; }

        const duration = 3600; // 1 hour
        targetBuffs.push({ itemId: 612, expiresAt: now + duration }); // Virtual Mentor Buff 612

        await db.updateUser(message.guild.id, target.id, { active_buffs: JSON.stringify(targetBuffs) });

        // Reward Teacher with some XP too
        const { addXp } = require('../../utils/leveling');
        await addXp(message.author.id, message.guild.id, 100);

        await db.updateUser(message.guild.id, message.author.id, { last_mentor: now });

        return message.reply(t('mentor.success', lang, { user: target.username }));
    }
};
