const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const https = require('https');
const ffmpeg = require('ffmpeg-static');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const path = require('path');

// Set FFMPEG path for Windows compatibility
process.env.FFMPEG_PATH = ffmpeg;

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

            // Wait for the connection to be ready before playing
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            } catch (error) {
                console.error('Voice Connection Error:', error);
                connection.destroy();
                return message.reply('❌ Không thể kết nối tới kênh voice (Connection timeout)');
            }

            const player = createAudioPlayer();
            
            // Log player state changes for debugging
            player.on('stateChange', (oldState, newState) => {
                console.log(`[Talk Command] Player transitioned from ${oldState.status} to ${newState.status}`);
            });

            // Fetch TTS audio as a stream
            https.get(ttsUrl, (res) => {
                const resource = createAudioResource(res, {
                    inputType: StreamType.Arbitrary,
                    inlineVolume: true
                });

                player.play(resource);
                connection.subscribe(player);
                console.log('[Talk Command] Playing TTS stream...');
            }).on('error', (err) => {
                console.error('[Talk Command] HTTPS Stream Error:', err);
                message.reply('❌ Lỗi khi tải âm thanh từ Google!');
            });

            // Auto-delete user message
            message.delete().catch(() => { });

            // Auto-delete bot message after 5 seconds
            message.channel.send(t('talk.speaking', lang)).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            });

            player.on(AudioPlayerStatus.Idle, () => {
                console.log('[Talk Command] Player is idle');
            });

            player.on('error', error => {
                console.error('[Talk Command] Audio Player Error:', error);
                message.reply('❌ Lỗi khi phát âm thanh: ' + error.message);
                connection.destroy();
            });

            connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                console.log(`[Talk Command] Connection disconnected, state: ${newState.status}`);
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
