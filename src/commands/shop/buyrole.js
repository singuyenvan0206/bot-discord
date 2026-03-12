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

        if (!guildRoles || guildRoles.length === 0) {
            return message.reply(t('roleshop.no_roles', lang));
        }

        const createShopUI = (member) => {
            const embed = new EmbedBuilder()
                .setTitle(t('roleshop.title', lang))
                .setDescription(t('roleshop.desc', lang))
                .setColor(config.COLORS.INFO);

            const row = new ActionRowBuilder();

            guildRoles.forEach(role => {
                const isOwned = member.roles.cache.has(role.id || role.role_id);
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

            return { embeds: [embed], components: [row] };
        };

        const reply = await message.reply(createShopUI(message.member));

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000, // Increased to 2 mins for multiple buys
            filter: i => i.user.id === message.author.id
        });

        collector.on('collect', async i => {
            const roleId = i.customId.replace('buy_role_', '');
            const selectedRole = guildRoles.find(r => (r.id || r.role_id) === roleId);

            if (!selectedRole) {
                return i.deferUpdate();
            }

            const user = await db.getUser(i.user.id, message.guild.id);
            if (user.balance < selectedRole.price) {
                return i.reply({
                    content: t('common.insufficient_funds', lang, { balance: user.balance.toLocaleString() }),
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const member = await message.guild.members.fetch(i.user.id).catch(() => null);
            if (!member) {
                return i.reply({ content: t('common.user_not_found', lang), flags: [MessageFlags.Ephemeral] });
            }

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
            if (!botMember.permissions.has('ManageRoles') || role.position >= botMember.roles.highest.position) {
                return i.reply({
                    content: t('roleshop.error', lang),
                    flags: [MessageFlags.Ephemeral]
                });
            }

            try {
                await member.roles.add(role);
                await db.removeBalance(message.guild.id, message.author.id, selectedRole.price);

                const currentRoles = JSON.parse(user.purchased_roles || '[]');
                if (!currentRoles.includes(roleId)) {
                    currentRoles.push(roleId);
                    await db.updateUser(message.guild.id, message.author.id, { purchased_roles: JSON.stringify(currentRoles) });
                }

                // Success notification as ephemeral to avoid cluttering or changing the main shopping view
                await i.reply({
                    content: t('roleshop.buy_success', lang, { role: role.name, price: selectedRole.price.toLocaleString() }),
                    flags: [MessageFlags.Ephemeral]
                });

                // Refresh the main UI
                const updatedUI = createShopUI(member);
                await reply.edit(updatedUI).catch(() => {});
            } catch (err) {
                console.error(err);
                await i.reply({ content: t('roleshop.error', lang), flags: [MessageFlags.Ephemeral] });
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => { });
        });
    }
};
