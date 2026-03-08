const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'buyrole',
    aliases: ['br', 'roleshop'],
    description: 'Mua phẩm hàm (Buy roles)',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const guildRoles = await db.getGuildRoles(message.guild.id);

        // Use guild roles if they exist
        const roles = guildRoles;

        if (!roles || roles.length === 0) {
            return message.reply(t('roleshop.no_roles', lang));
        }
        const embed = new EmbedBuilder()
            .setTitle(t('roleshop.title', lang))
            .setDescription(t('roleshop.desc', lang))
            .setColor(config.COLORS.INFO);

        const row = new ActionRowBuilder();

        roles.forEach(role => {
            const isOwned = message.member.roles.cache.has(role.id || role.role_id);
            const status = isOwned ? `[${t('shop.owned', lang)}]` : `**${Number(role.price).toLocaleString()}** ${config.EMOJIS.COIN}`;

            let buffText = '';
            const inc = role.income_buff || role.income_buff_pct || 0;
            const xp = role.xp_buff || role.xp_buff_pct || 0;
            if (inc > 0) buffText += `\n╰ ✨ +${Math.round(inc * 100).toLocaleString()}% ${t('effects.income', lang)}`;
            if (xp > 0) buffText += `\n╰ ⚡ +${Math.round(xp * 100).toLocaleString()}% ${t('effects.xpboost', lang)}`;

            embed.addFields({
                name: `${role.name} ${status}`,
                value: buffText || t('common.none', lang),
                inline: true
            });

            const button = new ButtonBuilder()
                .setCustomId(`buy_role_${role.id || role.role_id}`)
                .setLabel(role.name)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(isOwned);
            row.addComponents(button);
        });

        const reply = await message.reply({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            const roleId = i.customId.replace('buy_role_', '');
            const selectedRole = roles.find(r => (r.id || r.role_id) === roleId);

            if (!selectedRole) return;

            const user = await db.getUser(i.user.id, message.guild.id);
            if (user.balance < selectedRole.price) {
                return i.reply({
                    content: t('common.insufficient_funds', lang, { balance: user.balance.toLocaleString() }),
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const member = await message.guild.members.fetch(message.author.id).catch(() => null);
            if (!member) return i.reply({ content: t('common.user_not_found', lang), flags: [MessageFlags.Ephemeral] });

            if (member.roles.cache.has(roleId)) {
                return i.reply({
                    content: t('roleshop.already_owned', lang),
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const role = message.guild.roles.cache.get(roleId);
            if (!role) {
                return i.reply({
                    content: t('roleshop.role_not_found', lang),
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const botMember = await message.guild.members.fetch(message.client.user.id);
            if (!botMember.permissions.has('ManageRoles')) {
                return i.reply({
                    content: t('roleshop.error', lang),
                    flags: [MessageFlags.Ephemeral]
                });
            }

            if (role.position >= botMember.roles.highest.position) {
                return i.reply({
                    content: t('roleshop.error', lang),
                    flags: [MessageFlags.Ephemeral]
                });
            }

            try {
                await member.roles.add(role);
                await db.removeBalance(message.guild.id, message.author.id, selectedRole.price);

                // Save to DB for per-guild buffs
                const currentRoles = JSON.parse(user.purchased_roles || '[]');
                if (!currentRoles.includes(roleId)) {
                    currentRoles.push(roleId);
                    await db.updateUser(message.guild.id, message.author.id, { purchased_roles: JSON.stringify(currentRoles) });
                }

                await i.update({
                    content: t('roleshop.buy_success', lang, { role: role.name, price: selectedRole.price.toLocaleString() }),
                    embeds: [],
                    components: []
                });
            } catch (err) {
                console.error(err);
                let errMsg = t('roleshop.error', lang);
                await i.reply({ content: errMsg, flags: [MessageFlags.Ephemeral] });
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => { });
        });
    }
};
