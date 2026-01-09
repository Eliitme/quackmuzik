# Bot Setup Guide

Hướng dẫn thiết lập bot để đảm bảo hoạt động đúng khi được invite vào server.

## 🔐 Gateway Intents

Bot cần các Gateway Intents sau để hoạt động:

### Required Intents

1. **Guilds** ✅
   - Để bot có thể truy cập thông tin về guilds (servers)
   - Đã được enable trong `src/index.ts`

2. **GuildVoiceStates** ✅
   - Để bot có thể kết nối và quản lý voice channels
   - Đã được enable trong `src/index.ts`

3. **GuildMessages** ✅
   - Để bot có thể đọc messages trong guild channels
   - Đã được enable trong `src/index.ts`

4. **MessageContent** ✅ **PRIVILEGED INTENT**
   - **BẮT BUỘC** để bot có thể đọc nội dung messages (commands)
   - Đã được enable trong `src/index.ts`
   - **Phải enable trong Discord Developer Portal:**
     - Vào [Discord Developer Portal](https://discord.com/developers/applications)
     - Chọn bot application
     - Vào **Bot** → **Privileged Gateway Intents**
     - Bật **MESSAGE CONTENT INTENT**

### Optional Intents (Not Currently Used)

- **Server Members Intent** - Không cần thiết
- **Presence Intent** - Không cần thiết

## 🔑 Bot Permissions

Bot cần các permissions sau để hoạt động đầy đủ:

### Required Permissions

1. **Connect** (1048576)
   - Cho phép bot join voice channels
   - **BẮT BUỘC** cho tất cả music commands

2. **Speak** (2097152)
   - Cho phép bot phát audio trong voice channels
   - **BẮT BUỘC** cho music playback

3. **Send Messages** (2048)
   - Cho phép bot gửi messages
   - **BẮT BUỘC** cho command responses

4. **Embed Links** (16384)
   - Cho phép bot gửi rich embeds
   - **BẮT BUỘC** cho queue, nowplaying, và các embeds khác

5. **Read Message History** (65536)
   - Cho phép bot đọc message history
   - **BẮT BUỘC** để bot có thể đọc commands

### Permission Integer

Tổng permissions: **3147776**

```
Connect (1048576) + Speak (2097152) + Send Messages (2048) + Embed Links (16384) + Read Message History (65536) = 3147776
```

## 📋 Invite Bot Checklist

Trước khi invite bot, đảm bảo:

- [ ] Bot đã được tạo trong [Discord Developer Portal](https://discord.com/developers/applications)
- [ ] Bot token đã được lấy và set trong environment variable `DISCORD_TOKEN`
- [ ] Bot Client ID đã được lấy và set trong environment variable `DISCORD_CLIENT_ID`
- [ ] **MESSAGE CONTENT INTENT** đã được enable trong Discord Developer Portal → Bot → Privileged Gateway Intents
- [ ] Invite link đã được tạo với đúng permissions (3147776)
- [ ] Bot đã được invite vào server
- [ ] Bot có quyền truy cập vào:
  - Text channels (để đọc commands)
  - Voice channels (để phát nhạc)

## 🔗 Invite Link

### Cách 1: Sử dụng Discord Developer Portal

1. Vào [Discord Developer Portal](https://discord.com/developers/applications)
2. Chọn bot application
3. Vào **OAuth2** → **URL Generator**
4. Chọn scopes:
   - ✅ `bot`
   - ✅ `applications.commands` (nếu sử dụng slash commands)
5. Chọn permissions:
   - ✅ Connect (Voice)
   - ✅ Speak (Voice)
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
6. Copy URL và mở trong browser để invite bot

### Cách 2: Sử dụng Direct Link

Thay `YOUR_CLIENT_ID` bằng Client ID của bot:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3147776&scope=bot
```

## ✅ Verification

Sau khi invite bot, kiểm tra:

1. **Bot xuất hiện trong member list** ✅
2. **Bot có thể đọc commands** - Test với `z!help`
3. **Bot có thể join voice channel** - Test với `z!play <song>`
4. **Bot có thể phát nhạc** - Verify audio playback
5. **Bot có thể gửi embeds** - Check queue, nowplaying commands

## 🐛 Troubleshooting

### Bot không phản hồi commands

- ✅ Kiểm tra **MESSAGE CONTENT INTENT** đã được enable
- ✅ Kiểm tra bot có permissions **Send Messages** và **Read Message History**
- ✅ Kiểm tra prefix (mặc định: `z!`)
- ✅ Kiểm tra bot logs: `docker-compose logs bot`

### Bot không thể join voice channel

- ✅ Kiểm tra bot có permissions **Connect** và **Speak**
- ✅ Kiểm tra bot có quyền truy cập voice channel
- ✅ Kiểm tra Lavalink server đang chạy: `docker-compose logs lavalink`

### Bot không thể phát nhạc

- ✅ Kiểm tra bot đã join voice channel
- ✅ Kiểm tra bot có permission **Speak**
- ✅ Kiểm tra Lavalink connection: `docker-compose logs lavalink`
- ✅ Kiểm tra yt-cipher service: `docker-compose ps yt-cipher`

## 📝 Notes

- **Không cần Administrator permission** - Bot chỉ cần các permissions tối thiểu được liệt kê ở trên
- **Permissions có thể được set per-channel** - Bot chỉ cần permissions trong channels mà nó được sử dụng
- **Gateway Intents phải được enable trước khi bot start** - Nếu không, bot sẽ không thể đọc message content

---

**Last Updated:** 2026-01-10
**Status:** ✅ All intents and permissions properly configured

