/**
 * Speed session management
 * Stores speed settings per guild to apply to all tracks in the current session
 */

// Map to store speed settings: guildId -> speed (null means no speed override)
const speedSettings = new Map<string, number | null>();

/**
 * Set speed for a guild session
 * @param guildId Guild ID
 * @param speed Speed value (0.25-2.0) or null to reset
 */
export function setGuildSpeed(guildId: string, speed: number | null): void {
  if (speed === null) {
    speedSettings.delete(guildId);
  } else {
    speedSettings.set(guildId, speed);
  }
}

/**
 * Get speed setting for a guild
 * @param guildId Guild ID
 * @returns Speed value or null if not set
 */
export function getGuildSpeed(guildId: string): number | null {
  return speedSettings.get(guildId) ?? null;
}

/**
 * Clear speed setting for a guild (reset to default)
 * @param guildId Guild ID
 */
export function clearGuildSpeed(guildId: string): void {
  speedSettings.delete(guildId);
}

/**
 * Clear speed setting when player is destroyed
 * @param guildId Guild ID
 */
export function onPlayerDestroy(guildId: string): void {
  speedSettings.delete(guildId);
}
