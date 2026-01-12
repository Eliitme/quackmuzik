import { PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/Command';
import {
  getGuildLocale,
  getGuild24_7Mode,
  setGuild24_7Mode,
  getGuildPrefix,
} from '../../utils/database';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { translate, type Locale } from '../../utils/i18n';

export const mode247Command: Command = {
  name: '247mode',
  description: 'View or toggle 24/7 mode (bot stays in voice channel even when queue is empty)',
  usage: '247mode [on|off]',
  aliases: ['24/7', '247', 'stay'],
  category: 'admin',
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  guildOnly: true,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const guildId = message.guild!.id; // Safe to use ! because guildOnly is true

    // If no args, display current 24/7 mode status
    if (args.length === 0) {
      const isEnabled = await getGuild24_7Mode(guildId);
      const embed = createEmbed({
        title: translate(locale, 'commands.247mode.current_title'),
        description: translate(locale, 'commands.247mode.current_description'),
      });

      embed.addFields({
        name: translate(locale, 'commands.247mode.status'),
        value: isEnabled
          ? translate(locale, 'commands.247mode.enabled')
          : translate(locale, 'commands.247mode.disabled'),
        inline: false,
      });

      if (isEnabled) {
        embed.addFields({
          name: translate(locale, 'commands.247mode.enabled_info'),
          value: translate(locale, 'commands.247mode.enabled_description'),
          inline: false,
        });
      } else {
        embed.addFields({
          name: translate(locale, 'commands.247mode.disabled_info'),
          value: translate(locale, 'commands.247mode.disabled_description'),
          inline: false,
        });
      }

      const prefix = await getGuildPrefix(guildId);
      embed.addFields({
        name: translate(locale, 'commands.247mode.how_to_toggle'),
        value: translate(locale, 'commands.247mode.toggle_instruction', { prefix }),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Toggle 24/7 mode
    const input = args[0].trim().toLowerCase();

    let enabled: boolean;
    if (input === 'on' || input === 'enable' || input === 'true' || input === '1') {
      enabled = true;
    } else if (input === 'off' || input === 'disable' || input === 'false' || input === '0') {
      enabled = false;
    } else {
      await message.reply(translate(locale, 'commands.247mode.invalid_value'));
      return;
    }

    try {
      await setGuild24_7Mode(guildId, enabled);
      const embed = createEmbed({
        title: enabled
          ? translate(locale, 'commands.247mode.enabled_title')
          : translate(locale, 'commands.247mode.disabled_title'),
        description: enabled
          ? translate(locale, 'commands.247mode.enabled_message')
          : translate(locale, 'commands.247mode.disabled_message'),
        color: enabled ? '#00FF00' : '#FFA500',
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error setting 24/7 mode', { guildId, enabled, error });
      await message.reply(translate(locale, 'commands.247mode.error'));
    }
  },
};
