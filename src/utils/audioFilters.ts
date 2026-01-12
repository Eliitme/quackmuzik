import { Player } from 'lavalink-client';
import { logger } from './logger';
import { DjAudioSettings } from './database';

/**
 * Apply audio filters to player based on DJ audio settings
 */
export async function applyDjAudioFilters(
  player: Player,
  settings: DjAudioSettings
): Promise<void> {
  try {
    // Check if player has filters API
    const playerWithFilters = player as any;
    if (!playerWithFilters.filters) {
      logger.warn('Player does not support filters', { guildId: player.guildId });
      return;
    }

    const filters: any = {};

    // Bassboost - Increase bass frequencies
    if (settings.bassboost) {
      filters.equalizer = [
        { band: 0, gain: 0.6 }, // 25 Hz
        { band: 1, gain: 0.7 }, // 40 Hz
        { band: 2, gain: 0.8 }, // 63 Hz
        { band: 3, gain: 0.55 }, // 100 Hz
        { band: 4, gain: 0.25 }, // 160 Hz
      ];
    }

    // Nightcore - Speed up and pitch up
    if (settings.nightcore) {
      filters.timescale = {
        speed: 1.2,
        pitch: 1.2,
        rate: 1.0,
      };
    }

    // Lo-fi - Slow down and add slight pitch down
    if (settings.lofi) {
      filters.timescale = {
        speed: 0.85,
        pitch: 0.95,
        rate: 1.0,
      };
      // Add slight low-pass filter effect through equalizer
      if (!filters.equalizer) {
        filters.equalizer = [];
      }
      // Reduce high frequencies
      for (let i = 10; i < 15; i++) {
        filters.equalizer.push({ band: i, gain: -0.15 });
      }
    }

    // Vaporwave - Slow down significantly and pitch down
    if (settings.vaporwave) {
      filters.timescale = {
        speed: 0.8,
        pitch: 0.8,
        rate: 1.0,
      };
      // Add reverb-like effect
      if (!filters.equalizer) {
        filters.equalizer = [];
      }
      // Enhance mid frequencies
      filters.equalizer.push({ band: 5, gain: 0.3 });
      filters.equalizer.push({ band: 6, gain: 0.2 });
    }

    // 8D Audio - Rotation effect
    if (settings.audio8d) {
      filters.rotation = {
        rotationHz: 0.2, // Rotate around head every 5 seconds
      };
    }

    // Volume Normalization - Normalize volume levels
    if (settings.volumeNormalization) {
      filters.volume = 1.0; // Keep at 100% but can be adjusted
      // Note: True normalization would require analyzing the track,
      // this is a simplified version
    }

    // Apply filters if any are set
    if (Object.keys(filters).length > 0) {
      await playerWithFilters.filters.set(filters);
      logger.info('Applied DJ audio filters', {
        guildId: player.guildId,
        settings,
      });
    } else {
      // Reset filters if none are enabled
      await playerWithFilters.filters.reset();
    }
  } catch (error) {
    logger.error('Error applying DJ audio filters', {
      guildId: player.guildId,
      settings,
      error,
    });
  }
}

/**
 * Reset all audio filters
 */
export async function resetAudioFilters(player: Player): Promise<void> {
  try {
    const playerWithFilters = player as any;
    if (playerWithFilters && playerWithFilters.filters) {
      await playerWithFilters.filters.reset();
      logger.info('Reset audio filters', { guildId: player.guildId });
    }
  } catch (error) {
    logger.error('Error resetting audio filters', {
      guildId: player.guildId,
      error,
    });
  }
}
