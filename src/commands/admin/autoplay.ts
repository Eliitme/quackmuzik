import { PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/Command';
import {
  getGuildLocale,
  getGuildAutoplay,
  setGuildAutoplay,
  getGuildPrefix,
} from '../../utils/database';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { translate, type Locale } from '../../utils/i18n';

export const autoplayCommand: Command = {
  name: 'autoplay',
  description: 'View or toggle autoplay mode (AI recommendation when queue ends)',
  usage: 'autoplay [on|off]',
  aliases: ['ap'],
  category: 'admin',
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  guildOnly: true,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const guildId = message.guild!.id; // Safe to use ! because guildOnly is true

    // If no args, display current autoplay mode status
    if (args.length === 0) {
      const isEnabled = await getGuildAutoplay(guildId);
      const embed = createEmbed({
        title: translate(locale, 'commands.autoplay.current_title'),
        description: translate(locale, 'commands.autoplay.current_description'),
      });

      embed.addFields({
        name: translate(locale, 'commands.autoplay.status'),
        value: isEnabled
          ? translate(locale, 'commands.autoplay.enabled')
          : translate(locale, 'commands.autoplay.disabled'),
        inline: false,
      });

      if (isEnabled) {
        embed.addFields({
          name: translate(locale, 'commands.autoplay.enabled_info'),
          value: translate(locale, 'commands.autoplay.enabled_description'),
          inline: false,
        });
      } else {
        embed.addFields({
          name: translate(locale, 'commands.autoplay.disabled_info'),
          value: translate(locale, 'commands.autoplay.disabled_description'),
          inline: false,
        });
      }

      const prefix = await getGuildPrefix(guildId);
      embed.addFields({
        name: translate(locale, 'commands.autoplay.how_to_toggle'),
        value: translate(locale, 'commands.autoplay.toggle_instruction', { prefix }),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Toggle autoplay mode
    const input = args[0].trim().toLowerCase();

    let enabled: boolean;
    if (input === 'on' || input === 'enable' || input === 'true' || input === '1') {
      enabled = true;
    } else if (input === 'off' || input === 'disable' || input === 'false' || input === '0') {
      enabled = false;
    } else {
      await message.reply(translate(locale, 'commands.autoplay.invalid_value'));
      return;
    }

    try {
      await setGuildAutoplay(guildId, enabled);
      const embed = createEmbed({
        title: enabled
          ? translate(locale, 'commands.autoplay.enabled_title')
          : translate(locale, 'commands.autoplay.disabled_title'),
        description: enabled
          ? translate(locale, 'commands.autoplay.enabled_message')
          : translate(locale, 'commands.autoplay.disabled_message'),
        color: enabled ? '#00FF00' : '#FFA500',
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error setting autoplay mode', { guildId, enabled, error });
      await message.reply(translate(locale, 'commands.autoplay.error'));
    }
  },
};
