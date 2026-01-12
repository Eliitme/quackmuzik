# Database Functions Reference

This document provides a comprehensive reference for all database functions available in `src/utils/database.ts`.

## Table of Contents

- [Prefix Management](#prefix-management)
- [Locale Management](#locale-management)
- [DJ Role Management](#dj-role-management)
- [24/7 Mode](#247-mode)
- [Track Announcement](#track-announcement)
- [DJ Audio Settings](#dj-audio-settings)
- [Play History](#play-history)
- [User Playlists](#user-playlists)
- [Terms of Service](#terms-of-service)
- [Leaderboard & Statistics](#leaderboard--statistics)

---

## Prefix Management

### `getGuildPrefix(guildId, defaultPrefix?)`
Get the custom prefix for a guild.

**Parameters:**
- `guildId: string | null` - Guild ID (null for DMs)
- `defaultPrefix: string` - Default prefix if not set (default: 'z!')

**Returns:** `Promise<string>`

**Example:**
```typescript
const prefix = await getGuildPrefix(message.guild?.id || null, 'z!');
```

### `setGuildPrefix(guildId, prefix)`
Set a custom prefix for a guild.

**Parameters:**
- `guildId: string` - Guild ID
- `prefix: string` - New prefix (1-10 characters, no spaces)

**Returns:** `Promise<boolean>`

**Throws:** Error if prefix is invalid

### `resetGuildPrefix(guildId)`
Reset prefix to default for a guild.

**Parameters:**
- `guildId: string` - Guild ID

**Returns:** `Promise<boolean>`

---

## Locale Management

### `getGuildLocale(guildId, defaultLocale?)`
Get the locale setting for a guild.

**Parameters:**
- `guildId: string | null` - Guild ID (null for DMs)
- `defaultLocale: string` - Default locale if not set (default: 'vi')

**Returns:** `Promise<string>` - Locale code ('vi' or 'en')

### `setGuildLocale(guildId, locale)`
Set the locale for a guild.

**Parameters:**
- `guildId: string` - Guild ID
- `locale: string` - Locale code ('vi' or 'en')

**Returns:** `Promise<boolean>`

**Throws:** Error if locale is invalid

---

## DJ Role Management

### `getGuildDjRole(guildId)`
Get the DJ role ID for a guild.

**Parameters:**
- `guildId: string | null` - Guild ID

**Returns:** `Promise<string | null>` - Role ID or null if not set

### `setGuildDjRole(guildId, roleId)`
Set the DJ role for a guild.

**Parameters:**
- `guildId: string` - Guild ID
- `roleId: string | null` - Role ID (null to remove)

**Returns:** `Promise<boolean>`

### `resetGuildDjRole(guildId)`
Remove the DJ role for a guild.

**Parameters:**
- `guildId: string` - Guild ID

**Returns:** `Promise<boolean>`

---

## 24/7 Mode

### `getGuild24_7Mode(guildId)`
Get 24/7 mode status for a guild.

**Parameters:**
- `guildId: string | null` - Guild ID

**Returns:** `Promise<boolean>` - true if enabled, false otherwise

### `setGuild24_7Mode(guildId, enabled)`
Set 24/7 mode for a guild.

**Parameters:**
- `guildId: string` - Guild ID
- `enabled: boolean` - Enable or disable 24/7 mode

**Returns:** `Promise<boolean>`

### `resetGuildDjRole(guildId)`
Reset 24/7 mode to default (disabled) for a guild.

**Parameters:**
- `guildId: string` - Guild ID

**Returns:** `Promise<boolean>`

---

## Track Announcement

### `getGuildAnnounceTrack(guildId)`
Get track announcement setting for a guild.

**Parameters:**
- `guildId: string | null` - Guild ID

**Returns:** `Promise<boolean>` - true if enabled (default), false if disabled

### `setGuildAnnounceTrack(guildId, enabled)`
Set track announcement setting for a guild.

**Parameters:**
- `guildId: string` - Guild ID
- `enabled: boolean` - Enable or disable announcements

**Returns:** `Promise<boolean>`

---

## DJ Audio Settings

### `getGuildDjAudioSettings(guildId)`
Get DJ audio filter settings for a guild.

**Parameters:**
- `guildId: string | null` - Guild ID

**Returns:** `Promise<DjAudioSettings>` - Settings object

**DjAudioSettings Interface:**
```typescript
interface DjAudioSettings {
  bassboost?: boolean;
  nightcore?: boolean;
  lofi?: boolean;
  vaporwave?: boolean;
  volumeNormalization?: boolean;
  audio8d?: boolean;
}
```

### `setGuildDjAudioSettings(guildId, settings)`
Set DJ audio filter settings for a guild.

**Parameters:**
- `guildId: string` - Guild ID
- `settings: DjAudioSettings` - Settings object

**Returns:** `Promise<boolean>`

---

## Play History

### `savePlayHistory(guildId, track)`
Save a track to play history.

**Parameters:**
- `guildId: string` - Guild ID
- `track: { info: {...}, requester?: {...} }` - Track object

**Returns:** `Promise<boolean>`

### `getPlayHistory(guildId, limit?)`
Get play history for a guild.

**Parameters:**
- `guildId: string` - Guild ID
- `limit: number` - Maximum number of records (default: 50)

**Returns:** `Promise<PlayHistoryEntry[]>`

### `cleanupPlayHistory(guildId, keepCount?)`
Clean up old play history records.

**Parameters:**
- `guildId: string` - Guild ID
- `keepCount: number` - Number of records to keep (default: 100)

**Returns:** `Promise<number>` - Number of deleted records

---

## User Playlists

### `createPlaylist(userId, guildId, name, description?, isPublic?)`
Create a new playlist for a user.

**Parameters:**
- `userId: string` - User ID
- `guildId: string | null` - Guild ID (null for global playlists)
- `name: string` - Playlist name (1-100 characters)
- `description?: string` - Optional description
- `isPublic?: boolean` - Public visibility (default: false)

**Returns:** `Promise<UserPlaylist>`

**Throws:** Error if name is invalid or already exists

### `getUserPlaylists(userId, guildId)`
Get all playlists for a user.

**Parameters:**
- `userId: string` - User ID
- `guildId: string | null` - Guild ID

**Returns:** `Promise<UserPlaylist[]>`

### `getPlaylist(playlistId)`
Get a playlist by ID.

**Parameters:**
- `playlistId: number` - Playlist ID

**Returns:** `Promise<UserPlaylist | null>`

### `getPlaylistByName(userId, guildId, name)`
Get a playlist by name.

**Parameters:**
- `userId: string` - User ID
- `guildId: string | null` - Guild ID
- `name: string` - Playlist name

**Returns:** `Promise<UserPlaylist | null>`

### `deletePlaylist(playlistId, userId)`
Delete a playlist.

**Parameters:**
- `playlistId: number` - Playlist ID
- `userId: string` - User ID (for ownership verification)

**Returns:** `Promise<boolean>`

### `updatePlaylist(playlistId, userId, updates)`
Update a playlist.

**Parameters:**
- `playlistId: number` - Playlist ID
- `userId: string` - User ID
- `updates: { name?: string, description?: string, is_public?: boolean }` - Updates

**Returns:** `Promise<boolean>`

### `addTrackToPlaylist(playlistId, track, addedBy)`
Add a track to a playlist.

**Parameters:**
- `playlistId: number` - Playlist ID
- `track: { uri, identifier?, title, author?, duration?, sourceName? }` - Track info
- `addedBy: string` - User ID who added the track

**Returns:** `Promise<PlaylistTrack>`

### `getPlaylistTracks(playlistId)`
Get all tracks in a playlist.

**Parameters:**
- `playlistId: number` - Playlist ID

**Returns:** `Promise<PlaylistTrack[]>`

### `removeTrackFromPlaylist(playlistId, position)`
Remove a track from a playlist.

**Parameters:**
- `playlistId: number` - Playlist ID
- `position: number` - Track position (1-based)

**Returns:** `Promise<boolean>`

### `getPublicPlaylists(guildId)`
Get public playlists in a guild.

**Parameters:**
- `guildId: string | null` - Guild ID

**Returns:** `Promise<UserPlaylist[]>`

---

## Terms of Service

### `hasGuildAcceptedTerms(guildId)`
Check if a guild has accepted the Terms of Service.

**Parameters:**
- `guildId: string | null` - Guild ID

**Returns:** `Promise<boolean>`

### `setGuildTermsAccepted(guildId, acceptedBy)`
Set Terms of Service acceptance for a guild.

**Parameters:**
- `guildId: string` - Guild ID
- `acceptedBy: string` - User ID who accepted

**Returns:** `Promise<boolean>`

---

## Leaderboard & Statistics

### User Statistics

#### `incrementUserRequests(userId, guildId)`
Increment the request count for a user.

**Parameters:**
- `userId: string` - User ID
- `guildId: string | null` - Guild ID

**Returns:** `Promise<void>`

#### `incrementUserVotes(userId, guildId)`
Increment the vote count for a user.

**Parameters:**
- `userId: string` - User ID
- `guildId: string | null` - Guild ID

**Returns:** `Promise<void>`

#### `updateUserListeningTime(userId, guildId, minutes)`
Update listening time for a user.

**Parameters:**
- `userId: string` - User ID
- `guildId: string` - Guild ID
- `minutes: number` - Minutes to add

**Returns:** `Promise<void>`

#### `updateUserPlaylistCount(userId, guildId)`
Update playlist count for a user (recounts from database).

**Parameters:**
- `userId: string` - User ID
- `guildId: string | null` - Guild ID

**Returns:** `Promise<void>`

#### `getUserStats(userId, guildId)`
Get statistics for a user.

**Parameters:**
- `userId: string` - User ID
- `guildId: string | null` - Guild ID

**Returns:** `Promise<UserStats | null>`

**UserStats Interface:**
```typescript
interface UserStats {
  user_id: string;
  guild_id: string | null;
  total_requests: number;
  total_listening_minutes: number;
  total_votes: number;
  total_playlists: number;
  total_likes: number;
  last_active_at: Date | null;
}
```

#### `getUserRank(userId, guildId, type)`
Get user rank in a leaderboard.

**Parameters:**
- `userId: string` - User ID
- `guildId: string | null` - Guild ID
- `type: 'requests' | 'listening'` - Leaderboard type

**Returns:** `Promise<number>` - Rank (1-based, 0 if not found)

### Track Statistics

#### `incrementTrackPlayCount(trackUri, trackIdentifier, trackTitle, trackAuthor, guildId)`
Increment play count for a track.

**Parameters:**
- `trackUri: string` - Track URI
- `trackIdentifier: string | null` - Track identifier
- `trackTitle: string` - Track title
- `trackAuthor: string | null` - Track author
- `guildId: string | null` - Guild ID

**Returns:** `Promise<void>`

### Leaderboard Queries

#### `getTopRequesters(guildId, limit?, period?)`
Get top requesters (DJ leaderboard).

**Parameters:**
- `guildId: string | null` - Guild ID
- `limit: number` - Number of results (default: 10)
- `period?: 'week' | 'month' | 'all'` - Time period (default: 'all')

**Returns:** `Promise<UserStats[]>`

#### `getTopListeners(guildId, limit?, period?)`
Get top listeners.

**Parameters:**
- `guildId: string | null` - Guild ID
- `limit: number` - Number of results (default: 10)
- `period?: 'week' | 'month' | 'all'` - Time period (default: 'all')

**Returns:** `Promise<UserStats[]>`

#### `getTopTracks(guildId, limit?, period?)`
Get top tracks (Top Hits).

**Parameters:**
- `guildId: string | null` - Guild ID
- `limit: number` - Number of results (default: 10)
- `period?: 'week' | 'month' | 'all'` - Time period (default: 'all')

**Returns:** `Promise<TrackStats[]>`

**TrackStats Interface:**
```typescript
interface TrackStats {
  track_uri: string;
  track_identifier: string | null;
  track_title: string;
  track_author: string | null;
  guild_id: string | null;
  play_count: number;
  like_count: number;
  first_played_at: Date | null;
  last_played_at: Date | null;
}
```

### Listening Sessions

#### `createListeningSession(userId, guildId, voiceChannelId)`
Create a new listening session.

**Parameters:**
- `userId: string` - User ID
- `guildId: string` - Guild ID
- `voiceChannelId: string` - Voice channel ID

**Returns:** `Promise<number>` - Session ID

#### `endListeningSession(sessionId, tracksPlayed?)`
End a listening session and update stats.

**Parameters:**
- `sessionId: number` - Session ID
- `tracksPlayed: number` - Number of tracks played (default: 0)

**Returns:** `Promise<void>`

---

## Database Initialization

### `initDatabase()`
Initialize the database connection pool.

**Returns:** `Pool` - PostgreSQL connection pool

### `ensureSchema()`
Ensure all database tables exist (creates if missing).

**Returns:** `Promise<void>`

**Throws:** Error if schema creation fails

### `closeDatabase()`
Close the database connection pool.

**Returns:** `Promise<void>`

---

## Notes

- All functions that accept `guildId: string | null` support both guild-specific and global (null) data
- Functions that modify data typically return `Promise<boolean>` indicating success
- Functions that query data return `Promise<T | null>` or `Promise<T[]>` where T is the data type
- All database operations are logged via the logger utility
- Error handling is built into each function - errors are logged and may throw exceptions
