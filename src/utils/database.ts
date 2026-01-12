import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initDatabase(): Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'quackmuzik',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', { error: err });
  });

  return pool;
}

/**
 * Ensure tables guild_prefixes, guild_settings and play_history exist
 */
export async function ensureSchema(): Promise<void> {
  const db = initDatabase();

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS guild_prefixes (
        guild_id VARCHAR(20) PRIMARY KEY,
        prefix VARCHAR(10) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id VARCHAR(20) PRIMARY KEY,
        locale VARCHAR(5) DEFAULT 'vi',
        terms_accepted BOOLEAN DEFAULT false,
        terms_accepted_at TIMESTAMP,
        terms_accepted_by VARCHAR(20),
        dj_role_id VARCHAR(20),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add terms_accepted column to existing guild_settings table if it doesn't exist
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'guild_settings'
          AND column_name = 'terms_accepted'
        ) THEN
          ALTER TABLE guild_settings
          ADD COLUMN terms_accepted BOOLEAN DEFAULT false,
          ADD COLUMN terms_accepted_at TIMESTAMP,
          ADD COLUMN terms_accepted_by VARCHAR(20);
        END IF;
      END $$;
    `);

    // Add dj_role_id column to existing guild_settings table if it doesn't exist
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'guild_settings'
          AND column_name = 'dj_role_id'
        ) THEN
          ALTER TABLE guild_settings
          ADD COLUMN dj_role_id VARCHAR(20);
        END IF;
      END $$;
    `);

    // Add mode_24_7 column to existing guild_settings table if it doesn't exist
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'guild_settings'
          AND column_name = 'mode_24_7'
        ) THEN
          ALTER TABLE guild_settings
          ADD COLUMN mode_24_7 BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `);

    // Add announce_track column to existing guild_settings table if it doesn't exist
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'guild_settings'
          AND column_name = 'announce_track'
        ) THEN
          ALTER TABLE guild_settings
          ADD COLUMN announce_track BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);

    // Add dj_audio_settings column to existing guild_settings table if it doesn't exist
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'guild_settings'
          AND column_name = 'dj_audio_settings'
        ) THEN
          ALTER TABLE guild_settings
          ADD COLUMN dj_audio_settings JSONB DEFAULT '{}'::jsonb;
        END IF;
      END $$;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS play_history (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(20) NOT NULL,
        track_title TEXT NOT NULL,
        track_author TEXT,
        track_uri TEXT NOT NULL,
        track_identifier TEXT,
        track_duration_ms BIGINT,
        track_source_name TEXT,
        requester_id VARCHAR(20),
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for faster lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_guild_prefixes_guild_id
      ON guild_prefixes(guild_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_guild_settings_guild_id
      ON guild_settings(guild_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_play_history_guild_id
      ON play_history(guild_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_play_history_played_at
      ON play_history(played_at DESC)
    `);

    // Leaderboard tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20),
        total_requests INTEGER DEFAULT 0,
        total_listening_minutes INTEGER DEFAULT 0,
        total_votes INTEGER DEFAULT 0,
        total_playlists INTEGER DEFAULT 0,
        total_likes INTEGER DEFAULT 0,
        last_active_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, guild_id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS track_stats (
        id SERIAL PRIMARY KEY,
        track_uri TEXT NOT NULL,
        track_identifier TEXT,
        track_title TEXT NOT NULL,
        track_author TEXT,
        guild_id VARCHAR(20),
        play_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        first_played_at TIMESTAMP,
        last_played_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(track_uri, guild_id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS listening_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20) NOT NULL,
        voice_channel_id VARCHAR(20) NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        duration_minutes INTEGER DEFAULT 0,
        tracks_played INTEGER DEFAULT 0
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20),
        interaction_type VARCHAR(20) NOT NULL,
        track_uri TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS user_likes (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20),
        track_uri TEXT NOT NULL,
        track_identifier TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, guild_id, track_uri)
      )
    `);

    // Indexes for leaderboard tables
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_stats_user_id
      ON user_stats(user_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_stats_guild_id
      ON user_stats(guild_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_stats_total_requests
      ON user_stats(total_requests DESC)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_stats_total_listening
      ON user_stats(total_listening_minutes DESC)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_track_stats_guild_id
      ON track_stats(guild_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_track_stats_play_count
      ON track_stats(play_count DESC)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_listening_sessions_user_id
      ON listening_sessions(user_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_listening_sessions_guild_id
      ON listening_sessions(guild_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_listening_sessions_started_at
      ON listening_sessions(started_at DESC)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id
      ON user_interactions(user_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_interactions_guild_id
      ON user_interactions(guild_id)
    `);

    // User playlists tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_playlists (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(20) NOT NULL,
        guild_id VARCHAR(20),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, guild_id, name)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS playlist_tracks (
        id SERIAL PRIMARY KEY,
        playlist_id INTEGER NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
        track_uri TEXT NOT NULL,
        track_identifier TEXT,
        track_title TEXT NOT NULL,
        track_author TEXT,
        track_duration_ms BIGINT,
        track_source_name TEXT,
        position INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        added_by VARCHAR(20),
        UNIQUE(playlist_id, position)
      )
    `);

    // Indexes for playlists
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id
      ON user_playlists(user_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_playlists_guild_id
      ON user_playlists(guild_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id
      ON playlist_tracks(playlist_id)
    `);

    logger.info('Database schema ensured');
  } catch (error) {
    logger.error('Error ensuring database schema', { error });
    throw error;
  }
}

/**
 * Get prefix for a guild, return default if not found
 */
export async function getGuildPrefix(
  guildId: string | null,
  defaultPrefix: string = 'z!'
): Promise<string> {
  if (!guildId) {
    return defaultPrefix;
  }

  const db = initDatabase();

  try {
    const result = await db.query('SELECT prefix FROM guild_prefixes WHERE guild_id = $1', [
      guildId,
    ]);

    if (result.rows.length > 0) {
      return result.rows[0].prefix;
    }

    return defaultPrefix;
  } catch (error) {
    logger.error('Error getting guild prefix', { guildId, error });
    return defaultPrefix;
  }
}

/**
 * Set prefix for a guild
 */
export async function setGuildPrefix(guildId: string, prefix: string): Promise<boolean> {
  const db = initDatabase();

  // Validate prefix
  if (!prefix || prefix.length === 0 || prefix.length > 10) {
    throw new Error('Prefix must be 1-10 characters long');
  }

  try {
    await db.query(
      `INSERT INTO guild_prefixes (guild_id, prefix, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id)
       DO UPDATE SET prefix = $2, updated_at = CURRENT_TIMESTAMP`,
      [guildId, prefix]
    );

    logger.info('Guild prefix updated', { guildId, prefix });
    return true;
  } catch (error) {
    logger.error('Error setting guild prefix', { guildId, prefix, error });
    throw error;
  }
}

/**
 * Delete prefix for a guild (reset to default)
 */
export async function resetGuildPrefix(guildId: string): Promise<boolean> {
  const db = initDatabase();

  try {
    await db.query('DELETE FROM guild_prefixes WHERE guild_id = $1', [guildId]);
    logger.info('Guild prefix reset', { guildId });
    return true;
  } catch (error) {
    logger.error('Error resetting guild prefix', { guildId, error });
    throw error;
  }
}

/**
 * Get locale for a guild, return default if not found
 */
export async function getGuildLocale(
  guildId: string | null,
  defaultLocale: string = 'vi'
): Promise<string> {
  if (!guildId) {
    return defaultLocale;
  }

  const db = initDatabase();

  try {
    const result = await db.query('SELECT locale FROM guild_settings WHERE guild_id = $1', [
      guildId,
    ]);

    if (result.rows.length > 0) {
      return result.rows[0].locale;
    }

    return defaultLocale;
  } catch (error) {
    logger.error('Error getting guild locale', { guildId, error });
    return defaultLocale;
  }
}

/**
 * Set locale for a guild
 */
export async function setGuildLocale(guildId: string, locale: string): Promise<boolean> {
  const db = initDatabase();

  // Validate locale
  if (!locale || !['vi', 'en'].includes(locale)) {
    throw new Error('Locale must be vi or en');
  }

  try {
    await db.query(
      `INSERT INTO guild_settings (guild_id, locale, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id)
       DO UPDATE SET locale = $2, updated_at = CURRENT_TIMESTAMP`,
      [guildId, locale]
    );

    logger.info('Guild locale updated', { guildId, locale });
    return true;
  } catch (error) {
    logger.error('Error setting guild locale', { guildId, locale, error });
    throw error;
  }
}

/**
 * Save track to play history
 */
export interface PlayHistoryEntry {
  id: number;
  guild_id: string;
  track_title: string;
  track_author: string | null;
  track_uri: string;
  track_identifier: string | null;
  track_duration_ms: number | null;
  track_source_name: string | null;
  requester_id: string | null;
  played_at: Date;
}

export async function savePlayHistory(
  guildId: string,
  track: {
    info: {
      title: string;
      author?: string;
      uri: string;
      identifier?: string;
      duration?: number;
      sourceName?: string;
    };
    requester?: { id: string } | string;
  }
): Promise<boolean> {
  const db = initDatabase();

  try {
    const requesterId =
      typeof track.requester === 'string' ? track.requester : track.requester?.id || null;

    await db.query(
      `INSERT INTO play_history (
        guild_id, track_title, track_author, track_uri, track_identifier,
        track_duration_ms, track_source_name, requester_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        guildId,
        track.info.title,
        track.info.author || null,
        track.info.uri,
        track.info.identifier || null,
        track.info.duration || null,
        track.info.sourceName || null,
        requesterId,
      ]
    );

    logger.debug('Play history saved', {
      guildId,
      title: track.info.title,
    });
    return true;
  } catch (error) {
    logger.error('Error saving play history', { guildId, error });
    return false;
  }
}

/**
 * Get play history for a guild
 */
export async function getPlayHistory(
  guildId: string,
  limit: number = 50
): Promise<PlayHistoryEntry[]> {
  const db = initDatabase();

  try {
    const result = await db.query(
      `SELECT * FROM play_history
       WHERE guild_id = $1
       ORDER BY played_at DESC
       LIMIT $2`,
      [guildId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting play history', { guildId, error });
    return [];
  }
}

/**
 * Clean up old play history (keep N most recent records)
 */
export async function cleanupPlayHistory(
  guildId: string,
  keepCount: number = 100
): Promise<number> {
  const db = initDatabase();

  try {
    const result = await db.query(
      `DELETE FROM play_history
       WHERE guild_id = $1
       AND id NOT IN (
         SELECT id FROM play_history
         WHERE guild_id = $1
         ORDER BY played_at DESC
         LIMIT $2
       )`,
      [guildId, keepCount]
    );

    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      logger.info('Play history cleaned up', { guildId, deletedCount });
    }

    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up play history', { guildId, error });
    return 0;
  }
}

/**
 * User Playlist Types and Functions
 */
export interface UserPlaylist {
  id: number;
  user_id: string;
  guild_id: string | null;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PlaylistTrack {
  id: number;
  playlist_id: number;
  track_uri: string;
  track_identifier: string | null;
  track_title: string;
  track_author: string | null;
  track_duration_ms: number | null;
  track_source_name: string | null;
  position: number;
  added_at: Date;
  added_by: string | null;
}

/**
 * Create new playlist for user
 */
export async function createPlaylist(
  userId: string,
  guildId: string | null,
  name: string,
  description?: string,
  isPublic: boolean = false
): Promise<UserPlaylist> {
  const db = initDatabase();

  // Validate name
  if (!name || name.trim().length === 0 || name.length > 100) {
    throw new Error('Playlist name must be 1-100 characters');
  }

  try {
    const result = await db.query(
      `INSERT INTO user_playlists (user_id, guild_id, name, description, is_public, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, guildId, name.trim(), description?.trim() || null, isPublic]
    );

    logger.info('Playlist created', { userId, guildId, name, playlistId: result.rows[0].id });
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('Playlist with this name already exists');
    }
    logger.error('Error creating playlist', { userId, guildId, name, error });
    throw error;
  }
}

/**
 * Get list of playlists for user
 */
export async function getUserPlaylists(
  userId: string,
  guildId: string | null
): Promise<UserPlaylist[]> {
  const db = initDatabase();

  try {
    const result = await db.query(
      `SELECT * FROM user_playlists
       WHERE user_id = $1 AND (guild_id = $2 OR (guild_id IS NULL AND $2 IS NULL))
       ORDER BY updated_at DESC`,
      [userId, guildId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting user playlists', { userId, guildId, error });
    return [];
  }
}

/**
 * Get playlist by ID
 */
export async function getPlaylist(playlistId: number): Promise<UserPlaylist | null> {
  const db = initDatabase();

  try {
    const result = await db.query('SELECT * FROM user_playlists WHERE id = $1', [playlistId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting playlist', { playlistId, error });
    return null;
  }
}

/**
 * Get playlist by name and user
 */
export async function getPlaylistByName(
  userId: string,
  guildId: string | null,
  name: string
): Promise<UserPlaylist | null> {
  const db = initDatabase();

  try {
    const result = await db.query(
      `SELECT * FROM user_playlists
       WHERE user_id = $1 AND name = $2 AND (guild_id = $3 OR (guild_id IS NULL AND $3 IS NULL))
       LIMIT 1`,
      [userId, name, guildId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error getting playlist by name', { userId, guildId, name, error });
    return null;
  }
}

/**
 * Delete playlist
 */
export async function deletePlaylist(playlistId: number, userId: string): Promise<boolean> {
  const db = initDatabase();

  try {
    const result = await db.query('DELETE FROM user_playlists WHERE id = $1 AND user_id = $2', [
      playlistId,
      userId,
    ]);

    if (result.rowCount === 0) {
      return false;
    }

    logger.info('Playlist deleted', { playlistId, userId });
    return true;
  } catch (error) {
    logger.error('Error deleting playlist', { playlistId, userId, error });
    throw error;
  }
}

/**
 * Update playlist
 */
export async function updatePlaylist(
  playlistId: number,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    is_public?: boolean;
  }
): Promise<boolean> {
  const db = initDatabase();

  try {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0 || updates.name.length > 100) {
        throw new Error('Playlist name must be 1-100 characters');
      }
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name.trim());
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description.trim() || null);
    }

    if (updates.is_public !== undefined) {
      setClauses.push(`is_public = $${paramIndex++}`);
      values.push(updates.is_public);
    }

    if (setClauses.length === 0) {
      return false;
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(playlistId, userId);

    const query = `UPDATE user_playlists
                   SET ${setClauses.join(', ')}
                   WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
                   RETURNING id`;

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return false;
    }

    logger.info('Playlist updated', { playlistId, userId, updates });
    return true;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error('Playlist with this name already exists');
    }
    logger.error('Error updating playlist', { playlistId, userId, error });
    throw error;
  }
}

/**
 * Add track to playlist
 */
export async function addTrackToPlaylist(
  playlistId: number,
  track: {
    uri: string;
    identifier?: string;
    title: string;
    author?: string;
    duration?: number;
    sourceName?: string;
  },
  addedBy: string
): Promise<PlaylistTrack> {
  const db = initDatabase();

  try {
    // Get current max position
    const positionResult = await db.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM playlist_tracks WHERE playlist_id = $1',
      [playlistId]
    );
    const nextPosition = positionResult.rows[0].next_position;

    const result = await db.query(
      `INSERT INTO playlist_tracks (
        playlist_id, track_uri, track_identifier, track_title, track_author,
        track_duration_ms, track_source_name, position, added_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        playlistId,
        track.uri,
        track.identifier || null,
        track.title,
        track.author || null,
        track.duration || null,
        track.sourceName || null,
        nextPosition,
        addedBy,
      ]
    );

    // Update playlist updated_at
    await db.query('UPDATE user_playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      playlistId,
    ]);

    logger.info('Track added to playlist', { playlistId, trackTitle: track.title });
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error('Track already exists at this position');
    }
    logger.error('Error adding track to playlist', { playlistId, error });
    throw error;
  }
}

/**
 * Get all tracks in playlist
 */
export async function getPlaylistTracks(playlistId: number): Promise<PlaylistTrack[]> {
  const db = initDatabase();

  try {
    const result = await db.query(
      `SELECT * FROM playlist_tracks
       WHERE playlist_id = $1
       ORDER BY position ASC`,
      [playlistId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting playlist tracks', { playlistId, error });
    return [];
  }
}

/**
 * Remove track from playlist
 */
export async function removeTrackFromPlaylist(
  playlistId: number,
  position: number
): Promise<boolean> {
  const db = initDatabase();

  try {
    const result = await db.query(
      'DELETE FROM playlist_tracks WHERE playlist_id = $1 AND position = $2',
      [playlistId, position]
    );

    if (result.rowCount === 0) {
      return false;
    }

    // Reorder positions
    await db.query(
      `UPDATE playlist_tracks
       SET position = position - 1
       WHERE playlist_id = $1 AND position > $2`,
      [playlistId, position]
    );

    // Update playlist updated_at
    await db.query('UPDATE user_playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
      playlistId,
    ]);

    logger.info('Track removed from playlist', { playlistId, position });
    return true;
  } catch (error) {
    logger.error('Error removing track from playlist', { playlistId, position, error });
    throw error;
  }
}

/**
 * Get public playlists in guild
 */
export async function getPublicPlaylists(guildId: string | null): Promise<UserPlaylist[]> {
  const db = initDatabase();

  try {
    const result = await db.query(
      `SELECT * FROM user_playlists
       WHERE is_public = true AND (guild_id = $1 OR (guild_id IS NULL AND $1 IS NULL))
       ORDER BY updated_at DESC
       LIMIT 50`,
      [guildId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting public playlists', { guildId, error });
    return [];
  }
}

/**
 * Check if guild has accepted terms of service
 */
export async function hasGuildAcceptedTerms(guildId: string | null): Promise<boolean> {
  if (!guildId) {
    return false; // DM doesn't need to accept terms
  }

  const db = initDatabase();

  try {
    const result = await db.query('SELECT terms_accepted FROM guild_settings WHERE guild_id = $1', [
      guildId,
    ]);

    if (result.rows.length > 0) {
      return result.rows[0].terms_accepted === true;
    }

    return false; // No record = not accepted
  } catch (error) {
    logger.error('Error checking guild terms acceptance', { guildId, error });
    return false;
  }
}

/**
 * Set terms acceptance status for guild
 */
export async function setGuildTermsAccepted(guildId: string, acceptedBy: string): Promise<boolean> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO guild_settings (guild_id, terms_accepted, terms_accepted_at, terms_accepted_by, updated_at)
       VALUES ($1, true, CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id)
       DO UPDATE SET
         terms_accepted = true,
         terms_accepted_at = CURRENT_TIMESTAMP,
         terms_accepted_by = $2,
         updated_at = CURRENT_TIMESTAMP`,
      [guildId, acceptedBy]
    );

    logger.info('Guild terms accepted', { guildId, acceptedBy });
    return true;
  } catch (error) {
    logger.error('Error setting guild terms acceptance', { guildId, acceptedBy, error });
    throw error;
  }
}

/**
 * Get DJ role ID for a guild
 */
export async function getGuildDjRole(guildId: string | null): Promise<string | null> {
  if (!guildId) {
    return null;
  }

  const db = initDatabase();

  try {
    const result = await db.query('SELECT dj_role_id FROM guild_settings WHERE guild_id = $1', [
      guildId,
    ]);

    if (result.rows.length > 0 && result.rows[0].dj_role_id) {
      return result.rows[0].dj_role_id;
    }

    return null;
  } catch (error) {
    logger.error('Error getting guild DJ role', { guildId, error });
    return null;
  }
}

/**
 * Set DJ role ID for a guild
 */
export async function setGuildDjRole(guildId: string, roleId: string | null): Promise<boolean> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO guild_settings (guild_id, dj_role_id, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id)
       DO UPDATE SET dj_role_id = $2, updated_at = CURRENT_TIMESTAMP`,
      [guildId, roleId]
    );

    logger.info('Guild DJ role updated', { guildId, roleId });
    return true;
  } catch (error) {
    logger.error('Error setting guild DJ role', { guildId, roleId, error });
    throw error;
  }
}

/**
 * Remove DJ role for a guild (reset to null)
 */
export async function resetGuildDjRole(guildId: string): Promise<boolean> {
  const db = initDatabase();

  try {
    await db.query(
      `UPDATE guild_settings SET dj_role_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE guild_id = $1`,
      [guildId]
    );

    logger.info('Guild DJ role reset', { guildId });
    return true;
  } catch (error) {
    logger.error('Error resetting guild DJ role', { guildId, error });
    throw error;
  }
}

/**
 * Get 24/7 mode status for a guild
 */
export async function getGuild24_7Mode(guildId: string | null): Promise<boolean> {
  if (!guildId) {
    return false;
  }

  const db = initDatabase();

  try {
    const result = await db.query('SELECT mode_24_7 FROM guild_settings WHERE guild_id = $1', [
      guildId,
    ]);

    if (result.rows.length > 0 && result.rows[0].mode_24_7 !== null) {
      return result.rows[0].mode_24_7 === true;
    }

    return false; // Default: 24/7 mode is off
  } catch (error) {
    logger.error('Error getting guild 24/7 mode', { guildId, error });
    return false;
  }
}

/**
 * Set 24/7 mode for a guild
 */
export async function setGuild24_7Mode(guildId: string, enabled: boolean): Promise<boolean> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO guild_settings (guild_id, mode_24_7, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id)
       DO UPDATE SET mode_24_7 = $2, updated_at = CURRENT_TIMESTAMP`,
      [guildId, enabled]
    );

    logger.info('Guild 24/7 mode updated', { guildId, enabled });
    return true;
  } catch (error) {
    logger.error('Error setting guild 24/7 mode', { guildId, enabled, error });
    throw error;
  }
}

/**
 * Get announce track setting for a guild
 */
export async function getGuildAnnounceTrack(guildId: string | null): Promise<boolean> {
  if (!guildId) {
    return true; // Default: announce is on
  }

  const db = initDatabase();

  try {
    const result = await db.query('SELECT announce_track FROM guild_settings WHERE guild_id = $1', [
      guildId,
    ]);

    if (result.rows.length > 0 && result.rows[0].announce_track !== null) {
      return result.rows[0].announce_track === true;
    }

    return true; // Default: announce is on
  } catch (error) {
    logger.error('Error getting guild announce track setting', { guildId, error });
    return true; // Default: announce is on
  }
}

/**
 * Set announce track setting for a guild
 */
export async function setGuildAnnounceTrack(guildId: string, enabled: boolean): Promise<boolean> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO guild_settings (guild_id, announce_track, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id)
       DO UPDATE SET announce_track = $2, updated_at = CURRENT_TIMESTAMP`,
      [guildId, enabled]
    );

    logger.info('Guild announce track setting updated', { guildId, enabled });
    return true;
  } catch (error) {
    logger.error('Error setting guild announce track', { guildId, enabled, error });
    throw error;
  }
}

/**
 * DJ Audio Settings Interface
 */
export interface DjAudioSettings {
  bassboost?: boolean;
  nightcore?: boolean;
  lofi?: boolean;
  vaporwave?: boolean;
  volumeNormalization?: boolean;
  audio8d?: boolean;
}

/**
 * Get DJ audio settings for a guild
 */
export async function getGuildDjAudioSettings(guildId: string | null): Promise<DjAudioSettings> {
  if (!guildId) {
    return {};
  }

  const db = initDatabase();

  try {
    const result = await db.query(
      'SELECT dj_audio_settings FROM guild_settings WHERE guild_id = $1',
      [guildId]
    );

    if (result.rows.length > 0 && result.rows[0].dj_audio_settings) {
      return result.rows[0].dj_audio_settings as DjAudioSettings;
    }

    return {}; // Default: no filters
  } catch (error) {
    logger.error('Error getting guild DJ audio settings', { guildId, error });
    return {};
  }
}

/**
 * Set DJ audio settings for a guild
 */
export async function setGuildDjAudioSettings(
  guildId: string,
  settings: DjAudioSettings
): Promise<boolean> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO guild_settings (guild_id, dj_audio_settings, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guild_id)
       DO UPDATE SET dj_audio_settings = $2, updated_at = CURRENT_TIMESTAMP`,
      [guildId, JSON.stringify(settings)]
    );

    logger.info('Guild DJ audio settings updated', { guildId, settings });
    return true;
  } catch (error) {
    logger.error('Error setting guild DJ audio settings', { guildId, settings, error });
    throw error;
  }
}

/**
 * Leaderboard Types and Functions
 */
export interface UserStats {
  user_id: string;
  guild_id: string | null;
  total_requests: number;
  total_listening_minutes: number;
  total_votes: number;
  total_playlists: number;
  total_likes: number;
  last_active_at: Date | null;
}

export interface TrackStats {
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

/**
 * Increment user request count
 */
export async function incrementUserRequests(userId: string, guildId: string | null): Promise<void> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO user_stats (user_id, guild_id, total_requests, last_active_at, updated_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, guild_id)
       DO UPDATE SET
         total_requests = user_stats.total_requests + 1,
         last_active_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, guildId]
    );
  } catch (error) {
    logger.error('Error incrementing user requests', { userId, guildId, error });
  }
}

/**
 * Increment user votes count
 */
export async function incrementUserVotes(userId: string, guildId: string | null): Promise<void> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO user_stats (user_id, guild_id, total_votes, last_active_at, updated_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, guild_id)
       DO UPDATE SET
         total_votes = user_stats.total_votes + 1,
         last_active_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, guildId]
    );
  } catch (error) {
    logger.error('Error incrementing user votes', { userId, guildId, error });
  }
}

/**
 * Update user playlist count
 */
export async function updateUserPlaylistCount(
  userId: string,
  guildId: string | null
): Promise<void> {
  const db = initDatabase();

  try {
    // Count user playlists
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM user_playlists WHERE user_id = $1 AND (guild_id IS NOT DISTINCT FROM $2)',
      [userId, guildId]
    );
    const playlistCount = parseInt(countResult.rows[0]?.count || '0', 10);

    await db.query(
      `INSERT INTO user_stats (user_id, guild_id, total_playlists, last_active_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, guild_id)
       DO UPDATE SET
         total_playlists = $3,
         last_active_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, guildId, playlistCount]
    );
  } catch (error) {
    logger.error('Error updating user playlist count', { userId, guildId, error });
  }
}

/**
 * Update user listening time
 */
export async function updateUserListeningTime(
  userId: string,
  guildId: string,
  minutes: number
): Promise<void> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO user_stats (user_id, guild_id, total_listening_minutes, last_active_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, guild_id)
       DO UPDATE SET
         total_listening_minutes = user_stats.total_listening_minutes + $3,
         last_active_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, guildId, minutes]
    );
  } catch (error) {
    logger.error('Error updating user listening time', { userId, guildId, minutes, error });
  }
}

/**
 * Increment track play count
 */
export async function incrementTrackPlayCount(
  trackUri: string,
  trackIdentifier: string | null,
  trackTitle: string,
  trackAuthor: string | null,
  guildId: string | null
): Promise<void> {
  const db = initDatabase();

  try {
    await db.query(
      `INSERT INTO track_stats (
        track_uri, track_identifier, track_title, track_author, guild_id,
        play_count, first_played_at, last_played_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (track_uri, guild_id)
       DO UPDATE SET
         play_count = track_stats.play_count + 1,
         last_played_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [trackUri, trackIdentifier, trackTitle, trackAuthor, guildId]
    );
  } catch (error) {
    logger.error('Error incrementing track play count', {
      trackUri,
      guildId,
      error,
    });
  }
}

/**
 * Check if user has liked a track
 */
export async function hasUserLikedTrack(
  userId: string,
  trackUri: string,
  guildId: string | null
): Promise<boolean> {
  const db = initDatabase();

  try {
    const result = await db.query(
      'SELECT id FROM user_likes WHERE user_id = $1 AND track_uri = $2 AND guild_id IS NOT DISTINCT FROM $3',
      [userId, trackUri, guildId]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking if user liked track', { userId, trackUri, guildId, error });
    return false;
  }
}

/**
 * Like a track
 */
export async function likeTrack(
  userId: string,
  trackUri: string,
  trackIdentifier: string | null,
  guildId: string | null
): Promise<boolean> {
  const db = initDatabase();

  try {
    // Check if already liked
    const alreadyLiked = await hasUserLikedTrack(userId, trackUri, guildId);
    if (alreadyLiked) {
      return false; // Already liked
    }

    // Add like record
    await db.query(
      `INSERT INTO user_likes (user_id, guild_id, track_uri, track_identifier, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, guild_id, track_uri) DO NOTHING`,
      [userId, guildId, trackUri, trackIdentifier]
    );

    // Increment user total_likes
    await db.query(
      `INSERT INTO user_stats (user_id, guild_id, total_likes, last_active_at, updated_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, guild_id)
       DO UPDATE SET
         total_likes = user_stats.total_likes + 1,
         last_active_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, guildId]
    );

    // Increment track like_count
    // First, get track info from track_stats or use provided info
    await db.query(
      `INSERT INTO track_stats (track_uri, track_identifier, guild_id, like_count, updated_at)
       VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (track_uri, guild_id)
       DO UPDATE SET
         like_count = track_stats.like_count + 1,
         updated_at = CURRENT_TIMESTAMP`,
      [trackUri, trackIdentifier, guildId]
    );

    logger.info('Track liked', { userId, trackUri, guildId });
    return true;
  } catch (error) {
    logger.error('Error liking track', { userId, trackUri, guildId, error });
    throw error;
  }
}

/**
 * Unlike a track
 */
export async function unlikeTrack(
  userId: string,
  trackUri: string,
  guildId: string | null
): Promise<boolean> {
  const db = initDatabase();

  try {
    // Check if liked
    const liked = await hasUserLikedTrack(userId, trackUri, guildId);
    if (!liked) {
      return false; // Not liked
    }

    // Remove like record
    const deleteResult = await db.query(
      'DELETE FROM user_likes WHERE user_id = $1 AND track_uri = $2 AND guild_id IS NOT DISTINCT FROM $3',
      [userId, trackUri, guildId]
    );

    if (deleteResult.rowCount === 0) {
      return false;
    }

    // Decrement user total_likes
    await db.query(
      `UPDATE user_stats
       SET total_likes = GREATEST(0, total_likes - 1),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND guild_id IS NOT DISTINCT FROM $2`,
      [userId, guildId]
    );

    // Decrement track like_count
    await db.query(
      `UPDATE track_stats
       SET like_count = GREATEST(0, like_count - 1),
           updated_at = CURRENT_TIMESTAMP
       WHERE track_uri = $1 AND guild_id IS NOT DISTINCT FROM $2`,
      [trackUri, guildId]
    );

    logger.info('Track unliked', { userId, trackUri, guildId });
    return true;
  } catch (error) {
    logger.error('Error unliking track', { userId, trackUri, guildId, error });
    throw error;
  }
}

/**
 * Get track likes count
 */
export async function getTrackLikes(
  trackUri: string,
  guildId: string | null
): Promise<number> {
  const db = initDatabase();

  try {
    const result = await db.query(
      'SELECT like_count FROM track_stats WHERE track_uri = $1 AND guild_id IS NOT DISTINCT FROM $2',
      [trackUri, guildId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].like_count || 0;
    }

    return 0;
  } catch (error) {
    logger.error('Error getting track likes', { trackUri, guildId, error });
    return 0;
  }
}

/**
 * Get top requesters (DJ leaderboard)
 */
export async function getTopRequesters(
  guildId: string | null,
  limit: number = 10,
  period?: 'week' | 'month' | 'all'
): Promise<UserStats[]> {
  const db = initDatabase();

  try {
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND last_active_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND last_active_at >= NOW() - INTERVAL '30 days'";
    }

    const query = `
      SELECT * FROM user_stats
      WHERE guild_id ${guildId ? '= $1' : 'IS NULL'}
      ${dateFilter}
      ORDER BY total_requests DESC
      LIMIT ${guildId ? '$2' : '$1'}
    `;

    const params = guildId ? [guildId, limit] : [limit];
    const result = await db.query(query, params);

    return result.rows;
  } catch (error) {
    logger.error('Error getting top requesters', { guildId, limit, error });
    return [];
  }
}

/**
 * Get top listeners
 */
export async function getTopListeners(
  guildId: string | null,
  limit: number = 10,
  period?: 'week' | 'month' | 'all'
): Promise<UserStats[]> {
  const db = initDatabase();

  try {
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND last_active_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND last_active_at >= NOW() - INTERVAL '30 days'";
    }

    const query = `
      SELECT * FROM user_stats
      WHERE guild_id ${guildId ? '= $1' : 'IS NULL'}
      ${dateFilter}
      ORDER BY total_listening_minutes DESC
      LIMIT ${guildId ? '$2' : '$1'}
    `;

    const params = guildId ? [guildId, limit] : [limit];
    const result = await db.query(query, params);

    return result.rows;
  } catch (error) {
    logger.error('Error getting top listeners', { guildId, limit, error });
    return [];
  }
}

/**
 * Get top tracks (Top Hits)
 */
export async function getTopTracks(
  guildId: string | null,
  limit: number = 10,
  period?: 'week' | 'month' | 'all'
): Promise<TrackStats[]> {
  const db = initDatabase();

  try {
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND last_played_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND last_played_at >= NOW() - INTERVAL '30 days'";
    }

    const query = `
      SELECT * FROM track_stats
      WHERE guild_id ${guildId ? '= $1' : 'IS NULL'}
      ${dateFilter}
      ORDER BY play_count DESC
      LIMIT ${guildId ? '$2' : '$1'}
    `;

    const params = guildId ? [guildId, limit] : [limit];
    const result = await db.query(query, params);

    return result.rows;
  } catch (error) {
    logger.error('Error getting top tracks', { guildId, limit, error });
    return [];
  }
}

/**
 * Get user stats
 */
export async function getUserStats(
  userId: string,
  guildId: string | null
): Promise<UserStats | null> {
  const db = initDatabase();

  try {
    const result = await db.query(
      'SELECT * FROM user_stats WHERE user_id = $1 AND guild_id IS NOT DISTINCT FROM $2',
      [userId, guildId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return null;
  } catch (error) {
    logger.error('Error getting user stats', { userId, guildId, error });
    return null;
  }
}

/**
 * Get user rank in leaderboard
 */
export async function getUserRank(
  userId: string,
  guildId: string | null,
  type: 'requests' | 'listening'
): Promise<number> {
  const db = initDatabase();

  try {
    const orderBy = type === 'requests' ? 'total_requests DESC' : 'total_listening_minutes DESC';
    const query = `
      SELECT COUNT(*) + 1 as rank
      FROM user_stats
      WHERE guild_id IS NOT DISTINCT FROM $2
      AND user_id != $1
      AND (
        ${type === 'requests' ? 'total_requests' : 'total_listening_minutes'} >
        (SELECT ${type === 'requests' ? 'total_requests' : 'total_listening_minutes'}
         FROM user_stats
         WHERE user_id = $1 AND guild_id IS NOT DISTINCT FROM $2)
      )
    `;

    const result = await db.query(query, [userId, guildId]);
    return parseInt(result.rows[0]?.rank || '0', 10);
  } catch (error) {
    logger.error('Error getting user rank', { userId, guildId, type, error });
    return 0;
  }
}

/**
 * Create or update listening session
 */
export async function createListeningSession(
  userId: string,
  guildId: string,
  voiceChannelId: string
): Promise<number> {
  const db = initDatabase();

  try {
    const result = await db.query(
      `INSERT INTO listening_sessions (user_id, guild_id, voice_channel_id, started_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [userId, guildId, voiceChannelId]
    );

    return result.rows[0].id;
  } catch (error) {
    logger.error('Error creating listening session', { userId, guildId, error });
    return 0;
  }
}

/**
 * End listening session and update stats
 */
export async function endListeningSession(
  sessionId: number,
  tracksPlayed: number = 0
): Promise<void> {
  const db = initDatabase();

  try {
    const result = await db.query(
      `UPDATE listening_sessions
       SET ended_at = CURRENT_TIMESTAMP,
           duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) / 60,
           tracks_played = $2
       WHERE id = $1
       RETURNING user_id, guild_id, duration_minutes`,
      [sessionId, tracksPlayed]
    );

    if (result.rows.length > 0) {
      const { user_id, guild_id, duration_minutes } = result.rows[0];
      if (duration_minutes > 0) {
        await updateUserListeningTime(user_id, guild_id, Math.floor(duration_minutes));
      }
    }
  } catch (error) {
    logger.error('Error ending listening session', { sessionId, error });
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}
