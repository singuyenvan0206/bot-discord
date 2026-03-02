const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { parseAmount } = require('../../utils/economy');

module.exports = {
    name: 'setrole',
    aliases: ['sr'],
    description: 'Cài đặt role vào Shop cho server này (Set role for Shop in this server)',
    // Allow Server Owners or members with Manage Guild permission
    permissions: [PermissionFlagsBits.ManageGuild],
    usage: 'add <@role> <price> <income_buff%> <xp_buff%> | remove <@role> | updateid <old_id> <@new_role> | list',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild.id);
        const sub = args[0]?.toLowerCase();

        // Security check: must be bot owner OR server admin
        const isOwner = config.OWNER_ID === message.author.id || config.OWNER_IDS?.includes(message.author.id);
        const isAdmin = message.member.permissions.has(PermissionFlagsBits.ManageGuild) || message.author.id === message.guild.ownerId;

        if (!isOwner && !isAdmin) {
            return message.reply(t('common.no_permission', lang));
        }

        if (sub === 'add' || sub === 'a') {
            const role = message.mentions.roles.first() || (args[1] ? await message.guild.roles.fetch(args[1]).catch(() => null) : null);
            if (!role) return message.reply(t('common.error', lang));

            const price = parseAmount(args[2]);
            const incomeBuff = parseFloat(args[3]) / 100 || 0;
            const xpBuff = parseFloat(args[4]) / 100 || 0;

            if (isNaN(price) || price < 0) return message.reply(t('common.invalid_amount', lang));

            await db.addGuildRole(message.guild.id, role.id, role.name, price, incomeBuff, xpBuff, role.hexColor);

            return message.reply(t('setrole.add_success', lang, {
                role: role.name,
                price: price.toLocaleString(),
                emoji: config.EMOJIS.COIN,
                income: (incomeBuff * 100).toFixed(0),
                xp: (xpBuff * 100).toFixed(0)
            }));
        }

        else if (sub === 'remove' || sub === 'rm' || sub === 'r') {
            const role = message.mentions.roles.first() || (args[1] ? { id: args[1] } : null);
            if (!role) return message.reply(t('common.error', lang));

            await db.removeGuildRole(message.guild.id, role.id);
            return message.reply(t('setrole.remove_success', lang));
        }
        else if (sub === 'updateid' || sub === 'ui') {
            const oldId = args[1];
            const newRole = message.mentions.roles.first() || (args[2] ? await message.guild.roles.fetch(args[2]).catch(() => null) : null);

            if (!oldId || !newRole) return message.reply(t('setrole.usage_ui', lang, { prefix: '$' }));

            const existingOld = await db.getGuildRole(message.guild.id, oldId);
            if (!existingOld) return message.reply(t('setrole.not_found', lang, { id: oldId }));

            const existingNew = await db.getGuildRole(message.guild.id, newRole.id);
            if (existingNew) return message.reply(t('setrole.already_exists', lang, { role: newRole.name }));

            await db.updateGuildRoleId(message.guild.id, oldId, newRole.id);
            return message.reply(t('setrole.update_success', lang, {
                oldId,
                newName: newRole.name,
                newId: newRole.id
            }));
        }

        else if (sub === 'list' || sub === 'ls' || sub === 'l' || !sub) {
            const roles = await db.getGuildRoles(message.guild.id);
            if (roles.length === 0) return message.reply(t('setrole.no_roles', lang, { prefix: '$' }));

            const embed = new EmbedBuilder()
                .setTitle(t('setrole.title', lang, { guild: message.guild.name }))
                .setColor(config.COLORS.INFO)
                .setDescription(roles.map(r => `• **${r.name}** (\`${r.role_id}\`)\n  - Price: **${Number(r.price).toLocaleString()}** ${config.EMOJIS.COIN}\n  - Buff: Income +${(Number(r.income_buff) * 100).toLocaleString()}%, XP +${(Number(r.xp_buff) * 100).toLocaleString()}%`).join('\n\n'));

            return message.reply({ embeds: [embed] });
        }
    }
};
