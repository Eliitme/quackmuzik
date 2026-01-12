# Terms of Service - QuackMuzik Bot

**Last Updated:** January 10, 2026

## 1. Acceptance of Terms

By inviting, using, or interacting with QuackMuzik Bot ("the Bot", "we", "us", "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the Bot.

## 2. Description of Service

QuackMuzik is a Discord music bot that provides the following services:

- **Music Playback**: Stream music from various platforms including YouTube, Spotify, Apple Music, SoundCloud, Deezer, Yandex Music, Bandcamp, Twitch, Vimeo, and HTTP streams
- **Text-to-Speech**: Convert text to speech using FloweryTTS integration
- **Queue Management**: Manage music queues with play, skip, jump, seek, and queue display features
- **Playlist Management**: Create, manage, and play user-created playlists (per-guild or global, public or private)
- **Play History**: Track and store play history for each server
- **Server Configuration**: Customize bot prefix and language settings (Vietnamese/English) per Discord server
- **Internationalization**: Support for multiple languages (Vietnamese and English)

## 3. User Responsibilities

### 3.1 Proper Use
You agree to use the Bot only for lawful purposes and in accordance with these Terms. You agree not to:

- Use the Bot to stream copyrighted content without proper authorization
- Use the Bot in violation of any applicable laws or regulations
- Attempt to reverse engineer, decompile, or disassemble the Bot
- Use automated systems or bots to interact with the Bot
- Abuse, spam, or overload the Bot's commands
- Use the Bot to harass, threaten, or harm others
- Violate Discord's Terms of Service or Community Guidelines

### 3.2 Required Permissions
To use the Bot, you must grant the following permissions in your Discord server:

- **Connect** - Join voice channels
- **Speak** - Play audio in voice channels
- **Send Messages** - Send command responses
- **Embed Links** - Display rich embeds
- **Read Message History** - Read commands in channels

### 3.3 Server Administrator Responsibilities
Server administrators are responsible for:

- Ensuring compliance with these Terms by all server members
- Properly configuring bot permissions
- Monitoring bot usage within their servers
- Removing the Bot if it violates their server rules

## 4. Data Collection and Privacy

### 4.1 Data We Collect
The Bot collects and stores the following data in a PostgreSQL database:

- **Guild (Server) Data**:
  - Guild ID
  - Custom prefix (stored in `guild_prefixes` table)
  - Language preference/locale (stored in `guild_settings` table, supports 'vi' for Vietnamese and 'en' for English)

- **User Data**:
  - User IDs associated with command usage
  - User IDs of playlist creators and track requesters

- **Play History**:
  - Track titles, authors, URIs, identifiers, durations, source names
  - Requester IDs
  - Timestamps of when tracks were played
  - Stored in `play_history` table per guild

- **User Playlists**:
  - Playlist names, descriptions, visibility settings (public/private)
  - Guild association (playlists can be per-guild or global)
  - Creation and update timestamps
  - Stored in `user_playlists` table

- **Playlist Tracks**:
  - Track URIs, identifiers, titles, authors, durations, source names
  - Track positions within playlists
  - User IDs of users who added tracks
  - Addition timestamps
  - Stored in `playlist_tracks` table

- **Command Logs**:
  - Command execution data including user ID, guild ID, channel ID, and timestamps
  - Structured JSON logs for debugging and monitoring

### 4.2 Data Usage
We use collected data to:

- Provide and improve Bot functionality
- Maintain server-specific settings (prefix, locale)
- Store and manage user playlists
- Track play history for queue management and statistics
- Enable playlist sharing (for public playlists)
- Debug and troubleshoot issues
- Generate usage statistics (anonymized)
- Enforce cooldowns and rate limiting

### 4.3 Data Storage
- Data is stored in a PostgreSQL database
- Play history and logs may be retained for operational purposes
- You may request deletion of your server's data by removing the Bot from your server

### 4.4 Third-Party Services
The Bot integrates with third-party services:

- **Discord**: User and server data via Discord API
- **Lavalink**: Audio streaming services
- **Music Platforms**: YouTube, Spotify, Apple Music, SoundCloud, Deezer, etc.
- **FloweryTTS**: Text-to-speech services

Your use of these services is subject to their respective terms and privacy policies.

## 5. Intellectual Property

### 5.1 Bot Code
The Bot's source code, design, and functionality are the property of the Bot's developers. The Bot is provided under a non-commercial license (see LICENSE file).

### 5.2 Music Content
The Bot streams music content from third-party platforms. We do not claim ownership of any music content. All music content remains the property of its respective copyright holders.

### 5.3 User Content
You retain ownership of any playlists or custom content you create using the Bot. By using the Bot, you grant us a license to store and process this content as necessary to provide the service. This includes:

- Playlists you create (including names, descriptions, and track lists)
- Play history data associated with your server
- Server configuration settings (prefix, locale)

You can delete your playlists at any time using the Bot's playlist management commands. Removing the Bot from your server may result in deletion of associated data.

## 6. Copyright and DMCA

### 6.1 Copyright Compliance
The Bot is a tool that streams content from various platforms. We do not host, store, or distribute copyrighted content. The Bot acts as a client to access publicly available streams.

### 6.2 DMCA Notices
If you believe your copyrighted content is being used inappropriately through the Bot, please contact the respective music platform directly. The Bot does not store or cache music files.

### 6.3 Fair Use
Users are responsible for ensuring their use of the Bot complies with copyright laws and fair use provisions in their jurisdiction.

## 7. Service Availability

### 7.1 No Guarantee of Uptime
We do not guarantee that the Bot will be available at all times. The Bot may be unavailable due to:

- Maintenance or updates
- Technical issues or bugs
- Third-party service outages
- Discord API issues
- Network problems

### 7.2 Service Modifications
We reserve the right to:

- Modify, suspend, or discontinue any part of the Bot at any time
- Add, remove, or change features
- Update these Terms at any time
- Restrict access to the Bot for users who violate these Terms

## 8. Limitation of Liability

### 8.1 No Warranty
THE BOT IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

### 8.2 Limitation of Damages
TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE BOT.

### 8.3 Maximum Liability
OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO USE THE BOT (WHICH IS CURRENTLY ZERO, AS THE BOT IS FREE TO USE).

## 9. Indemnification

You agree to indemnify, defend, and hold harmless the Bot's developers, operators, and affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:

- Your use of the Bot
- Your violation of these Terms
- Your violation of any third-party rights
- Your violation of any applicable laws or regulations

## 10. Termination

### 10.1 By You
You may stop using the Bot at any time by:

- Removing the Bot from your Discord server
- Ceasing to use Bot commands

### 10.2 By Us
We reserve the right to terminate or suspend your access to the Bot at any time, with or without notice, for any reason, including:

- Violation of these Terms
- Abuse or misuse of the Bot
- Legal or regulatory requirements
- Security concerns

## 11. Changes to Terms

We may update these Terms from time to time. We will notify users of material changes by:

- Updating the "Last Updated" date at the top of this document
- Posting a notice in our support server (if applicable)
- Including a notice in Bot responses (for major changes)

Your continued use of the Bot after changes become effective constitutes acceptance of the updated Terms.

## 12. Governing Law

These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where the Bot is operated, without regard to its conflict of law provisions.

## 13. Severability

If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.

## 14. Entire Agreement

These Terms constitute the entire agreement between you and us regarding the use of the Bot and supersede all prior agreements and understandings.

## 15. Contact Information

For questions, concerns, or legal notices regarding these Terms, please contact us through:

- GitHub Issues: [Your Repository URL]
- Discord Support Server: [If applicable]

## 16. Acknowledgment

BY USING THE BOT, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.

---

**Note**: This is a non-commercial, open-source project. The Bot is provided for educational and personal use only. Commercial use is prohibited under the license terms.

