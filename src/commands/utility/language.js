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
        const userSettings = db.getUser(message.author.id);
        const guildSettings = guildId ? db.getGuild(guildId) : null;
        const resolvedLang = getLanguage(message.author.id, guildId);

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🌐 ' + t('language.title', resolvedLang))
                .setDescription(
                    `**${t('language.resolved', resolvedLang)}:** \`${resolvedLang === 'vi' ? 'Tiếng Việt (vi)' : 'English (en)'}\`\n\n` +
                    `**${t('language.personal', resolvedLang)}:** \`${userSettings.language ? (userSettings.language === 'vi' ? 'Tiếng Việt (vi)' : 'English (en)') : t('language.not_set', resolvedLang)}\`\n` +
                    `**${t('language.server_setting', resolvedLang)}:** \`${guildSettings?.language === 'vi' ? 'Tiếng Việt (vi)' : 'English (en)'}\`\n\n` +
                    `**${t('language.usage', resolvedLang)}:**\n` +
                    `• \`${config.PREFIX}lang <en/vi>\` - ${t('language.usage_user', resolvedLang)}\n` +
                    `• \`${config.PREFIX}lang server <en/vi>\` - ${t('language.usage_server', resolvedLang)}\n` +
                    `• \`${config.PREFIX}lang reset\` - ${t('language.usage_reset', resolvedLang)}`
                )
                .setColor(config.COLORS.INFO);
            return message.reply({ embeds: [embed] });
        }

        let choice = args[0].toLowerCase();

        if (choice === 'reset' || choice === 'default') {
            db.updateUser(message.author.id, { language: null });
            const newLang = getLanguage(message.author.id, guildId);
            return message.reply(`✅ ${t('language.reset_success', newLang)}`);
        }

        let scope = 'user';
        if (choice === 'server') {
            scope = 'server';
            choice = args[1]?.toLowerCase();
        } else if (args[1]?.toLowerCase() === 'server') {
            scope = 'server';
        }

        if (!choice || (choice !== 'en' && choice !== 'vi')) {
            return message.reply({ content: t('language.invalid', resolvedLang) });
        }

        if (scope === 'server') {
            if (!guildId) return message.reply('❌ This command can only be used in a server.');
            const isAdmin = message.member?.permissions.has(PermissionFlagsBits.ManageGuild) || db.isOwner(message.author.id);

            if (!isAdmin) return message.reply(t('common.error', resolvedLang));

            db.updateGuild(guildId, { language: choice });
            const langName = choice === 'vi' ? 'Tiếng Việt' : 'English';
            return message.reply(`✅ ${t('language.set_success', choice, { lang: langName })}`);
        }

        db.updateUser(message.author.id, { language: choice });
        const langName = choice === 'vi' ? 'Tiếng Việt' : 'English';
        return message.reply(`✅ ${t('language.set_success', choice, { lang: langName })}`);
    }
};
