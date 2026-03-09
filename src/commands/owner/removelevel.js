const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const { assignJobIfEligible } = require('../../utils/leveling');
const config = require('../../config');

module.exports = {
    name: 'removelevel',
    aliases: ['rlv', 'remlvl'],
    description: 'Trừ cấp độ của người dùng (Remove level from user)',
    ownerOnly: true,
    usage: '<@user|all> <amount>',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);

        if (!args[0]) return message.reply(t('owner.provide_target', lang));

        // Check for "all"
        if (args[0].toLowerCase() === 'all') {
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply(t('owner.invalid_level', lang));

            await db.removeAllLevel(amount);
            return message.reply(t('owner.removelevel_all_success', lang, { amount }));
        }

        // Collect all mentioned users
        let targets = Array.from(message.mentions.users.values());

        // If no mentions, try ID in first argument
        if (targets.length === 0 && args[0]) {
            const target = await message.client.users.fetch(args[0]).catch(() => null);
            if (target) targets.push(target);
        }

        if (targets.length === 0) return message.reply(t('owner.provide_target', lang));

        const amount = parseInt(args[args.length - 1]);
        if (isNaN(amount) || amount <= 0) return message.reply(t('owner.invalid_level', lang));

        let results = [];
        const milestoneInterval = config.ECONOMY?.LEVELING?.MILESTONE_INTERVAL || 20;

        for (const target of targets) {
            const user = await db.getUser(target.id);
            const newLevel = Math.max(0, (user.level || 0) - amount);
            const newXp = Math.floor(Math.pow(newLevel / 0.1, 2));
            const newMilestoneCount = Math.floor(newLevel / milestoneInterval);

            await db.updateUser(target.id, {
                level: newLevel,
                xp: newXp,
                milestone_count: newMilestoneCount
            });

            // Trigger job assignment (might lose job if level drops)
            const member = message.guild.members.cache.get(target.id) || await message.guild.members.fetch(target.id).catch(() => target);
            const assignedJob = await assignJobIfEligible(member, message.guild.id, newLevel);

            results.push({ target, newLevel, assignedJob });
        }

        const userList = results.map(r => `**${r.target.username}**`).join(', ');
        const response = t('owner.removelevel_success', lang, { amount, users: userList });

        return message.reply(response);
    }
};
