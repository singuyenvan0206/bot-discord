const { EmbedBuilder } = require('discord.js');
const { t, getLanguage } = require('../../utils/i18n');
const db = require('../../database');
const config = require('../../config');
const { formatDuration } = require('../../utils/time');

module.exports = {
    name: 'chief',
    aliases: ['canhsattruong', 'approve'],
    description: 'Quản lý phê duyệt lệnh truy nã (Manage bounty approvals)',
    usage: 'list | approve <id> | deny <id>',
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const subCommand = args[0]?.toLowerCase();

        // Check if user is Police Chief
        const userJob = await db.getUserJob(message.author.id, message.guild.id);
        if (userJob !== 'police_chief' && message.author.id !== config.OWNER_ID) {
            return message.reply(t('chief.police_chief_only', lang));
        }

        if (!subCommand || subCommand === 'list') {
            const pending = await db.queryAll('SELECT * FROM pending_bounties WHERE guild_id = ? ORDER BY created_at ASC', [message.guild.id]);

            if (pending.length === 0) {
                return message.reply(t('chief.no_pending', lang));
            }

            const embed = new EmbedBuilder()
                .setTitle(t('chief.title', lang))
                .setColor(config.COLORS.INFO)
                .setDescription(pending.map(p => t('chief.pending_item', lang, {
                    id: p.id,
                    target: `<@${p.target_id}>`,
                    amount: Number(p.amount).toLocaleString(),
                    fee: Number(p.fee).toLocaleString()
                })).join('\n'))
                .setFooter({ text: t('chief.list_footer', lang, { prefix: config.PREFIX }) });

            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'approve' || subCommand === 'deny') {
            const id = parseInt(args[1]);
            if (isNaN(id)) return message.reply(t('chief.invalid_id', lang));

            const request = await db.queryOne('SELECT * FROM pending_bounties WHERE id = ? AND guild_id = ?', [id, message.guild.id]);
            if (!request) return message.reply(t('chief.invalid_id', lang));

            if (subCommand === 'approve') {
                const targetData = await db.getUser(request.target_id, message.guild.id);
                const currentBounty = Number(targetData.bounty || 0);
                const bountyLimit = config.WANTED.MAX_BOUNTY || 1000000000000;
                const newBounty = Math.min(bountyLimit, currentBounty + request.amount);

                // Calculate stars
                let newStars = 1;
                for (const threshold of config.WANTED.BOUNTY_THRESHOLDS) {
                    if (newBounty >= threshold.min) {
                        newStars = Math.max(newStars, threshold.stars);
                    }
                }

                // Expiration
                const duration = request.duration || config.WANTED.DURATIONS[newStars] || 3600;
                const newExpiresAt = Math.floor(Date.now() / 1000) + duration;

                const placers = JSON.parse(targetData.bounty_placers || '[]');
                if (request.is_anonymous === 0 && !placers.includes(request.sender_id)) {
                    placers.push(request.sender_id);
                }

                await db.execute(
                    'UPDATE users SET bounty = ?, wanted_level = ?, wanted_expires_at = ?, bounty_placers = ? WHERE id = ?',
                    [newBounty, newStars, newExpiresAt, JSON.stringify(placers), request.target_id]
                );

                await db.execute('DELETE FROM pending_bounties WHERE id = ?', [id]);

                // Notify sender
                try {
                    const sender = await message.client.users.fetch(request.sender_id);
                    await sender.send(t('chief.approved_notify', lang, {
                        target: (await message.client.users.fetch(request.target_id)).username,
                        amount: request.amount.toLocaleString()
                    }));
                } catch (e) { }

                return message.reply(t('chief.approve_success', lang, { target: `<@${request.target_id}>` }));
            } else {
                // Refund sender
                await db.addBalance(message.guild.id, request.sender_id, request.amount + request.fee);
                await db.execute('DELETE FROM pending_bounties WHERE id = ?', [id]);

                // Notify sender
                try {
                    const sender = await message.client.users.fetch(request.sender_id);
                    await sender.send(t('chief.denied_notify', lang, {
                        target: (await message.client.users.fetch(request.target_id)).username,
                        amount: (request.amount + request.fee).toLocaleString()
                    }));
                } catch (e) { }

                return message.reply(t('chief.deny_success', lang, { target: `<@${request.target_id}>` }));
            }
        }
    }
};
