import { Message, PermissionFlagsBits, PermissionResolvable } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';

export interface CommandContext {
  message: Message;
  args: string[];
  lavalinkManager: LavalinkManager;
}

export type CommandCategory = 'music' | 'admin' | 'system';

export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  /**
   * Command category for organization and help display
   * - 'music': Music playback commands
   * - 'admin': Server administration commands
   * - 'system': System/debug commands
   */
  category: CommandCategory;
  /**
   * Required permissions for this command (guild only)
   * If not provided, command can be used by anyone
   */
  requiredPermissions?: PermissionResolvable[];
  /**
   * Whether this command can only be used in a guild (server)
   * Default: false (can be used in DMs)
   */
  guildOnly?: boolean;
  /**
   * Cooldown time in seconds before user can use this command again
   * Default: 10 seconds
   * Set to 0 to disable cooldown
   */
  cooldown?: number;
  execute: (context: CommandContext) => Promise<void>;
}
