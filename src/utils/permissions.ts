import { Message, PermissionResolvable } from 'discord.js';
import { getGuildLocale } from './database';
import { translate, type Locale } from './i18n';

/**
 * Check if user has required permissions for a command
 * @param message - Discord message
 * @param requiredPermissions - Array of required permissions
 * @returns true if user has all required permissions, false otherwise
 */
export function hasPermissions(
  message: Message,
  requiredPermissions?: PermissionResolvable[]
): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  // Commands with permissions must be used in a guild
  if (!message.guild || !message.member) {
    return false;
  }

  // Check if member has all required permissions
  return message.member.permissions.has(requiredPermissions);
}

/**
 * Check if command can be used in current context (guild vs DM)
 * @param message - Discord message
 * @param guildOnly - Whether command requires guild
 * @returns true if command can be used, false otherwise
 */
export function canUseInContext(message: Message, guildOnly?: boolean): boolean {
  if (!guildOnly) {
    return true; // Can be used anywhere
  }

  return !!message.guild; // Must be in a guild
}

/**
 * Get permission error message based on locale
 * @param locale - User locale
 * @param commandName - Command name for translation key
 * @returns Error message
 */
export async function getPermissionErrorMessage(
  locale: Locale | null,
  commandName: string
): Promise<string> {
  const targetLocale = locale || 'vi';
  return translate(targetLocale, `commands.${commandName}.no_permission`);
}

/**
 * Get guild-only error message based on locale
 * @param locale - User locale
 * @param commandName - Command name for translation key
 * @returns Error message
 */
export async function getGuildOnlyErrorMessage(
  locale: Locale | null,
  commandName: string
): Promise<string> {
  const targetLocale = locale || 'vi';
  return translate(targetLocale, `commands.${commandName}.guild_only`);
}

/**
 * Check if user is bot owner
 * Bot owner is determined by BOT_OWNER_ID environment variable
 */
export function isBotOwner(userId: string): boolean {
  const ownerId = process.env.BOT_OWNER_ID;
  if (!ownerId) {
    return false;
  }
  return userId === ownerId;
}

/**
 * Get error message for owner-only commands
 */
export async function getOwnerOnlyErrorMessage(
  locale: Locale | null,
  commandName: string
): Promise<string> {
  const targetLocale = locale || 'vi';
  return translate(targetLocale, `commands.${commandName}.owner_only`);
}
