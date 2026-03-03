const db = require('../../database');
const config = require('../../config');
const { getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'resetdatabase',
    aliases: ['wipeall', 'dbreset', 'rdb', 'resetdb'],
    description: 'Đặt lại toàn bộ database (Reset entire database)',
    ownerOnly: true,
    async execute(message, args) {
        if (!db.isOwner(message.author.id)) return;

        const lang = await getLanguage(message.author.id, message.guild?.id);

        // Require double confirmation for such a destructive action
        if (args[0] !== 'confirm' || args[1] !== 'YES') {
            return message.reply(lang === 'vi'
                ? 'Bạn đang chuẩn bị xóa **TOÀN BỘ** dữ liệu của bot (Tiền, Đồ, Cấp độ, Nghề nghiệp, Giveaway, v.v.).\n\n**HÀNH ĐỘNG NÀY KHÔNG THỂ KHÔI PHỤC!**\n\nHãy gõ lệnh: `$resetdatabase confirm YES` để tiếp tục.'
                : 'You are about to wipe **EVERYTHING** (Money, Items, Levels, Jobs, Giveaways, etc.).\n\n**THIS ACTION IS IRREVERSIBLE!**\n\nType: `$resetdatabase confirm YES` to proceed.')
        }

        try {
            // Fetch all purchasable roles BEFORE clearing data
            const allRoles = await db.getAllGuildRoles();

            db.clearAllData();
            message.client.cooldowns.clear();

            // Try to remove roles from members in each guild
            if (allRoles.length > 0) {
                // Group roles by guild for efficiency
                const rolesByGuild = allRoles.reduce((acc, role) => {
                    if (!acc[role.guild_id]) acc[role.guild_id] = [];
                    acc[role.guild_id].push(role.role_id);
                    return acc;
                }, {});

                for (const [guildId, roleIds] of Object.entries(rolesByGuild)) {
                    const guild = message.client.guilds.cache.get(guildId);
                    if (!guild) continue;

                    try {
                        // Fetch all members to ensure we have cached roles
                        const members = await guild.members.fetch();
                        for (const member of members.values()) {
                            const rolesToRemove = roleIds.filter(id => member.roles.cache.has(id));
                            if (rolesToRemove.length > 0) {
                                await member.roles.remove(rolesToRemove, 'Database Reset').catch(() => { });
                            }
                        }
                    } catch (err) {
                        console.error(`Failed to cleanup roles in guild ${guildId}:`, err);
                    }
                }
            }

            return message.reply(lang === 'vi' ? 'Đã xóa sạch toàn bộ dữ liệu hệ thống và gỡ bỏ các chức vụ đã mua thành công.' : 'Successfully wiped all system data and removed all purchased roles.')
        } catch (e) {
            return message.reply(lang === 'vi' ? `❌ Lỗi khi reset database: ${e.message}` : `❌ Error resetting database: ${e.message}`);
        }
    }
};
