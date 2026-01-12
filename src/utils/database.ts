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
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}
