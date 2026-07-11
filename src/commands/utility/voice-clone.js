const { joinVoiceChannel, entersState, VoiceConnectionStatus, EndBehaviorType } = require('@discordjs/voice');
const prism = require('prism-media');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../../database');
const ffmpeg = require('ffmpeg-static');

process.env.FFMPEG_PATH = ffmpeg;
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';

// Ensure the local voices directory exists
const voicesDir = path.join(__dirname, '../../data/voices');
if (!fs.existsSync(voicesDir)) {
    fs.mkdirSync(voicesDir, { recursive: true });
}

module.exports = {
    name: 'voice-clone',
    aliases: ['vc', 'clone'],
    description: 'Ghi âm và lưu trữ giọng nói cục bộ (Record and save voice locally for Fish Audio clone)',
    usage: 'record | delete | status',
    category: 'utility',
    skipXp: true,
    bypassBlacklist: true,
    async execute(message, args) {
        const apiKey = process.env.FISH_API_KEY || process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return message.reply('❌ Chưa cấu hình `FISH_API_KEY` trong file `.env`!');
        }

        const subCommand = (args[0] || '').toLowerCase();
        const voicePath = path.join(voicesDir, `${message.author.id}.wav`);

        // --- SUBCOMMAND: STATUS ---
        if (subCommand === 'status') {
            if (fs.existsSync(voicePath)) {
                return message.reply(`🎤 Bạn **ĐÃ** có giọng nói clone lưu trữ cục bộ.\nDùng lệnh \`!talk <nội dung>\` để nói thử!`);
            } else {
                return message.reply('🎤 Bạn **CHƯA** có giọng nói clone trên hệ thống. Hãy vào kênh voice và dùng lệnh \`!voice-clone record\` để tạo.');
            }
        }

        // --- SUBCOMMAND: DELETE ---
        if (subCommand === 'delete') {
            if (!fs.existsSync(voicePath)) {
                return message.reply('❌ Bạn chưa có giọng nói clone nào trên hệ thống!');
            }
            try {
                fs.unlinkSync(voicePath);
                await db.updateUser(message.author.id, { elevenlabs_voice_id: null });
                return message.reply('✅ Đã xóa giọng nói clone thành công!');
            } catch (error) {
                console.error('[Voice Delete] Error:', error);
                return message.reply(`❌ Lỗi khi xóa giọng nói: ${error.message}`);
            }
        }

        // --- SUBCOMMAND: RECORD (DEFAULT) ---
        if (subCommand === 'record' || !subCommand) {
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel) {
                return message.reply('❌ Bạn phải ở trong một kênh voice để dùng lệnh này!');
            }

            const permissions = voiceChannel.permissionsFor(message.client.user);
            if (!permissions.has('Connect') || !permissions.has('Speak')) {
                return message.reply('❌ Tôi không có quyền kết nối hoặc nói trong kênh này!');
            }

            let connection;
            try {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: false, // MUST be false to receive voice packets
                });

                await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            } catch (err) {
                console.error('[Voice Connection] Timeout/Error:', err);
                if (connection) connection.destroy();
                return message.reply('❌ Không thể kết nối tới kênh voice (Connection timeout). Có thể do VPS bị chặn cổng UDP.');
            }

            const msg = await message.reply('🎤 **Bắt đầu ghi âm!** Hãy đọc to đoạn văn bản sau trong vòng 15 giây:\n\n*"Khoa học đã chứng minh rằng việc duy trì một lối sống lành mạnh, bao gồm ăn uống cân bằng và rèn luyện thể thao thường xuyên, sẽ giúp cải thiện đáng kể sức khỏe tinh thần."*\n\n*(Bot sẽ tự động dừng ghi âm sau 15 giây)*');

            // Subscribe to the author's voice stream
            const audioStream = connection.receiver.subscribe(message.author.id, {
                end: {
                    behavior: EndBehaviorType.Manual
                }
            });

            // Decode Opus stream to PCM
            const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
            const pcmStream = audioStream.pipe(opusDecoder);

            // Write PCM data into FFmpeg to convert to standard WAV
            const ffmpegProcess = spawn(FFMPEG_BIN, [
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2',
                '-i', 'pipe:0',
                '-y',
                voicePath
            ]);

            pcmStream.pipe(ffmpegProcess.stdin);

            let ffmpegClosed = false;
            let ffmpegExitCode = null;
            let ffmpegError = null;

            audioStream.on('error', (err) => {
                console.error('[Voice Recording] Audio stream error:', err);
            });

            ffmpegProcess.on('close', (code) => {
                ffmpegClosed = true;
                ffmpegExitCode = code;
                console.log(`[Voice Recording] FFmpeg process closed with code ${code}`);
            });

            ffmpegProcess.on('error', (err) => {
                ffmpegError = err;
                console.error('[Voice Recording] FFmpeg process error:', err);
            });

            // Wait 15 seconds to record
            setTimeout(async () => {
                try {
                    audioStream.destroy();
                    ffmpegProcess.stdin.end();

                    await msg.edit('⏳ **Đang xử lý âm thanh và clone giọng...** Xin vui lòng chờ trong giây lát.');

                    if (!ffmpegClosed && !ffmpegError) {
                        await new Promise((resolve) => {
                            ffmpegProcess.once('close', resolve);
                            ffmpegProcess.once('error', resolve);
                        });
                    }

                    if (ffmpegError) {
                        throw new Error(`FFmpeg error: ${ffmpegError.message}`);
                    }

                    if (ffmpegExitCode !== null && ffmpegExitCode !== 0) {
                        throw new Error(`FFmpeg exited with non-zero code ${ffmpegExitCode}`);
                    }

                    if (!fs.existsSync(voicePath) || fs.statSync(voicePath).size === 0) {
                        throw new Error('Không nhận được âm thanh từ bạn. Hãy đảm bảo bạn đã nói gì đó khi ghi âm.');
                    }

                    // Save local flag to database
                    await db.updateUser(message.author.id, { elevenlabs_voice_id: 'local' });

                    await msg.edit('✅ **Clone giọng thành công!** Giọng của bạn đã được ghi âm và lưu cục bộ.\nBây giờ hãy dùng lệnh \`!talk <nội dung>\` để bot nói bằng giọng của chính bạn!');

                } catch (error) {
                    console.error('[Voice Recording] Processing Error:', error);
                    // Cleanup broken file
                    if (fs.existsSync(voicePath)) {
                        fs.unlinkSync(voicePath);
                    }
                    await msg.edit(`❌ **Lỗi khi xử lý giọng nói:** ${error.message}`);
                } finally {
                    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                        connection.destroy();
                    }
                }
            }, 15000);
        }
    }
};
