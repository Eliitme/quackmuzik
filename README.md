# QuackMuzik 🦆🎵

Discord music bot built with Lavalink, supporting multiple music platforms (YouTube, Spotify, Apple Music, SoundCloud, Deezer, and more) with text-to-speech capabilities.

## ✨ Features

### 🎵 Multi-Platform Music Support
- ✅ **YouTube** / YouTube Music - No API key required (uses yt-cipher)
- ✅ **Spotify** - Tracks, playlists, albums (requires Client ID/Secret - free)
- ✅ **Apple Music** - Full catalog (requires Apple Developer account)
- ✅ **SoundCloud** - No API key required
- ✅ **Deezer** - Basic functionality without key
- ✅ **Yandex Music** - Popular in Russia/CIS region
- ✅ **Bandcamp, Twitch, Vimeo** - Built-in support
- ✅ **HTTP streams** - Direct audio links

### 🎤 Text-to-Speech
- ✅ **FloweryTTS** integration via Lavalink plugin
- ✅ Configurable voice, speed, and translation settings

### 🎛️ Music Controls
- ✅ Queue management with multiple commands
- ✅ Play, skip, jump, seek functionality
- ✅ Now playing and queue display
- ✅ Automatic player cleanup when queue ends
- ✅ User playlist management (create, add, remove, play)
- ✅ Play history tracking per server

### 📊 Centralized Logging
- ✅ Structured JSON logs with timestamps
- ✅ Command execution tracking (user, guild, channel)
- ✅ Lavalink event logging
- ✅ Debug mode support

### 🌐 Internationalization (i18n)
- ✅ Multi-language support (Vietnamese, English)
- ✅ Per-server language configuration
- ✅ Localized command responses and error messages

### ⚙️ Server Configuration
- ✅ Customizable bot prefix per server
- ✅ Language/locale settings per server
- ✅ Permission-based command access
- ✅ Cooldown system for rate limiting

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Discord Bot Token
- Discord Bot Client ID

### Invite Bot to Your Server

**Required Permissions:**
- ✅ **Connect** - Join voice channels
- ✅ **Speak** - Play audio in voice channels
- ✅ **Send Messages** - Send command responses
- ✅ **Embed Links** - Display rich embeds
- ✅ **Read Message History** - Read commands in channels

**Invite Link:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to **OAuth2** → **URL Generator**
4. Select scopes: `bot` and `applications.commands` (if using slash commands)
5. Select permissions:
   - Connect (Voice)
   - Speak (Voice)
   - Send Messages
   - Embed Links
   - Read Message History
6. Copy the generated URL and open it in your browser to invite the bot

**Or use this direct invite (replace `YOUR_CLIENT_ID` with your bot's Client ID):**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3147776&scope=bot
```

**Required Gateway Intents (enable in Discord Developer Portal → Bot → Privileged Gateway Intents):**
- ✅ **MESSAGE CONTENT INTENT** - Required to read command messages
- ✅ **Server Members Intent** - Optional (not currently used)
- ✅ **Presence Intent** - Optional (not currently used)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd QuackMuzik
   ```

2. **Create `.env` file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**

   **Required:**
   - `DISCORD_TOKEN`: Your Discord bot token
   - `DISCORD_CLIENT_ID`: Your Discord bot client ID

   **Lavalink Configuration:**
   - `LAVALINK_SERVER_PASSWORD`: Lavalink server password (default: `youshallnotpass`)
   - `LAVALINK_HOST`: Lavalink host (default: `lavalink`)
   - `LAVALINK_PORT`: Lavalink port (default: `2333`)

   **Database Configuration:**
   - `DB_HOST`: Database host (default: `postgres`)
   - `DB_PORT`: Database port (default: `5432`)
   - `DB_NAME`: Database name (default: `quackmuzik`)
   - `DB_USER`: Database user (default: `postgres`)
   - `DB_PASSWORD`: Database password (default: `postgres`)

   **Optional (for music platforms):**
   - `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET`: For Spotify support
   - `APPLE_MUSIC_API_TOKEN`: For Apple Music support
   - `DEEZER_MASTER_KEY`: For full Deezer access
   - `YANDEX_MUSIC_TOKEN`: For Yandex Music support
   - `VK_USER_TOKEN`: For VK Music support
   - `TIDAL_TOKEN` & `TIDAL_REFRESH_TOKEN`: For Tidal support
   - `QOBUZ_OAUTH_TOKEN` & `QOBUZ_APP_ID`: For Qobuz support
   - `YOUTUBE_OAUTH_REFRESH_TOKEN`: For better YouTube access (optional)

   **Optional (for monitoring/error tracking):**
   - `SENTRY_DSN`: Sentry DSN for error tracking
   - `SENTRY_ENVIRONMENT`: Sentry environment (e.g., `production`, `development`)
   - `BOT_OWNER_ID`: Discord user ID for system commands
   - `DEBUG`: Set to `true` to enable debug logs

4. **Start the bot**
   ```bash
   docker-compose up -d
   ```

The bot, Lavalink server, and yt-cipher service will start automatically!

## 🚀 CI/CD with GitHub Actions

The repository includes GitHub Actions workflows for automated building and deployment.

### Automatic Build and Deploy

**Workflow: `.github/workflows/deploy.yml`**

- **Triggers:**
  - Push tags (e.g., `v1.0.0`) → Builds and deploys with version
  - **Only tags trigger auto deployment**
  - Pull requests → Builds only (no deploy)

- **Steps:**
  1. Build bot Docker image
  2. Build yt-cipher Docker image
  3. Push images to GitHub Container Registry
  4. Deploy to Kubernetes using Helm (only on tags)

### Build Only Workflow

**Workflow: `.github/workflows/build-only.yml`**

- Builds images for feature branches without deploying

### Setup

1. **Configure GitHub Secrets:**
   - Go to Repository Settings → Secrets and variables → Actions
   - Add required secrets (see `.github/workflows/README.md`)

2. **Required Secrets:**
   - `KUBECONFIG`: Kubernetes cluster configuration
   - `DISCORD_TOKEN`: Discord bot token
   - `DISCORD_CLIENT_ID`: Discord bot client ID

3. **Push to production branch:**
   ```bash
   git push origin production
   ```
   The workflow will automatically build and deploy!

See `.github/workflows/README.md` for detailed documentation.

## ☸️ Kubernetes Deployment (Helm)

### Prerequisites
- Kubernetes 1.19+
- Helm 3.0+
- kubectl configured to access your cluster

### Quick Start

1. **Build and push Docker images**
   ```bash
   # Build bot image
   docker build -t your-registry/quackmuzik-bot:latest .
   docker push your-registry/quackmuzik-bot:latest

   # Build yt-cipher image
   cd yt-cipher
   docker build -t your-registry/quackmuzik-yt-cipher:latest .
   docker push your-registry/quackmuzik-yt-cipher:latest
   ```

2. **Install with Helm**
   ```bash
   # Install with secrets via --set
   helm install quackmuzik ./helm/quackmuzik \
     --set secrets.discordToken="YOUR_DISCORD_TOKEN" \
     --set secrets.discordClientId="YOUR_CLIENT_ID" \
     --set bot.image.repository="your-registry/quackmuzik-bot" \
     --set ytCipher.image.repository="your-registry/quackmuzik-yt-cipher"

   # Or use a values file
   helm install quackmuzik ./helm/quackmuzik -f my-values.yaml
   ```

3. **Check deployment status**
   ```bash
   kubectl get pods -l app.kubernetes.io/name=quackmuzik
   kubectl logs -l app.kubernetes.io/component=bot
   ```

### Configuration

Edit `helm/quackmuzik/values.yaml` or create a custom values file:

```yaml
bot:
  image:
    repository: your-registry/quackmuzik-bot
    tag: latest
  resources:
    limits:
      memory: 1Gi
      cpu: 1000m

lavalink:
  persistence:
    enabled: true
    size: 20Gi
    storageClass: fast-ssd
```

See `helm/quackmuzik/README.md` for detailed documentation.

## 📖 Commands

**Prefix:** `z!`

### Music Commands

- **`z!play <link hoặc từ khóa>`** (aliases: `p`)
  - Play music from various platforms or search YouTube
  - Examples:
    ```
    z!play never gonna give you up
    z!play https://www.youtube.com/watch?v=dQw4w9WgXcQ
    z!play https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
    ```

- **`z!stop`** (aliases: `s`, `leave`, `disconnect`)
  - Stop playback and leave voice channel

- **`z!skip`** (aliases: `s`, `next`)
  - Skip current track
  - Automatically ends playback if it's the last track

- **`z!queue`** (aliases: `q`, `list`)
  - Display current queue with pagination
  - Usage: `z!queue [page]`

- **`z!nowplaying`** (aliases: `np`, `current`)
  - Show currently playing track information

- **`z!jump <số thứ tự>`** (aliases: `j`, `skipto`)
  - Jump to a specific track in the queue
  - Example: `z!jump 5`

- **`z!seek <thời gian>`** (aliases: `scrub`, `position`)
  - Seek to a specific time in the current track
  - Formats: `1:30`, `90`, `2:15:30`
  - Example: `z!seek 1:30`

### Text-to-Speech

- **`z!speak <nội dung>`** (aliases: `tts`)
  - Convert text to speech using FloweryTTS
  - Example: `z!speak Xin chào mọi người!`
  - Note: Requires FloweryTTS plugin enabled in Lavalink config

- **`z!playlist <subcommand> [args]`** (aliases: `pl`)
  - Manage your playlists
  - Subcommands:
    - `create <name> [description]` - Create a new playlist
    - `list` - List all your playlists
    - `add <playlist> <track>` - Add a track to playlist
    - `remove <playlist> <position>` - Remove track from playlist
    - `delete <playlist>` - Delete a playlist
    - `show <playlist>` - Show playlist details
    - `play <playlist>` - Play a playlist
  - Examples:
    ```
    z!playlist create MyFavorites
    z!playlist add MyFavorites https://www.youtube.com/watch?v=dQw4w9WgXcQ
    z!playlist play MyFavorites
    ```

### Admin Commands

- **`z!prefix [prefix mới]`** (aliases: `setprefix`)
  - View or change bot prefix for this server
  - Requires: Manage Server permission
  - Example: `z!prefix !`

- **`z!locale [ngôn ngữ]`** (aliases: `language`, `lang`)
  - View or change bot language (vi/en) for this server
  - Requires: Manage Server permission
  - Example: `z!locale en`

- **`z!help [command]`** (aliases: `h`, `commands`)
  - Show all commands or help for a specific command
  - Example: `z!help play`

### System Commands

- **`z!guilds`** (aliases: `servers`, `guildinfo`)
  - Show information about servers bot is in
  - Owner-only command

## ⚙️ Configuration

### Lavalink Configuration

Edit `lavalink/application.yml` to configure:
- Music platform sources
- FloweryTTS settings (voice, speed, translate)
- YouTube plugin settings
- Logging levels

### FloweryTTS Setup

To enable TTS, ensure in `lavalink/application.yml`:
```yaml
plugins:
  floweryTts:
    enabled: true
    voice: '3edfe2d3-45fb-5f89-9689-7b79d77b65d7'
    translate: false
    silence: 0
    speed: 1.0
    audioFormat: 'mp3'
```

### YouTube Cipher

The bot uses [yt-cipher](https://github.com/kikkia/yt-cipher) for YouTube signature decryption:
- ✅ No OAuth2 required (works without OAuth token)
- ✅ No poToken needed
- ✅ Public instance available at `https://cipher.kikkia.dev/`
- ✅ Self-hosted option included in docker-compose

**YouTube OAuth (Optional):**
- `YOUTUBE_OAUTH_REFRESH_TOKEN` is optional but recommended for better YouTube access
- **Without OAuth token**: Most videos will work, but some restricted/age-restricted videos may fail
- **With OAuth token**: Better access to all YouTube content, including restricted videos
- **Configuration**: OAuth is automatically disabled if no token is provided (prevents startup errors)
- **Note**: Using OAuth tokens can pose risks, including potential account termination. Use a secondary or burner account for OAuth authentication.

**YouTube Client Fallback:**
The bot uses multiple YouTube clients in fallback order:
1. `MUSIC` - YouTube Music client (best for music videos, supports `ytmsearch:`)
2. `ANDROID_VR` - Android VR client (good fallback)
3. `ANDROID` - Android client (additional fallback, may be restricted)
4. `WEB` - Web client (fallback for public videos)
5. `IOS` - iOS client (additional fallback)
6. `TVHTML5EMBEDDED` - TV/Embedded client (requires OAuth, supports livestreams, best for restricted videos)

If one client fails, the bot automatically tries the next client in the list.

**Advanced Options:**

1. **OAuth Token Generator:**
   - Use [YouTube OAuth Token Generator](https://youfresh.thiranjaya.com/) to easily generate refresh tokens
   - Recommended to use a secondary or burner account to avoid risks
   - Add the generated token to `.env` as `YOUTUBE_OAUTH_REFRESH_TOKEN`

2. **IP Rotation (Optional):**
   - Helps avoid rate limiting and access issues
   - Requires IP blocks in CIDR notation (e.g., `1.0.0.0/8`)
   - Available strategies: `RotateOnBan`, `LoadBalance`, `NanoSwitch`, `RotatingNanoSwitch`
   - Configure in `lavalink/application.yml` under `lavalink.server.ratelimit`
   - Only useful if you have multiple IP addresses available

## 📊 Logging

All logs are output in structured JSON format with timestamps:

```json
{
  "ts": "2025-10-29T07:25:10.123Z",
  "level": "info",
  "message": "Command execute",
  "command": "play",
  "userId": "123",
  "guildId": "456",
  "channelId": "789"
}
```

### View Logs

```bash
# Bot logs
docker-compose logs -f bot

# Lavalink logs
docker-compose logs -f lavalink

# All services
docker-compose logs -f
```

## 🛠️ Development

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Using Docker Compose
   docker-compose up -d postgres

   # Or use your own PostgreSQL instance
   # Update DB_* environment variables accordingly
   ```

4. **Build TypeScript**
   ```bash
   npm run build
   ```

5. **Run in development mode**
   ```bash
   npm run dev
   ```

### Development Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run compiled JavaScript
- `npm run dev` - Run with hot-reload (ts-node-dev)
- `npm run watch` - Watch mode for TypeScript compilation
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Project Structure

```
QuackMuzik/
├── src/                          # Source code
│   ├── index.ts                  # Bot entry point
│   ├── types/
│   │   └── Command.ts            # Command interface and types
│   ├── commands/                 # Command implementations
│   │   ├── index.ts              # Command registry
│   │   ├── music/                # Music commands
│   │   │   ├── play.ts           # Play music
│   │   │   ├── stop.ts           # Stop playback
│   │   │   ├── skip.ts           # Skip track
│   │   │   ├── queue.ts          # Queue management
│   │   │   ├── nowplaying.ts     # Now playing info
│   │   │   ├── jump.ts           # Jump to track
│   │   │   ├── seek.ts           # Seek in track
│   │   │   ├── speak.ts          # Text-to-speech
│   │   │   └── playlist.ts       # Playlist management
│   │   ├── admin/                # Admin commands
│   │   │   ├── help.ts           # Help command
│   │   │   ├── prefix.ts         # Prefix configuration
│   │   │   └── locale.ts         # Language configuration
│   │   └── system/               # System commands
│   │       ├── debug.ts           # Debug command (optional)
│   │       └── guilds.ts          # Guild information
│   ├── events/                    # Event handlers
│   │   ├── index.ts               # Event registry
│   │   ├── ready.ts               # Bot ready event
│   │   ├── messageCreate.ts       # Command handler
│   │   ├── raw.ts                 # Raw Discord events
│   │   └── lavalink.ts            # Lavalink events
│   ├── locales/                   # Translation files
│   │   ├── vi.json                # Vietnamese translations
│   │   └── en.json                # English translations
│   └── utils/                     # Utility functions
│       ├── logger.ts              # Centralized logging
│       ├── database.ts            # Database operations
│       ├── i18n.ts                # Internationalization
│       ├── embed.ts               # Embed creation
│       ├── formatTime.ts          # Time formatting
│       ├── cooldown.ts            # Cooldown management
│       ├── permissions.ts         # Permission utilities
│       ├── env.ts                 # Environment variables
│       └── spectrum.ts            # Spectrum analyzer (optional)
├── lavalink/                      # Lavalink configuration
│   ├── application.yml            # Lavalink config
│   ├── logs/                      # Lavalink logs
│   └── tokens/                    # Lavalink tokens
├── helm/                          # Kubernetes Helm charts
│   └── quackmuzik/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── README.md
│       └── templates/              # K8s templates
│           ├── bot-deployment.yaml
│           ├── lavalink-deployment.yaml
│           ├── yt-cipher-deployment.yaml
│           └── ...
├── yt-cipher/                      # yt-cipher service
│   └── Dockerfile
├── docs/                           # Documentation
│   └── BOT_SETUP.md
├── docker-compose.yml              # Docker Compose config
├── Dockerfile                      # Bot container image
├── tsconfig.json                   # TypeScript config
├── package.json                    # Dependencies
├── LICENSE                         # Non-commercial license
├── TERMS_OF_SERVICE.md             # Terms of Service
├── DISCLAIMER.md                   # Disclaimer
└── README.md                       # This file
```

### Adding New Commands

1. Create command file in `src/commands/`:
   ```typescript
   import { Command } from '../types/Command';

   export const myCommand: Command = {
     name: 'mycommand',
     description: 'My command description',
     usage: 'z!mycommand <args>',
     aliases: ['mc'],

     async execute({ message, args, lavalinkManager }) {
       // Command logic
     },
   };
   ```

2. Register in `src/commands/index.ts`:
   ```typescript
   import { myCommand } from './mycommand';

   const commandList = [
     // ... existing commands
     myCommand,
   ];
   ```

The command will automatically appear in `z!help`!

### Command Categories

Commands are organized into three categories:

- **`music`**: Music playback and queue management commands
- **`admin`**: Server administration commands (require Manage Server permission)
- **`system`**: System/debug commands (owner-only)

### Command Features

- **Aliases**: Commands can have multiple aliases for convenience
- **Permissions**: Commands can require specific Discord permissions
- **Guild-only**: Commands can be restricted to guilds only
- **Cooldown**: Commands support per-user cooldown (default: 10 seconds)
- **i18n**: All user-facing messages support multiple languages

## 🔀 Git Workflow

### Branch Strategy

This project follows a simplified Git Flow with the following merge order:

**Merge Workflow:**
```
feature/* → development → production → tags
```

**Branch Details:**

- **`feature/*`**: Feature branches
  - Example: `feature/add-volume-command`
  - Create from `development`
  - Merge to `development` when complete
  - First step in the merge workflow

- **`development`**: Development branch
  - Integration branch for features
  - Receives merges from `feature/*` branches
  - Test before merging to `production`
  - Active development and testing
  - Second step: merge to `production` when ready

- **`production`**: Production-ready code
  - Protected branch
  - Stable, tested code for production use
  - Receives merges from `development` branch
  - Third step: create tags from this branch
  - **Tags are created from this branch for deployment**

- **Tags**: Version releases
  - Example: `v1.0.0`, `v1.1.0`
  - Created from `production` branch
  - Used for versioning and releases
  - **Only tags trigger auto deployment to production**
  - Final step: triggers deployment

**Special Branches:**

- **`hotfix/*`**: Hotfix branches
  - Example: `hotfix/fix-play-command`
  - Create from `production` for urgent fixes
  - Merge to both `production` and `development`
  - Bypasses normal workflow for critical fixes

- **`release/*`**: Release branches (optional)
  - Example: `release/v1.1.0`
  - For preparing releases
  - Merge to `production` and `development`
  - Used for release preparation and testing

### Commit Message Convention

Follow conventional commits format:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: add playlist management command
fix: resolve queue pagination issue
docs: update README with new commands
refactor: improve database query performance
```

### Pull Request Process

**Step 1: Feature Branch → Development**
1. **Create a feature branch** from `development`
   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and create Pull Request**
   ```bash
   git push origin feature/my-feature
   ```
   - Create PR to `development` branch
   - Fill out PR template
   - Wait for review and CI checks

4. **After approval, merge to development**
   - Squash and merge recommended
   - Delete feature branch after merge

**Step 2: Development → Production**

5. **When ready for production, merge development to production**
   ```bash
   git checkout production
   git pull origin production
   git merge development
   git push origin production
   ```
   - Or create PR from `development` to `production`
   - Review and test before merging
   - Production branch is protected

**Step 3: Production → Tags (Deployment)**

6. **Create a tag from production for deployment**
   ```bash
   git checkout production
   git pull origin production
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```
   - Tag triggers auto deployment
   - Use semantic versioning (e.g., `v1.0.0`, `v1.1.0`)
   - Tags are immutable and represent production releases

### CI/CD Pipeline

**GitHub Actions Workflows:**

1. **`.github/workflows/deploy.yml`**
   - Triggers: Push tags only (e.g., `v1.0.0`)
   - Builds Docker images
   - Pushes to container registry
   - Deploys to Kubernetes (only on tags)

2. **`.github/workflows/build-only.yml`**
   - Triggers: Push to feature branches or PRs
   - Builds Docker images only
   - No deployment

**Workflow Steps:**
1. Checkout code
2. Set up Node.js
3. Install dependencies
4. Run linting/formatting checks
5. Build TypeScript
6. Build Docker images
7. Push to registry (on tags)
8. Deploy to Kubernetes (on tags only)

## 🔧 Management

### Restart Services
```bash
docker-compose restart
```

### Stop Services
```bash
docker-compose down
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build
```

### View Service Status
```bash
docker-compose ps
```

## 🐛 Troubleshooting

### Bot not responding to commands
- ✅ **Check MESSAGE CONTENT INTENT is enabled** in Discord Developer Portal → Bot → Privileged Gateway Intents
- ✅ **Verify bot has proper permissions** in the server:
  - Connect (Voice)
  - Speak (Voice)
  - Send Messages
  - Embed Links
  - Read Message History
- ✅ **Check bot is in the server** - Verify bot appears in member list
- ✅ **Check prefix** - Default prefix is `z!` (can be changed with `z!prefix`)
- ✅ **Check bot logs**: `docker-compose logs bot`

### Music not playing
- ✅ Ensure bot has Connect and Speak permissions in voice channel
- ✅ Check Lavalink is running: `docker-compose logs lavalink`
- ✅ Verify port 2333 is not blocked

### TTS not working
- ✅ Verify FloweryTTS plugin is enabled in `lavalink/application.yml`
- ✅ Restart Lavalink after config changes: `docker-compose restart lavalink`

### YouTube playback issues
- ✅ Check yt-cipher service is healthy: `docker-compose ps yt-cipher`
- ✅ Verify yt-cipher endpoint in Lavalink config
- ✅ **Some YouTube links not working?**
  - This is normal - some videos require OAuth authentication
  - **Solution 1**: Add `YOUTUBE_OAUTH_REFRESH_TOKEN` to `.env` for better access (optional)
    - Generate token using [YouTube OAuth Token Generator](https://youfresh.thiranjaya.com/)
    - Use a secondary/burner account to avoid risks
  - **Solution 2**: The bot automatically tries multiple clients (MUSIC → ANDROID_VR → ANDROID → WEB → IOS → TVHTML5EMBEDDED)
    - With OAuth token, `TVHTML5EMBEDDED` client can bypass many restrictions
  - **Solution 3**: Check Lavalink logs: `docker-compose logs lavalink` for specific error messages
  - **Solution 4** (Advanced): Configure IP rotation if you have multiple IP addresses
    - Edit `lavalink/application.yml` and uncomment `ratelimit` section
    - Add your IP blocks in CIDR notation
  - **Note**: Age-restricted, region-restricted, or private videos may not work without OAuth

## 📊 Database Schema

The bot uses PostgreSQL to store the following data:

### Tables

- **`guild_prefixes`**: Custom prefixes per server
  - `guild_id` (VARCHAR(20), PRIMARY KEY)
  - `prefix` (VARCHAR(10))
  - `updated_at` (TIMESTAMP)

- **`guild_settings`**: Server settings
  - `guild_id` (VARCHAR(20), PRIMARY KEY)
  - `locale` (VARCHAR(5), default: 'vi')
  - `updated_at` (TIMESTAMP)

- **`play_history`**: Track play history
  - `id` (SERIAL, PRIMARY KEY)
  - `guild_id` (VARCHAR(20))
  - `track_title`, `track_author`, `track_uri`, `track_identifier`
  - `track_duration_ms`, `track_source_name`
  - `requester_id` (VARCHAR(20))
  - `played_at` (TIMESTAMP)

- **`user_playlists`**: User-created playlists
  - `id` (SERIAL, PRIMARY KEY)
  - `user_id` (VARCHAR(20))
  - `guild_id` (VARCHAR(20), nullable)
  - `name` (VARCHAR(100))
  - `description` (TEXT)
  - `is_public` (BOOLEAN, default: false)
  - `created_at`, `updated_at` (TIMESTAMP)

- **`playlist_tracks`**: Tracks in playlists
  - `id` (SERIAL, PRIMARY KEY)
  - `playlist_id` (INTEGER, FOREIGN KEY)
  - `track_uri`, `track_identifier`, `track_title`, `track_author`
  - `track_duration_ms`, `track_source_name`
  - `position` (INTEGER)
  - `added_at` (TIMESTAMP)
  - `added_by` (VARCHAR(20))

All tables are automatically created on first run via `ensureSchema()`.

## 📝 License

This project is licensed under a **Non-Commercial License**. See [LICENSE](LICENSE) for details.

**Key Points:**
- ✅ Free for personal and educational use
- ✅ Free for non-profit organizations
- ❌ **Commercial use is prohibited** without explicit permission
- 📄 See [LICENSE](LICENSE) for full terms

## ⚖️ Legal

- **[Terms of Service](TERMS_OF_SERVICE.md)** - Usage terms and conditions
- **[Disclaimer](DISCLAIMER.md)** - Important disclaimers and limitations
- **[License](LICENSE)** - Non-commercial license terms

**By using this bot, you agree to be bound by the Terms of Service and Disclaimer.**

## 🙏 Credits

- [Lavalink](https://github.com/lavalink-devs/Lavalink) - Audio player framework
- [yt-cipher](https://github.com/kikkia/yt-cipher) - YouTube signature decryption
- [lavasrc-plugin](https://github.com/topi314/LavaSrc) - Multi-platform music source
- [youtube-plugin](https://github.com/lavalink-devs/youtube-plugin) - YouTube support

