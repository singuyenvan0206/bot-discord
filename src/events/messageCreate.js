const { Events, Collection } = require('discord.js');
const config = require('../config');
const db = require('../database');
const { getLanguage, t } = require('../utils/i18n');
const { addXp, XP_AMOUNTS } = require('../utils/leveling');
const { formatDuration } = require('../utils/time');

const xpCooldowns = new Set();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // ─── EXP System (Chatting) ───
        const { client } = message;
        const isCommand = message.content.startsWith(config.PREFIX);
        let shouldSkipChatXp = false;

        if (isCommand) {
            const tempArgs = message.content.slice(config.PREFIX.length).trim().split(/ +/);
            const tempCommandName = (tempArgs.shift() || '').toLowerCase();
            const tempCommand = client.commands.get(tempCommandName) ||
                client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(tempCommandName));

            const isOwner = await db.isOwner(message.author.id);
            const isAdminCmd = tempCommand && (tempCommand.ownerOnly || tempCommand.adminOnly || tempCommand.skipXp);

            // Skip Chat XP if it's an owner trying to run a command (even with typos) or if it's an admin/owner/skipped command
            if (isOwner || isAdminCmd) {
                shouldSkipChatXp = true;
            }
        }

        // ─── Channel Blacklist Check ───
        const guildBlacklistRaw = await db.getGuildSetting(message.guild.id, 'blacklisted_channels', '[]');
        let guildBlacklist = [];
        try { guildBlacklist = JSON.parse(guildBlacklistRaw); } catch (e) { guildBlacklist = []; }

        if (config.BLACKLISTED_CHANNELS.includes(message.channel.id) || guildBlacklist.includes(message.channel.id)) return;

        if (!shouldSkipChatXp && !xpCooldowns.has(message.author.id)) {
            const { MESSAGE } = XP_AMOUNTS;
            const xpAmount = Math.floor(Math.random() * (MESSAGE.max - MESSAGE.min + 1)) + MESSAGE.min;

            await addXp(message.member, xpAmount);

            xpCooldowns.add(message.author.id);
            setTimeout(() => xpCooldowns.delete(message.author.id), 30000); // 30 seconds cooldown
        }

        // ─── Command Handling ───
        if (!message.content.startsWith(config.PREFIX)) return;

        const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
        const commandName = (args.shift() || '').toLowerCase();
        if (!commandName) return;

        // Check if bot is "shut down" (persisted in DB)
        const isStopped = await db.getGlobalSetting('bot_is_stopped') === 'true';
        if (isStopped && commandName !== 'startup' && commandName !== 'boot') {
            const lang = await getLanguage(message.author.id, message.guild?.id);
            return message.reply(t('common.bot_shut_down', lang)).catch(() => { });
        }

        // const { client } = message;
        const command = client.commands.get(commandName) ||
            client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        const lang = await getLanguage(message.author.id, message.guild?.id);

        if (command.ownerOnly && !await db.isOwner(message.author.id)) {
            return message.reply(t('common.no_permission', lang));
        }

        const isServerOwner = message.author.id === message.guild.ownerId;
        const isBotOwner = await db.isOwner(message.author.id);
        const isAdmin = message.member.permissions.has('Administrator');

        if (command.adminOnly && !isServerOwner && !isBotOwner && !isAdmin) {
            return message.reply(t('common.no_permission', lang));
        }

        // Cooldown handling
        if (!client.cooldowns.has(command.name)) {
            client.cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = client.cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || config.ECONOMY.DEFAULT_COOLDOWN) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(t('common.cooldown', lang, { time: formatDuration(Math.ceil(timeLeft), lang) }));
            }
        }

        if (!command.manualCooldown) {
            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        }

        try {
            await command.execute(message, args);
            // Grant Command Success XP (Skip for admin/owner/utility commands to prevent imbalance)
            if (!command.ownerOnly && !command.adminOnly && !command.skipXp) {
                const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.COMMAND_SUCCESS.max - XP_AMOUNTS.COMMAND_SUCCESS.min + 1)) + XP_AMOUNTS.COMMAND_SUCCESS.min;
                await addXp(message.member, xpAmount);
            }
        } catch (error) {
            console.error(`[Command] Error executing !${commandName}:`, error);
            message.reply(t('common.error', lang)).catch(() => { });

            // Grant Command Failure XP (Skip for admin/owner/utility commands)
            if (!command.ownerOnly && !command.adminOnly && !command.skipXp) {
                const xpAmount = Math.floor(Math.random() * (XP_AMOUNTS.COMMAND_FAILURE.max - XP_AMOUNTS.COMMAND_FAILURE.min + 1)) + XP_AMOUNTS.COMMAND_FAILURE.min;
                await addXp(message.member, xpAmount);
            }
        }
    },
};
