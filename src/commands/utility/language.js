const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const config = require('../../config');
const { t, getLanguage } = require('../../utils/i18n');

module.exports = {
    name: 'language',
    aliases: ['lang', 'ngonngu', 'setlanguage', 'setlang'],
    description: 'Thiết lập ngôn ngữ cho bạn hoặc máy chủ (Set language for you or the server).',
    cooldown: 5,
    async execute(message, args) {
        const guildId = message.guild?.id;
        const lang = getLanguage(message.author.id, guildId);

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🌐 Language Settings')
                .setDescription(
                    `**Current Language:** \`${lang === 'vi' ? 'Tiếng Việt (vi)' : 'English (en)'}\`\n\n` +
                    `**Usage:**\n` +
                    `• \`${config.PREFIX}language en\` - Set your personal language to English.\n` +
                    `• \`${config.PREFIX}language vi\` - Thiết lập ngôn ngữ cá nhân thành Tiếng Việt.\n\n` +
                    `**Server Admin:**\n` +
                    `• \`${config.PREFIX}language server <en/vi>\` - Set default server language.`
                )
                .setColor(config.COLORS.INFO);
            return message.reply({ embeds: [embed] });
        }

        let choice = args[0].toLowerCase();
        let scope = 'user';

        // Support both structures: 
        // 1. !language server en (choice='server', args[1]='en')
        // 2. !language en server (choice='en', args[1]='server')
        if (choice === 'server') {
            scope = 'server';
            choice = args[1]?.toLowerCase();
        } else if (args[1]?.toLowerCase() === 'server') {
            scope = 'server';
        }

        if (!choice || (choice !== 'en' && choice !== 'vi')) {
            return message.reply(t('language.invalid', lang));
        }

        // Server setting
        if (scope === 'server') {
            if (!guildId) return message.reply('❌ This command can only be used in a server.');

            const isOwner = db.isOwner(message.author.id);
            const isAdmin = message.member?.permissions.has(PermissionFlagsBits.ManageGuild);

            if (!isOwner && !isAdmin) {
                return message.reply(t('common.error', lang));
            }

            db.updateGuild(guildId, { language: choice });
            return message.reply(t('language.set_success', choice));
        }

        // User setting
        db.updateUser(message.author.id, { language: choice });
        return message.reply(t('language.set_success', choice));
    }
};
