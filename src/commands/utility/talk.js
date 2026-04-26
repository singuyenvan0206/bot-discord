const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType, getVoiceConnection } = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const https = require('https');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const { t, getLanguage } = require('../../utils/i18n');
const config = require('../../config');
const path = require('path');

// Set FFMPEG path for Windows compatibility
process.env.FFMPEG_PATH = ffmpeg;
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';

// Global map to store queues for each guild
const queues = new Map();

// Google TTS Hosts for rotation to avoid rate limits
const TTS_HOSTS = [
    'https://translate.google.com',
    'https://translate.google.com.vn',
    'https://translate.google.com.hk',
    'https://translate.google.co.jp'
];
let currentHostIndex = 0;

/**
 * Process the next item in the queue for a specific guild
 * @param {string} guildId 
 */
async function processQueue(guildId) {
    const queue = queues.get(guildId);
    if (!queue || queue.isPlaying || queue.messages.length === 0) {
        if (queue && queue.messages.length === 0) queue.isPlaying = false;
        return;
    }

    queue.isPlaying = true;
    const { text, lang, message } = queue.messages.shift();

    try {
        // Detect language: Default to user/guild lang, but override if Japanese characters are detected
        let ttsLang = lang;
        const isJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
        
        if (isJapanese) {
            ttsLang = 'ja';
        } else if (ttsLang !== 'vi' && ttsLang !== 'ja') {
            ttsLang = 'en';
        }

        // Select host from rotation
        const host = TTS_HOSTS[currentHostIndex];
        currentHostIndex = (currentHostIndex + 1) % TTS_HOSTS.length;

        const ttsUrl = googleTTS.getAudioUrl(text, {
            lang: ttsLang,
            slow: false,
            host: host,
        });
                                                                                                                                                                                        
        // Use FFmpeg to increase speed with atempo filter
        https.get(ttsUrl, (res) => {
            const ffmpegProcess = spawn(FFMPEG_BIN, [
                '-i', 'pipe:0',
                '-af', 'atempo=1.2', // Increase speed by 20%
                '-f', 'mp3',
                'pipe:1'
            ]);

            // Pipe Google TTS response to FFmpeg stdin
            res.pipe(ffmpegProcess.stdin);

            ffmpegProcess.on('error', err => {
                console.error(`[Talk Command] Guild ${guildId} FFmpeg Error:`, err);
            });

            const resource = createAudioResource(ffmpegProcess.stdout, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true
            });

            queue.player.play(resource);
            console.log(`[Talk Command] Guild ${guildId}: Speaking (1.2x speed) "${text}"`);
        }).on('error', (err) => {
            console.error(`[Talk Command] Guild ${guildId} HTTPS Stream Error:`, err);
            message.reply('❌ Lỗi khi tải âm thanh từ Google!');
            queue.isPlaying = false;
            processQueue(guildId);
        });

    } catch (error) {
        console.error(`[Talk Command] Guild ${guildId} Processing Error:`, error);
        queue.isPlaying = false;
        processQueue(guildId);
    }
}

module.exports = {
    name: 'talk',
    aliases: ['tts', 'noi', 'v'],
    description: 'Nói một câu trong kênh voice (Speak text in voice channel)',
    usage: '<text>',
    category: 'utility',
    skipXp: true,
    bypassBlacklist: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id, message.guild?.id);
        const originalText = args.join(' ');
        
        if (!message.member.voice.channel) {
            return message.reply(t('talk.no_vc', lang));
        }

        if (!originalText) {
            return message.reply(t('talk.no_text', lang));
        }

        const text = originalText;

        if (text.length > 1000) {
            return message.reply('❌ Câu nói quá dài (tối đa 1000 ký tự)!');
        }

        // Helper to split text into 200-character chunks
        const splitText = (str, maxLength = 200) => {
            const chunks = [];
            let current = str;
            while (current.length > 0) {
                if (current.length <= maxLength) {
                    chunks.push(current);
                    break;
                }
                let chunk = current.substring(0, maxLength);
                let lastSpace = chunk.lastIndexOf(' ');
                // If there's a space in the last 20% of the chunk, split there
                if (lastSpace > maxLength * 0.8) {
                    chunk = current.substring(0, lastSpace);
                }
                chunks.push(chunk.trim());
                current = current.substring(chunk.length).trim();
            }
            return chunks;
        };

        const textChunks = splitText(text);

        const voiceChannel = message.member.voice.channel;
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply('❌ Tôi không có quyền kết nối hoặc nói trong kênh này!');
        }

        try {
            // Get or create queue for this guild
            if (!queues.has(message.guild.id)) {
                const player = createAudioPlayer();
                
                // Set up player listeners once
                player.on(AudioPlayerStatus.Idle, () => {
                    console.log(`[Talk Command] Guild ${message.guild.id} player idle`);
                    const q = queues.get(message.guild.id);
                    if (q) {
                        q.isPlaying = false;
                        processQueue(message.guild.id);
                    }
                });

                player.on('error', error => {
                    console.error(`[Talk Command] Guild ${message.guild.id} Audio Player Error:`, error);
                    const q = queues.get(message.guild.id);
                    if (q) {
                        q.isPlaying = false;
                        processQueue(message.guild.id);
                    }
                });

                queues.set(message.guild.id, {
                    messages: [],
                    player: player,
                    isPlaying: false
                });
            }

            const queue = queues.get(message.guild.id);
            
            // Add each chunk to the queue
            textChunks.forEach(chunk => {
                queue.messages.push({ text: chunk, lang, message });
            });

            // Ensure connection
            let connection = getVoiceConnection(message.guild.id);
            if (!connection || connection.state.status === VoiceConnectionStatus.Disconnected) {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });

                try {
                    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
                    connection.subscribe(queue.player);
                    
                    // Connection event listeners
                    if (connection.listenerCount(VoiceConnectionStatus.Disconnected) === 0) {
                        connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                            try {
                                // Wait for a potential reconnection (e.g. moved channel)
                                await Promise.race([
                                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                                    entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                                ]);
                                console.log(`[Talk Command] Guild ${message.guild.id}: Reconnected successfully.`);
                            } catch (e) {
                                // If it didn't reconnect within 5 seconds, it's likely a real disconnect or kick
                                if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                                    console.log(`[Talk Command] Guild ${message.guild.id}: Disconnected permanently, destroying.`);
                                    connection.destroy();
                                }
                            }
                        });
                    }

                    if (connection.listenerCount(VoiceConnectionStatus.Destroyed) === 0) {
                        connection.on(VoiceConnectionStatus.Destroyed, () => {
                            console.log(`[Talk Command] Guild ${message.guild.id}: Connection destroyed, cleaning up queue.`);
                            queues.delete(message.guild.id);
                        });
                    }
                } catch (error) {
                    console.error('Voice Connection Error:', error);
                    connection.destroy();
                    queues.delete(message.guild.id);
                    return message.reply('❌ Không thể kết nối tới kênh voice (Connection timeout)');
                }
            } else {
                // If already connected, make sure we're subscribed
                connection.subscribe(queue.player);
            }

            // Start processing if not already playing
            processQueue(message.guild.id);

            // UI feedback
            message.delete().catch(() => { });
            message.channel.send(t('talk.speaking', lang)).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            });

        } catch (error) {
            console.error('TTS Command Error:', error);
            message.reply(t('talk.error', lang));
        }
    },
};
