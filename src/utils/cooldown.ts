/**
 * Cooldown manager to prevent command spam
 * Tracks cooldown per user per command (or per guild per command for guild-only commands)
 */

interface CooldownEntry {
  userId: string;
  guildId: string | null;
  commandName: string;
  expiresAt: number; // timestamp in milliseconds
}

const cooldowns: Map<string, CooldownEntry> = new Map();
const DEFAULT_COOLDOWN = 10; // seconds

/**
 * Generate cooldown key for tracking
 */
function getCooldownKey(userId: string, guildId: string | null, commandName: string): string {
  // For guild commands, cooldown is per guild per user
  // For DM commands, cooldown is per user
  return guildId ? `${guildId}:${userId}:${commandName}` : `${userId}:${commandName}`;
}

/**
 * Check if user is on cooldown for a command
 * @param userId - User ID
 * @param guildId - Guild ID (null for DMs)
 * @param commandName - Command name
 * @param cooldownSeconds - Cooldown duration in seconds (default: 10)
 * @returns Remaining cooldown in seconds, or 0 if not on cooldown
 */
export function getCooldownRemaining(
  userId: string,
  guildId: string | null,
  commandName: string,
  cooldownSeconds: number = DEFAULT_COOLDOWN
): number {
  if (cooldownSeconds <= 0) {
    return 0; // No cooldown
  }

  const key = getCooldownKey(userId, guildId, commandName);
  const entry = cooldowns.get(key);

  if (!entry) {
    return 0; // No cooldown entry
  }

  const now = Date.now();
  if (now >= entry.expiresAt) {
    // Cooldown expired, remove entry
    cooldowns.delete(key);
    return 0;
  }

  // Return remaining seconds (rounded up)
  return Math.ceil((entry.expiresAt - now) / 1000);
}

/**
 * Set cooldown for a user/command
 * @param userId - User ID
 * @param guildId - Guild ID (null for DMs)
 * @param commandName - Command name
 * @param cooldownSeconds - Cooldown duration in seconds (default: 10)
 */
export function setCooldown(
  userId: string,
  guildId: string | null,
  commandName: string,
  cooldownSeconds: number = DEFAULT_COOLDOWN
): void {
  if (cooldownSeconds <= 0) {
    return; // No cooldown to set
  }

  const key = getCooldownKey(userId, guildId, commandName);
  const expiresAt = Date.now() + cooldownSeconds * 1000;

  cooldowns.set(key, {
    userId,
    guildId,
    commandName,
    expiresAt,
  });
}

/**
 * Clear cooldown for a user/command (useful for testing or admin override)
 * @param userId - User ID
 * @param guildId - Guild ID (null for DMs)
 * @param commandName - Command name
 */
export function clearCooldown(userId: string, guildId: string | null, commandName: string): void {
  const key = getCooldownKey(userId, guildId, commandName);
  cooldowns.delete(key);
}

/**
 * Clean up expired cooldowns (call periodically to prevent memory leak)
 */
export function cleanupExpiredCooldowns(): void {
  const now = Date.now();
  for (const [key, entry] of cooldowns.entries()) {
    if (now >= entry.expiresAt) {
      cooldowns.delete(key);
    }
  }
}

// Cleanup expired cooldowns every 5 minutes
setInterval(cleanupExpiredCooldowns, 5 * 60 * 1000);
