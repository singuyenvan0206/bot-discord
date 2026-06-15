const { AttachmentBuilder, PermissionsBitField, ChannelType, OverwriteType } = require('discord.js');
const db = require('../../database');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');

module.exports = {
    name: 'scanperms',
    aliases: ['permissions', 'scanpermissions', 'spm', 'auditperms'],
    description: 'Quét và tạo báo cáo chi tiết về quyền hạn của các Role và Channel (Scan and report permissions)',
    adminOnly: true,
    defer: true,
    cooldown: 15,

    async execute(message, args) {
        const guild = message.guild;
        if (!guild) {
            return message.reply('❌ Lệnh này chỉ hoạt động trong server!');
        }

        const lang = await getLanguage(message.author.id, guild.id);

        try {
            // 1. Gather Server Info
            const owner = await guild.fetchOwner().catch(() => null);
            const totalMembers = guild.memberCount;
            const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);
            const channels = [...guild.channels.cache.values()];

            // Group channels by category
            const categories = channels.filter(c => c.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position);
            const uncategorized = channels.filter(c => !c.parentId && c.type !== ChannelType.GuildCategory).sort((a, b) => a.position - b.position);

            let report = '';
            report += `# 📊 BÁO CÁO KIỂM TOÁN QUYỀN HẠN MÁY CHỦ\n`;
            report += `> **Server:** ${guild.name} (${guild.id})\n`;
            report += `> **Chủ sở hữu:** ${owner ? `${owner.user.username} (${owner.id})` : 'Không xác định'}\n`;
            report += `> **Ngày thực hiện:** ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (Giờ Việt Nam)\n`;
            report += `> **Người thực hiện:** ${message.author.username} (${message.author.id})\n\n`;

            report += `## 📈 THÔNG TIN CHUNG\n`;
            report += `- **Tổng số thành viên:** ${totalMembers}\n`;
            report += `- **Tổng số vai trò (Roles):** ${roles.length}\n`;
            report += `- **Tổng số kênh (Channels):** ${channels.length}\n`;
            report += `  - Kênh văn bản (Text): ${channels.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement).length}\n`;
            report += `  - Kênh thoại (Voice): ${channels.filter(c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).length}\n`;
            report += `  - Danh mục (Categories): ${categories.length}\n\n`;

            // 2. Security Warnings Collector
            const warnings = [];
            const roleAuditLog = [];
            const channelAuditLog = [];

            // Define high privilege permissions
            const HIGH_PERMS = {
                Administrator: { name: '👑 Quản trị viên (Administrator)', flag: PermissionsBitField.Flags.Administrator },
                ManageGuild: { name: '⚙️ Quản lý máy chủ (Manage Server)', flag: PermissionsBitField.Flags.ManageGuild },
                ManageRoles: { name: '🎭 Quản lý vai trò (Manage Roles)', flag: PermissionsBitField.Flags.ManageRoles },
                ManageChannels: { name: '📝 Quản lý kênh (Manage Channels)', flag: PermissionsBitField.Flags.ManageChannels },
                ManageWebhooks: { name: '🌐 Quản lý Webhook (Manage Webhooks)', flag: PermissionsBitField.Flags.ManageWebhooks },
                BanMembers: { name: '🔨 Ban thành viên (Ban Members)', flag: PermissionsBitField.Flags.BanMembers },
                KickMembers: { name: '👢 Kick thành viên (Kick Members)', flag: PermissionsBitField.Flags.KickMembers },
                ModerateMembers: { name: '🔇 Tạm khóa thành viên (Moderate Members)', flag: PermissionsBitField.Flags.ModerateMembers },
                MentionEveryone: { name: '📢 Nhắc tên mọi người (Mention Everyone)', flag: PermissionsBitField.Flags.MentionEveryone },
                ManageMessages: { name: '💬 Quản lý tin nhắn (Manage Messages)', flag: PermissionsBitField.Flags.ManageMessages },
                ViewAuditLog: { name: '📋 Xem nhật ký hoạt động (View Audit Log)', flag: PermissionsBitField.Flags.ViewAuditLog }
            };

            // 3. Roles Audit
            report += `## 🎭 PHÂN TÍCH VAI TRÒ (ROLES AUDIT)\n`;
            report += `Thứ tự vai trò từ cao xuống thấp trong hệ thống phân quyền:\n\n`;

            for (const role of roles) {
                const isEveryone = role.id === guild.id;
                const membersCount = role.members.size;
                const colorHex = role.hexColor;

                // Check high-privilege permissions
                const hasAdmin = role.permissions.has(PermissionsBitField.Flags.Administrator);
                const rolePrivs = [];
                for (const [key, perm] of Object.entries(HIGH_PERMS)) {
                    if (role.permissions.has(perm.flag)) {
                        rolePrivs.push(perm.name);
                    }
                }

                // Add to role log
                let roleDetails = `### 👥 Role: **${role.name}**\n`;
                roleDetails += `- **ID:** \`${role.id}\`\n`;
                roleDetails += `- **Vị trí (Hierarchy Position):** ${role.position}\n`;
                roleDetails += `- **Số thành viên sở hữu:** ${membersCount} thành viên\n`;
                roleDetails += `- **Màu sắc:** \`${colorHex}\`\n`;
                roleDetails += `- **Quyền hạn nâng cao:** ${rolePrivs.length > 0 ? rolePrivs.join(', ') : 'Không có'}\n`;

                // Warning checks for roles
                if (isEveryone) {
                    if (hasAdmin) {
                        warnings.push(`⚠️ **CẢNH BÁO NGUY HIỂM:** Vai trò mặc định \`@everyone\` có quyền **Administrator** (Quản trị viên)!`);
                    } else {
                        // Check if @everyone has other high perms
                        const defaultHighPerms = [];
                        for (const [key, perm] of Object.entries(HIGH_PERMS)) {
                            if (key !== 'Administrator' && role.permissions.has(perm.flag)) {
                                defaultHighPerms.push(perm.name);
                            }
                        }
                        if (defaultHighPerms.length > 0) {
                            warnings.push(`⚠️ **Lưu ý:** Vai trò mặc định \`@everyone\` có các quyền nhạy cảm: ${defaultHighPerms.join(', ')}.`);
                        }
                    }
                } else {
                    if (hasAdmin) {
                        roleDetails += `> 🔴 **Đặc quyền Admin:** Vai trò này có quyền Quản trị viên tối cao.\n`;
                        if (membersCount > 10) {
                            warnings.push(`⚠️ **Rủi ro phân quyền:** Vai trò có quyền Admin **${role.name}** đang được cấp cho rất nhiều người (${membersCount} thành viên).`);
                        }
                    }
                }

                roleDetails += `\n`;
                roleAuditLog.push(roleDetails);
            }

            report += roleAuditLog.join('');

            // 4. Channels Audit
            report += `## 📝 PHÂN TÍCH KÊNH (CHANNELS AUDIT)\n\n`;

            const auditChannel = (channel) => {
                const everyonePerms = channel.permissionsFor(guild.roles.everyone);
                const canEveryoneView = everyonePerms ? everyonePerms.has(PermissionsBitField.Flags.ViewChannel) : false;
                const canEveryoneSend = everyonePerms ? everyonePerms.has(PermissionsBitField.Flags.SendMessages) : false;

                let chanLog = `### 📁 Kênh: **#${channel.name}**\n`;
                chanLog += `- **ID:** \`${channel.id}\`\n`;
                chanLog += `- **Loại:** \`${channel.type === ChannelType.GuildText ? 'Kênh Chữ (Text)' : channel.type === ChannelType.GuildVoice ? 'Kênh Thoại (Voice)' : channel.type === ChannelType.GuildAnnouncement ? 'Kênh Thông Báo' : channel.type === ChannelType.GuildStageVoice ? 'Kênh Sân Khấu' : 'Khác'}\n`;
                chanLog += `- **Trạng thái đối với @everyone:** ${canEveryoneView ? '🔓 Công khai (Public)' : '🔒 Riêng tư (Private)'} | ${canEveryoneSend ? '✍️ Cho phép gửi tin nhắn' : '🚫 Chặn gửi tin nhắn'}\n`;

                // Security Warnings for Channel Names
                const lowercaseName = channel.name.toLowerCase();
                const isSensitiveName = /admin|mod|staff|log|audit|bot-config|owner|setup|database|system|security/.test(lowercaseName);
                const isAnnouncementName = /rule|luat|announcement|thong-bao|news|thông-báo/.test(lowercaseName);

                if (isSensitiveName && canEveryoneView) {
                    warnings.push(`🚨 **LỖ HỔNG BẢO MẬT:** Kênh nhạy cảm **#${channel.name}** đang được hiển thị công khai cho tất cả mọi người (\`@everyone\` có quyền xem kênh).`);
                }

                if (isAnnouncementName && canEveryoneSend && channel.type === ChannelType.GuildText) {
                    warnings.push(`⚠️ **Rủi ro kênh thông tin:** Kênh thông báo/luật lệ **#${channel.name}** cho phép tất cả mọi người gửi tin nhắn.`);
                }

                // Analyze Permission Overwrites
                const overwrites = [...channel.permissionOverwrites.cache.values()];
                if (overwrites.length > 0) {
                    chanLog += `- **Quyền ghi đè (Overrides):**\n`;
                    for (const ov of overwrites) {
                        let targetName = 'Không rõ';
                        let targetType = '';

                        if (ov.type === OverwriteType.Role) {
                            const r = guild.roles.cache.get(ov.id);
                            targetName = r ? r.name : `Vai trò bị xóa (${ov.id})`;
                            targetType = 'Role';
                        } else {
                            const m = guild.members.cache.get(ov.id);
                            targetName = m ? m.user.username : `Thành viên không cache (${ov.id})`;
                            targetType = 'Thành viên (User)';

                            // Warning about member specific overrides
                            if (ov.id !== guild.client.user.id) { // ignore bot itself
                                chanLog += `  - ⚠️ *Ghi đè trực tiếp cho ${targetType} **${targetName}** (ID: ${ov.id})*\n`;
                            }
                        }

                        // Allowed/Denied lists
                        const allowedList = [];
                        const deniedList = [];

                        for (const [key, perm] of Object.entries(HIGH_PERMS)) {
                            if (ov.allow.has(perm.flag)) {
                                allowedList.push(key);
                            }
                            if (ov.deny.has(perm.flag)) {
                                deniedList.push(key);
                            }
                        }

                        if (allowedList.length > 0) {
                            chanLog += `    - Cho phép: \`${allowedList.join(', ')}\`\n`;
                        }
                        if (deniedList.length > 0) {
                            chanLog += `    - Chặn: \`${deniedList.join(', ')}\`\n`;
                        }

                        // Detect if @everyone override grants dangerous perms
                        if (ov.id === guild.id && allowedList.length > 0) {
                            warnings.push(`⚠️ **Ghi đè bất thường:** \`@everyone\` được cho phép trực tiếp các quyền nhạy cảm [${allowedList.join(', ')}] trên kênh **#${channel.name}**.`);
                        }
                    }
                } else {
                    chanLog += `- **Quyền ghi đè (Overrides):** Không có (Kế thừa từ danh mục)\n`;
                }

                chanLog += `\n`;
                return chanLog;
            };

            // Process categorized channels
            for (const category of categories) {
                report += `## 📁 Danh mục: **${category.name.toUpperCase()}**\n\n`;
                const categoryChannels = channels.filter(c => c.parentId === category.id).sort((a, b) => a.position - b.position);
                for (const c of categoryChannels) {
                    report += auditChannel(c);
                }
            }

            // Process uncategorized channels
            if (uncategorized.length > 0) {
                report += `## 📁 Kênh không thuộc danh mục\n\n`;
                for (const c of uncategorized) {
                    report += auditChannel(c);
                }
            }

            // 5. Warnings and Recommendations section (Insert at beginning of report)
            let warningSection = `## 🚨 CẢNH BÁO BẢO MẬT & ĐỀ XUẤT\n`;
            if (warnings.length === 0) {
                warningSection += `✅ **Tuyệt vời!** Không tìm thấy lỗ hổng hoặc rủi ro phân quyền nghiêm trọng nào trên máy chủ này.\n\n`;
            } else {
                warningSection += `Tìm thấy **${warnings.length}** vấn đề cần lưu ý:\n\n`;
                warnings.forEach((warn, index) => {
                    warningSection += `${index + 1}. ${warn}\n`;
                });
                warningSection += `\n### 💡 ĐỀ XUẤT CỦNG CỐ BẢO MẬT:\n`;
                warningSection += `- **Hạn chế Administrator:** Chỉ cấp quyền Administrator cho các vai trò quản trị thực sự tin cậy. Tuyệt đối không cấp quyền này cho @everyone.\n`;
                warningSection += `- **Đóng kênh quản trị:** Kiểm tra lại cài đặt quyền xem kênh của các kênh có chứa thông tin nhạy cảm. Chỉ cho phép các vai trò Quản lý/Admin nhìn thấy.\n`;
                warningSection += `- **Chặn ghi đè thành viên:** Nên phân quyền theo vai trò (Roles) thay vì cấp quyền ghi đè trực tiếp cho từng thành viên cụ thể để dễ dàng quản lý và kiểm toán.\n`;
                warningSection += `- **Bảo vệ kênh thông báo:** Cấu hình quyền gửi tin nhắn (Send Messages) ở trạng thái tắt đối với @everyone trong các kênh thông báo chính thức.\n\n`;
            }

            // Reconstruct the final report with the Warnings at the top
            const finalReport = report.replace(`## 📈 THÔNG TIN CHUNG\n`, `${warningSection}## 📈 THÔNG TIN CHUNG\n`);

            // Create Attachment
            const buffer = Buffer.from(finalReport, 'utf-8');
            const file = new AttachmentBuilder(buffer, { name: `permissions_report_${guild.id}.md` });

            // Prepare summary message for response
            const summaryEmbed = {
                color: warnings.length > 0 ? 0xED4245 : 0x57F287, // Red if warnings, Green if clean
                title: `📊 Kết Quả Quét Quyền Máy Chủ`,
                description: `Hệ thống đã hoàn tất quét và đánh giá toàn diện cấu hình phân quyền của server **${guild.name}**.\n\n` +
                             `• **Tổng số Role:** ${roles.length}\n` +
                             `• **Tổng số Channel:** ${channels.length}\n` +
                             `• **Vấn đề bảo mật phát hiện:** ${warnings.length > 0 ? `⚠️ **${warnings.length}** lỗi/nguy cơ` : '✅ An toàn'}\n\n` +
                             `*Chi tiết báo cáo kiểm toán quyền hạn đã được tạo và gửi kèm dưới dạng file Markdown ở bên dưới. Bạn có thể tải về máy và mở bằng các trình đọc Markdown hoặc Text Editor.*`,
                timestamp: new Date().toISOString(),
                footer: {
                    text: `Lệnh thực hiện bởi ${message.author.username}`
                }
            };

            await message.reply({ embeds: [summaryEmbed], files: [file] });

        } catch (error) {
            console.error('[ScanPerms Error]', error);
            await message.reply(`❌ Đã xảy ra lỗi trong quá trình quét quyền hạn: \`${error.message}\``);
        }
    }
};
