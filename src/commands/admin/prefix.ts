import { PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/Command';
import {
  getGuildPrefix,
  setGuildPrefix,
  resetGuildPrefix,
  getGuildLocale,
} from '../../utils/database';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { translate, getTranslations, type Locale } from '../../utils/i18n';

export const prefixCommand: Command = {
  name: 'prefix',
  description: 'View or change bot prefix for this server',
  usage: 'prefix [new prefix]',
  aliases: ['setprefix'],
  category: 'admin',
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  guildOnly: true,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const prefixT = getTranslations(locale, 'commands.prefix');

    const guildId = message.guild!.id; // Safe to use ! because guildOnly is true

    // If no args, display current prefix
    if (args.length === 0) {
      const currentPrefix = await getGuildPrefix(guildId);
      const embed = createEmbed({
        title: translate(locale, 'commands.prefix.current_title'),
        description: translate(locale, 'commands.prefix.current_description', {
          prefix: currentPrefix,
        }),
      }).addFields({
        name: translate(locale, 'commands.prefix.change_hint'),
        value: translate(locale, 'commands.prefix.change_value', { prefix: currentPrefix }),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Set new prefix
    const newPrefix = args[0].trim();

    // Validate prefix
    if (newPrefix.length === 0 || newPrefix.length > 10) {
      await message.reply(translate(locale, 'commands.prefix.invalid_length'));
      return;
    }

    // Don't allow spaces in prefix
    if (newPrefix.includes(' ')) {
      await message.reply(translate(locale, 'commands.prefix.no_spaces'));
      return;
    }

    try {
      await setGuildPrefix(guildId, newPrefix);
      const embed = createEmbed({
        title: translate(locale, 'commands.prefix.updated_title'),
        description: translate(locale, 'commands.prefix.updated_description', {
          prefix: newPrefix,
        }),
        color: '#00FF00',
      }).addFields({
        name: translate(locale, 'commands.prefix.example'),
        value: translate(locale, 'commands.prefix.example_value', { prefix: newPrefix }),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error setting prefix', { guildId, newPrefix, error });
      await message.reply(translate(locale, 'commands.prefix.error'));
    }
  },
};
