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
            return message.reply(`❌ Bạn không có quyền sử dụng lệnh này (Cần quyền Manage Guild).`);
        }

        if (sub === 'add' || sub === 'a') {
            const role = message.mentions.roles.first() || (args[1] ? await message.guild.roles.fetch(args[1]).catch(() => null) : null);
            if (!role) return message.reply(t('common.error', lang));

            const price = parseAmount(args[2]);
            const incomeBuff = parseFloat(args[3]) / 100 || 0;
            const xpBuff = parseFloat(args[4]) / 100 || 0;

            if (isNaN(price) || price < 0) return message.reply(t('common.invalid_amount', lang));

            await db.addGuildRole(message.guild.id, role.id, role.name, price, incomeBuff, xpBuff, role.hexColor);

            return message.reply(`✅ Đã thêm/cập nhật role **${role.name}** vào Shop server này.\nGiá: **${price.toLocaleString()}** ${config.EMOJIS.COIN}\nBuff: Income +${(incomeBuff * 100).toFixed(0)}%, XP +${(xpBuff * 100).toFixed(0)}%`);
        }

        else if (sub === 'remove' || sub === 'rm' || sub === 'r') {
            const role = message.mentions.roles.first() || (args[1] ? { id: args[1] } : null);
            if (!role) return message.reply(t('common.error', lang));

            await db.removeGuildRole(message.guild.id, role.id);
            return message.reply(`✅ Đã xóa role khỏi Shop server này.`);
        }
        else if (sub === 'updateid' || sub === 'ui') {
            const oldId = args[1];
            const newRole = message.mentions.roles.first() || (args[2] ? await message.guild.roles.fetch(args[2]).catch(() => null) : null);

            if (!oldId || !newRole) return message.reply(`❌ Sử dụng: \`$setrole updateid <old_id> <@new_role>\``);

            const existingOld = await db.getGuildRole(message.guild.id, oldId);
            if (!existingOld) return message.reply(`❌ Không tìm thấy role với ID \`${oldId}\` trong shop.`);

            const existingNew = await db.getGuildRole(message.guild.id, newRole.id);
            if (existingNew) return message.reply(`❌ Role mới **${newRole.name}** đã có trong shop rồi.`);

            await db.updateGuildRoleId(message.guild.id, oldId, newRole.id);
            return message.reply(`✅ Đã cập nhật ID role trong shop: \`${oldId}\` ➔ **${newRole.name}** (\`${newRole.id}\`)`);
        }

        else if (sub === 'list' || sub === 'ls' || sub === 'l' || !sub) {
            const roles = await db.getGuildRoles(message.guild.id);
            if (roles.length === 0) return message.reply('❌ Server này chưa có Role nào trong Shop. Dùng `$setrole add` để thêm.');

            const embed = new EmbedBuilder()
                .setTitle(`🛒 Role Shop Configuration - ${message.guild.name}`)
                .setColor(config.COLORS.INFO)
                .setDescription(roles.map(r => `• **${r.name}** (\`${r.role_id}\`)\n  - Price: ${r.price.toLocaleString()} ${config.EMOJIS.COIN}\n  - Buff: Income +${(r.income_buff * 100).toFixed(0)}%, XP +${(r.xp_buff * 100).toFixed(0)}%`).join('\n\n'));

            return message.reply({ embeds: [embed] });
        }
    }
};
