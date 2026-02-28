const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'setlevel',
    aliases: ['slvl'],
    description: 'Đặt cấp độ cho người dùng (Set level for user)',
    ownerOnly: true,
    usage: '<@user> <amount>',
    async execute(message, args) {
        const lang = getLanguage(message.author.id, message.guild.id);
        const target = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

        if (!target) return message.reply(t('common.error', lang));

        const level = parseInt(args[1]);
        if (isNaN(level) || level < 0) return message.reply(t('common.invalid_amount', lang));

        // XP = (Level / 0.1)^2
        const minXp = Math.floor(Math.pow(level / 0.1, 2));

        db.updateUser(target.id, { level: level, xp: minXp });

        // Trigger job assignment if eligible
        const { assignJobIfEligible } = require('../../utils/leveling');
        const member = message.guild.members.cache.get(target.id) || await message.guild.members.fetch(target.id).catch(() => target);
        const assignedJob = assignJobIfEligible(member, message.guild.id, level);

        let response = `✅ Đã đặt cấp độ của **${target.username}** thành **${level}** (XP: **${minXp.toLocaleString()}**).`;
        if (assignedJob) {
            response += `\n💼 **Job Assigned:** **${assignedJob.name}** đã được gán cho người dùng này!`;
        }

        return message.reply(response);
    }
};
