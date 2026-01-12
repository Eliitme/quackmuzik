import { Client, Message } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { commands } from '../commands';
import { logger } from '../utils/logger';
import { getGuildPrefix, getGuildLocale, hasGuildAcceptedTerms } from '../utils/database';
import {
  hasPermissions,
  canUseInContext,
  getPermissionErrorMessage,
  getGuildOnlyErrorMessage,
  isBotOwner,
  getOwnerOnlyErrorMessage,
} from '../utils/permissions';
import { getCooldownRemaining, setCooldown } from '../utils/cooldown';
import { translate, type Locale } from '../utils/i18n';

/**
 * Message create event handler
 * Handles command parsing and execution
 */
export function registerMessageCreateEvent(client: Client, lavalinkManager: LavalinkManager): void {
  client.on('messageCreate', async (message: Message) => {
    // Ignore bots
    if (message.author.bot) return;

    // Get prefix from database (default: 'z!')
    const defaultPrefix = 'z!';
    const prefix = await getGuildPrefix(message.guild?.id || null, defaultPrefix);

    // Check if message starts with prefix
    if (!message.content.startsWith(prefix)) return;

    // Parse command and args
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Find command in registry
    const command = commands.get(commandName);

    if (!command) return;

    // Get locale for error messages
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;

    // Check if command can be used in current context (guild vs DM)
    if (!canUseInContext(message, command.guildOnly)) {
      const errorMsg = await getGuildOnlyErrorMessage(locale, command.name);
      await message.reply(errorMsg);
      return;
    }

    // Check terms acceptance for guild commands (except terms command itself)
    if (command.guildOnly && command.name !== 'terms' && message.guild) {
      const termsAccepted = await hasGuildAcceptedTerms(message.guild.id);
      if (!termsAccepted) {
        const prefix = await getGuildPrefix(message.guild.id);
        await message.reply(
          translate(locale, 'common.terms_not_accepted', {
            prefix,
          })
        );
        return;
      }
    }

    // Check if command is system category and user is bot owner
    if (command.category === 'system' && !isBotOwner(message.author.id)) {
      const errorMsg = await getOwnerOnlyErrorMessage(locale, command.name);
      await message.reply(errorMsg);
      return;
    }

    // Check if user has required permissions
    if (!hasPermissions(message, command.requiredPermissions)) {
      const errorMsg = await getPermissionErrorMessage(locale, command.name);
      await message.reply(errorMsg);
      return;
    }

    // Check cooldown
    const cooldownSeconds = command.cooldown ?? 10; // Default 10 seconds
    const remaining = getCooldownRemaining(
      message.author.id,
      message.guild?.id || null,
      command.name,
      cooldownSeconds
    );

    if (remaining > 0) {
      await message.reply(
        translate(locale, 'common.cooldown', {
          seconds: remaining,
          command: command.name,
        })
      );
      return;
    }

    // Execute command
    try {
      logger.info('Command execute', {
        command: command.name,
        args,
        userId: message.author.id,
        userTag: message.author.tag,
        guildId: message.guild?.id,
        guildName: message.guild?.name,
        channelId: message.channel.id,
      });
      await command.execute({
        message,
        args,
        lavalinkManager,
      });

      // Set cooldown after successful execution
      setCooldown(message.author.id, message.guild?.id || null, command.name, cooldownSeconds);

      logger.info('Command finished', {
        command: command.name,
        userId: message.author.id,
        guildId: message.guild?.id,
      });
    } catch (error) {
      logger.error('Error executing command', {
        command: commandName,
        error,
        userId: message.author.id,
        guildId: message.guild?.id,
      });
      const errorLocale = (await getGuildLocale(message.guild?.id || null)) as Locale;
      await message.reply(translate(errorLocale, 'common.command_error'));
    }
  });
}
