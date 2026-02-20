const db = require('../database');

/**
 * Checks if a member has manager/admin permissions.
 * Manager status is granted if:
 * 1. The member is the bot owner (configured in .env)
 * 2. The member has one of the roles defined in ADMIN_ROLE_IDS
 * @param {GuildMember} member The Discord member to check
 * @returns {boolean}
 */
function isManager(member) {
    if (!member) return false;

    // 1. Check if Bot Owner
    if (db.isOwner(member.id)) return true;

    // 2. Check Role-based permissions
    const adminRoles = process.env.ADMIN_ROLE_IDS;
    if (adminRoles) {
        const roleIds = adminRoles.split(',').map(id => id.trim());
        const hasRole = member.roles.cache.some(role => roleIds.includes(role.id));
        if (hasRole) return true;
    }

    return false;
}

module.exports = { isManager };
