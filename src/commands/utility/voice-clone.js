const { joinVoiceChannel, entersState, VoiceConnectionStatus, EndBehaviorType } = require('@discordjs/voice');
const prism = require('prism-media');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../../database');
const ffmpeg = require('ffmpeg-static');

process.env.FFMPEG_PATH = ffmpeg;
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';

/**
 * Helper to upload audio file to Fish Audio API for Instant Voice Cloning
 */
async function addVoice(apiKey, name, filePath, transcript) {
    const url = 'https://api.fish.audio/model';
    const fileBuffer = fs.readFileSync(filePath);
    
    const formData = new FormData();
    formData.append('type', 'tts');
    formData.append('title', name);
    formData.append('description', 'Voice cloned from Discord Bot');
    formData.append('visibility', 'private');
    formData.append('train_mode', 'fast');
    formData.append('texts', transcript); // Send transcript to teach AI Vietnamese phonemes correctly
    
    const blob = new Blob([fileBuffer], { type: 'audio/wav' });
    formData.append('voices', blob, 'recording.wav');
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Fish Audio error: ${errText}`);
    }
    
    const data = await response.json();
    return data._id; // Fish Audio returns model ID as _id
}

/**
 * Helper to delete a voice model from Fish Audio API
 */
async function deleteVoice(apiKey, voiceId) {
    const url = `https://api.fish.audio/model/${voiceId}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Fish Audio delete error: ${errText}`);
    }
    return true;
}

module.exports = {
    name: 'voice-clone',
    aliases: ['vc', 'clone'],
    description: 'Ghi âm và clone giọng nói của bạn (Record and clone your voice using Fish Audio)',
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

        // --- SUBCOMMAND: STATUS ---
        if (subCommand === 'status') {
            const userDb = await db.getUser(message.author.id);
            if (userDb?.elevenlabs_voice_id) {
                return message.reply(`🎤 Bạn **ĐÃ** có giọng nói clone trên hệ thống (ID: \`${userDb.elevenlabs_voice_id}\`).\nDùng lệnh \`!talk <nội dung>\` để nghe thử!`);
            } else {
                return message.reply('🎤 Bạn **CHƯA** có giọng nói clone trên hệ thống. Hãy vào kênh voice và dùng lệnh \`!voice-clone record\` để tạo.');
            }
        }

        // --- SUBCOMMAND: DELETE ---
        if (subCommand === 'delete') {
            const userDb = await db.getUser(message.author.id);
            if (!userDb?.elevenlabs_voice_id) {
                return message.reply('❌ Bạn chưa có giọng nói clone nào trên hệ thống!');
            }
            const statusMsg = await message.reply('⏳ Đang xóa giọng nói clone của bạn khỏi Fish Audio...');
            try {
                await deleteVoice(apiKey, userDb.elevenlabs_voice_id);
                await db.updateUser(message.author.id, { elevenlabs_voice_id: null });
                await statusMsg.edit('✅ Đã xóa giọng nói clone thành công!');
            } catch (error) {
                console.error('[Voice Delete] Error:', error);
                await statusMsg.edit(`❌ Lỗi khi xóa giọng nói: ${error.message}`);
            }
            return;
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
                    selfDeaf: false,
                });

                await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
            } catch (err) {
                console.error('[Voice Connection] Timeout/Error:', err);
                if (connection) connection.destroy();
                return message.reply('❌ Không thể kết nối tới kênh voice (Connection timeout)');
            }

            const msg = await message.reply('🎤 **Bắt đầu ghi âm!** Hãy đọc to đoạn văn bản sau trong vòng 15 giây:\n\n*"Chào mọi người nha! Mình đang thu âm thử giọng để cài đặt cho con bot Discord này. Hy vọng sau khi clone xong, nghe giọng mình nói sẽ tự nhiên, rõ ràng và mượt mà một chút."*\n\n*(Bot sẽ tự động dừng ghi âm sau 15 giây)*');

            const tempFilePath = path.join(__dirname, `../../temp_voice_${message.author.id}.wav`);

            const audioStream = connection.receiver.subscribe(message.author.id, {
                end: {
                    behavior: EndBehaviorType.Manual
                }
            });

            const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
            const pcmStream = audioStream.pipe(opusDecoder);

            const ffmpegProcess = spawn(FFMPEG_BIN, [
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2',
                '-i', 'pipe:0',
                '-y',
                tempFilePath
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

                    if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
                        throw new Error('Không nhận được âm thanh từ bạn. Hãy đảm bảo bạn đã nói gì đó khi ghi âm.');
                    }

                    // Delete old voice if exists
                    const userDb = await db.getUser(message.author.id);
                    if (userDb?.elevenlabs_voice_id) {
                        try {
                            await deleteVoice(apiKey, userDb.elevenlabs_voice_id);
                        } catch (e) {
                            console.warn('Failed to delete old voice from Fish Audio:', e.message);
                        }
                    }

                    // Upload to Fish Audio with exact transcription text
                    const voiceName = `Discord_Clone_${message.author.id}`;
                    const transcriptText = 'Chào mọi người nha! Mình đang thu âm thử giọng để cài đặt cho con bot Discord này. Hy vọng sau khi clone xong, nghe giọng mình nói sẽ tự nhiên, rõ ràng và mượt mà một chút.';
                    const voiceId = await addVoice(apiKey, voiceName, tempFilePath, transcriptText);

                    // Save model ID to db
                    await db.updateUser(message.author.id, { elevenlabs_voice_id: voiceId });

                    await msg.edit('✅ **Clone giọng thành công!** Giọng của bạn đã được tạo lập trên Fish Audio.\nBây giờ hãy dùng lệnh \`!talk <nội dung>\` để bot nói bằng giọng của chính bạn!');

                } catch (error) {
                    console.error('[Voice Recording] Processing Error:', error);
                    await msg.edit(`❌ **Lỗi khi xử lý giọng nói:** ${error.message}`);
                } finally {
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                        connection.destroy();
                    }
                }
            }, 15000);
        }
    }
};
