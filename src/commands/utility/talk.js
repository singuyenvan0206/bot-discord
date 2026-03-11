const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const path = require('path');

module.exports = {
    name: 'talk',
    aliases: ['tts', 'noi', 'v'], // Voice command aliases
    description: 'Nói một câu trong kênh voice (Speak text in voice channel)',
    usage: '<text>',
    category: 'utility',
    skipXp: true,
    bypassBlacklist: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const text = args.join(' ');

        if (!message.member.voice.channel) {
            return message.reply(t('talk.no_vc', lang));
        }

        if (!text) {
            return message.reply(t('talk.no_text', lang));
        }

        if (text.length > 200) {
            return message.reply(t('talk.too_long', lang));
        }

        const voiceChannel = message.member.voice.channel;
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('❌ Tôi không có quyền kết nối hoặc nói trong kênh này!');
        }

        try {
            // Generate TTS URL (default to Vietnamese if lang is vi, otherwise use requested lang or auto-detect)
            const ttsUrl = googleTTS.getAudioUrl(text, {
                lang: lang === 'vi' ? 'vi' : 'en',
                slow: false,
                host: 'https://translate.google.com',
            });

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(ttsUrl);

            player.play(resource);
            connection.subscribe(player);

            // Auto-delete user message
            message.delete().catch(() => { });

            // Auto-delete bot message after 5 seconds
            message.channel.send(t('talk.speaking', lang)).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            });

            player.on(AudioPlayerStatus.Idle, () => {
                setTimeout(() => {
                    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                        connection.destroy();
                    }
                }, 30000); // Wait 30s before leaving if idle
            });

            player.on('error', error => {
                console.error('Error playing TTS:', error);
                message.reply(t('talk.error', lang));
                connection.destroy();
            });

            connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                    ]);
                } catch (e) {
                    connection.destroy();
                }
            });

        } catch (error) {
            console.error('TTS Command Error:', error);
            message.reply(t('talk.error', lang));
        }
    },
};
