import { Player } from 'lavalink-client';
import { logger } from './logger';
import { DjAudioSettings } from './database';

/**
 * Check if player supports filters API via FilterManager
 * @param player Lavalink player instance
 * @returns true if filters are supported, false otherwise
 */
export function playerSupportsFilters(player: Player): boolean {
  try {
    if (!player) {
      logger.warn('Player is null or undefined');
      return false;
    }

    // Check if player has filterManager property
    if (!player.filterManager) {
      logger.debug('Player filterManager not found', {
        guildId: player.guildId,
        playerKeys: Object.keys(player),
      });
      return false;
    }

    // Check if filterManager has required methods
    const hasSetSpeed = typeof player.filterManager.setSpeed === 'function';
    const hasResetFilters = typeof player.filterManager.resetFilters === 'function';
    const hasApplyPlayerFilters = typeof player.filterManager.applyPlayerFilters === 'function';

    if (!hasSetSpeed || !hasResetFilters || !hasApplyPlayerFilters) {
      logger.debug('Player filterManager missing required methods', {
        guildId: player.guildId,
        hasSetSpeed,
        hasResetFilters,
        hasApplyPlayerFilters,
      });
      return false;
    }

    return true;
  } catch (error) {
    const guildId = player ? player.guildId : undefined;
    logger.warn('Error checking filters support', {
      error,
      guildId,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
}

/**
 * Apply audio filters to player based on DJ audio settings using FilterManager API
 */
export async function applyDjAudioFilters(
  player: Player,
  settings: DjAudioSettings
): Promise<void> {
  try {
    // Check if player has filterManager
    if (!player.filterManager) {
      logger.warn('Player does not have filterManager', { guildId: player.guildId });
      return;
    }

    // Get current filter data to preserve existing filters
    const currentData = player.filterManager.data;
    const filters: any = { ...currentData };

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
        ...(filters.timescale || {}),
        speed: 1.2,
        pitch: 1.2,
        rate: 1.0,
      };
    }

    // Lo-fi - Slow down and add slight pitch down
    if (settings.lofi) {
      filters.timescale = {
        ...(filters.timescale || {}),
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
        ...(filters.timescale || {}),
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

    // Apply filters using FilterManager methods
    // We need to apply each filter type separately using the appropriate methods

    // Apply equalizer if needed
    if (filters.equalizer && Array.isArray(filters.equalizer)) {
      await player.filterManager.setEQ(filters.equalizer);
    }

    // Apply timescale (speed/pitch/rate) if needed
    if (filters.timescale) {
      if (filters.timescale.speed !== undefined) {
        await player.filterManager.setSpeed(filters.timescale.speed);
      }
      if (filters.timescale.pitch !== undefined) {
        await player.filterManager.setPitch(filters.timescale.pitch);
      }
      if (filters.timescale.rate !== undefined) {
        await player.filterManager.setRate(filters.timescale.rate);
      }
    }

    // Apply rotation if needed
    if (filters.rotation) {
      await player.filterManager.toggleRotation(filters.rotation.rotationHz);
    }

    // Apply volume if needed
    if (filters.volume !== undefined) {
      await player.filterManager.setVolume(filters.volume);
    }

    // If no filters are enabled, reset all
    if (Object.keys(filters).length === 0) {
      await player.filterManager.resetFilters();
    } else {
      logger.info('Applied DJ audio filters', {
        guildId: player.guildId,
        settings,
      });
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
 * Apply speed filter to player using FilterManager API
 * @param player Lavalink player instance
 * @param speed Speed value (0.25-2.0), or null to remove speed filter (reset to 1.0)
 * @param retryOnFailure Whether to retry if filter is not applied (default: true)
 */
export async function applySpeedFilter(
  player: Player,
  speed: number | null,
  retryOnFailure: boolean = true
): Promise<boolean> {
  try {
    // Check if player has filterManager
    if (!player.filterManager) {
      logger.warn('Player does not have filterManager', {
        guildId: player.guildId,
        playerExists: !!player,
      });
      return false;
    }

    // Check if filterManager has setSpeed method
    if (typeof player.filterManager.setSpeed !== 'function') {
      logger.warn('Player filterManager missing setSpeed method', {
        guildId: player.guildId,
      });
      return false;
    }

    const maxRetries = 2; // Maximum retry attempts
    let retryCount = 0;

    const applyFilter = async (): Promise<boolean> => {
      try {
        // Use FilterManager.setSpeed() method
        // If speed is null, reset to 1.0 (normal speed)
        const speedToApply = speed === null ? 1.0 : speed;
        const success = await player.filterManager.setSpeed(speedToApply);

        if (!success) {
          logger.warn('setSpeed returned false', {
            guildId: player.guildId,
            speed: speedToApply,
          });
          return false;
        }

        // Wait a bit for filter to be applied
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify the speed was applied correctly by checking filterManager.data
        const appliedSpeed = player.filterManager.data.timescale?.speed;

        // Verify the speed was applied correctly (allow small floating point differences)
        const isApplied =
          appliedSpeed !== undefined && Math.abs(appliedSpeed - speedToApply) < 0.01;

        if (isApplied) {
          logger.info('Applied speed filter', {
            guildId: player.guildId,
            speed: speedToApply,
            verified: true,
          });
          return true;
        } else {
          logger.warn('Speed filter not applied correctly', {
            guildId: player.guildId,
            expectedSpeed: speedToApply,
            actualSpeed: appliedSpeed,
            retryCount,
          });
          return false;
        }
      } catch (error) {
        logger.error('Error in applyFilter', {
          guildId: player.guildId,
          speed,
          error,
        });
        return false;
      }
    };

    // Try to apply filter
    let success = await applyFilter();

    // Retry if failed and retryOnFailure is enabled
    if (!success && retryOnFailure && speed !== null) {
      while (!success && retryCount < maxRetries) {
        retryCount++;
        logger.info('Retrying speed filter application', {
          guildId: player.guildId,
          speed,
          attempt: retryCount,
          maxRetries,
        });

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 200 * retryCount));

        success = await applyFilter();
      }

      if (!success) {
        logger.error('Failed to apply speed filter after retries', {
          guildId: player.guildId,
          speed,
          retryCount,
        });
        return false;
      }
    } else if (speed === null) {
      logger.info('Removed speed filter (reset to 1.0)', { guildId: player.guildId });
      return true;
    }

    return success;
  } catch (error) {
    logger.error('Error applying speed filter', {
      guildId: player.guildId,
      speed,
      error,
    });
    return false;
  }
}

/**
 * Get current speed from player filters using FilterManager API
 * @param player Lavalink player instance
 * @returns Current speed value (1.0 if not set)
 */
export function getCurrentSpeed(player: Player): number {
  try {
    if (!player.filterManager) {
      return 1.0;
    }

    // Get current speed from filterManager.data
    const speed = player.filterManager.data.timescale?.speed;
    return speed ?? 1.0;
  } catch (error) {
    logger.warn('Error getting current speed', { error, guildId: player.guildId });
    return 1.0;
  }
}

/**
 * Reset all audio filters using FilterManager API
 */
export async function resetAudioFilters(player: Player): Promise<void> {
  try {
    if (!player.filterManager) {
      logger.warn('Player does not have filterManager', { guildId: player.guildId });
      return;
    }

    await player.filterManager.resetFilters();
    logger.info('Reset audio filters', { guildId: player.guildId });
  } catch (error) {
    logger.error('Error resetting audio filters', {
      guildId: player.guildId,
      error,
    });
  }
}
