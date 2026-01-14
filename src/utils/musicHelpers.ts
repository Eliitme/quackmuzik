import { Message, GuildMember, VoiceChannel } from 'discord.js';
import { LavalinkManager, Player } from 'lavalink-client';
import { getGuildLocale, getGuildPrefix } from './database';
import { translate, type Locale } from './i18n';
import { logger } from './logger';

/**
 * Command context with locale and prefix
 */
export interface CommandContextData {
  locale: Locale;
  prefix: string;
}

/**
 * Get command context (locale and prefix) for a guild
 * @param guildId - Guild ID or null for DM
 * @returns Command context data
 */
export async function getCommandContext(guildId: string | null): Promise<CommandContextData> {
  const locale = (await getGuildLocale(guildId)) as Locale;
  const prefix = await getGuildPrefix(guildId, 'z!');
  return { locale, prefix };
}

/**
 * Validate that user is in a voice channel
 * @param member - Guild member
 * @param locale - User locale
 * @param commandName - Command name for error message
 * @returns Voice channel if valid, null otherwise
 */
export function validateVoiceChannel(
  member: GuildMember | null,
  locale: Locale,
  commandName: string
): VoiceChannel | null {
  const voiceChannel = member?.voice.channel;

  if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
    return null;
  }

  return voiceChannel;
}

/**
 * Get voice channel and validate, sending error message if invalid
 * @param member - Guild member
 * @param locale - User locale
 * @param commandName - Command name for error message
 * @param message - Message to reply to if invalid
 * @returns Voice channel if valid, null otherwise
 */
export async function getAndValidateVoiceChannel(
  member: GuildMember | null,
  locale: Locale,
  commandName: string,
  message: Message
): Promise<VoiceChannel | null> {
  const voiceChannel = validateVoiceChannel(member, locale, commandName);

  if (!voiceChannel) {
    await message.reply(translate(locale, `commands.${commandName}.no_voice`));
    return null;
  }

  return voiceChannel;
}

/**
 * Validate that player exists
 * @param player - Player instance or null
 * @param requireCurrent - Whether to require current track
 * @returns true if valid, false otherwise
 */
export function validatePlayer(player: Player | null, requireCurrent: boolean = false): boolean {
  if (!player) {
    return false;
  }

  if (requireCurrent && !player.queue.current) {
    return false;
  }

  return true;
}

/**
 * Get player and validate, sending error message if invalid
 * @param lavalinkManager - Lavalink manager
 * @param guildId - Guild ID
 * @param locale - User locale
 * @param commandName - Command name for error message
 * @param message - Message to reply to if invalid
 * @param requireCurrent - Whether to require current track
 * @returns Player if valid, null otherwise
 */
export async function getAndValidatePlayer(
  lavalinkManager: LavalinkManager,
  guildId: string,
  locale: Locale,
  commandName: string,
  message: Message,
  requireCurrent: boolean = false
): Promise<Player | null> {
  const player = lavalinkManager.getPlayer(guildId) || null;

  if (!validatePlayer(player, requireCurrent)) {
    const errorKey = requireCurrent
      ? `commands.${commandName}.not_playing`
      : `commands.${commandName}.no_queue`;
    await message.reply(translate(locale, errorKey));
    return null;
  }

  return player;
}

/**
 * Validate that user is in the same voice channel as player
 * @param player - Player instance
 * @param voiceChannel - User's voice channel
 * @param locale - User locale
 * @param commandName - Command name for error message
 * @param message - Message to reply to if invalid
 * @returns true if valid, false otherwise
 */
export async function validateSameVoiceChannel(
  player: Player,
  voiceChannel: VoiceChannel,
  locale: Locale,
  commandName: string,
  message: Message
): Promise<boolean> {
  if (player.voiceChannelId !== voiceChannel.id) {
    await message.reply(translate(locale, `commands.${commandName}.same_voice_channel`));
    return false;
  }

  return true;
}

/**
 * Get or create player for a guild
 * @param lavalinkManager - Lavalink manager
 * @param guildId - Guild ID
 * @param voiceChannelId - Voice channel ID
 * @param textChannelId - Text channel ID
 * @returns Player instance
 */
export function getOrCreatePlayer(
  lavalinkManager: LavalinkManager,
  guildId: string,
  voiceChannelId: string,
  textChannelId: string
): Player {
  let player = lavalinkManager.getPlayer(guildId);

  if (!player) {
    player = lavalinkManager.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true,
      selfMute: false,
    });
  }

  return player;
}

/**
 * Ensure player is connected to voice channel
 * @param player - Player instance
 * @param guildId - Guild ID for logging
 * @param voiceChannelId - Voice channel ID for logging
 * @returns Promise that resolves when connected
 */
export async function ensurePlayerConnected(
  player: Player,
  guildId: string,
  voiceChannelId: string
): Promise<void> {
  if (!player.connected) {
    logger.info('[MUSIC] Connecting to voice channel', {
      guildId,
      voiceChannelId,
    });
    await player.connect();
  }
}

/**
 * Combined validation: voice channel + player + same channel
 * Useful for commands that need all three checks
 * @param member - Guild member
 * @param lavalinkManager - Lavalink manager
 * @param guildId - Guild ID
 * @param locale - User locale
 * @param commandName - Command name for error messages
 * @param message - Message to reply to if invalid
 * @param requireCurrent - Whether to require current track
 * @returns Object with voiceChannel and player if all valid, null otherwise
 */
export async function validateMusicCommand(
  member: GuildMember | null,
  lavalinkManager: LavalinkManager,
  guildId: string,
  locale: Locale,
  commandName: string,
  message: Message,
  requireCurrent: boolean = true
): Promise<{ voiceChannel: VoiceChannel; player: Player } | null> {
  // Validate voice channel
  const voiceChannel = await getAndValidateVoiceChannel(member, locale, commandName, message);
  if (!voiceChannel) {
    return null;
  }

  // Validate player
  const player = await getAndValidatePlayer(
    lavalinkManager,
    guildId,
    locale,
    commandName,
    message,
    requireCurrent
  );
  if (!player) {
    return null;
  }

  // Validate same voice channel
  const isSameChannel = await validateSameVoiceChannel(
    player,
    voiceChannel,
    locale,
    commandName,
    message
  );
  if (!isSameChannel) {
    return null;
  }

  return { voiceChannel, player };
}
