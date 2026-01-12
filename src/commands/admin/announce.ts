import { PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/Command';
import {
  getGuildLocale,
  getGuildAnnounceTrack,
  setGuildAnnounceTrack,
  getGuildPrefix,
} from '../../utils/database';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { translate, type Locale } from '../../utils/i18n';

export const announceCommand: Command = {
  name: 'announce',
  description: 'View or toggle track announcement when new track starts',
  usage: 'announce [on|off]',
  aliases: ['announcetrack', 'trackannounce'],
  category: 'admin',
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  guildOnly: true,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const guildId = message.guild!.id; // Safe to use ! because guildOnly is true

    // If no args, display current announce setting
    if (args.length === 0) {
      const isEnabled = await getGuildAnnounceTrack(guildId);
      const embed = createEmbed({
        title: translate(locale, 'commands.announce.current_title'),
        description: translate(locale, 'commands.announce.current_description'),
      });

      embed.addFields({
        name: translate(locale, 'commands.announce.status'),
        value: isEnabled
          ? translate(locale, 'commands.announce.enabled')
          : translate(locale, 'commands.announce.disabled'),
        inline: false,
      });

      if (isEnabled) {
        embed.addFields({
          name: translate(locale, 'commands.announce.enabled_info'),
          value: translate(locale, 'commands.announce.enabled_description'),
          inline: false,
        });
      } else {
        embed.addFields({
          name: translate(locale, 'commands.announce.disabled_info'),
          value: translate(locale, 'commands.announce.disabled_description'),
          inline: false,
        });
      }

      const prefix = await getGuildPrefix(guildId);
      embed.addFields({
        name: translate(locale, 'commands.announce.how_to_toggle'),
        value: translate(locale, 'commands.announce.toggle_instruction', { prefix }),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Toggle announce setting
    const input = args[0].trim().toLowerCase();

    let enabled: boolean;
    if (input === 'on' || input === 'enable' || input === 'true' || input === '1') {
      enabled = true;
    } else if (input === 'off' || input === 'disable' || input === 'false' || input === '0') {
      enabled = false;
    } else {
      await message.reply(translate(locale, 'commands.announce.invalid_value'));
      return;
    }

    try {
      await setGuildAnnounceTrack(guildId, enabled);
      const embed = createEmbed({
        title: enabled
          ? translate(locale, 'commands.announce.enabled_title')
          : translate(locale, 'commands.announce.disabled_title'),
        description: enabled
          ? translate(locale, 'commands.announce.enabled_message')
          : translate(locale, 'commands.announce.disabled_message'),
        color: enabled ? '#00FF00' : '#FFA500',
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error setting announce track', { guildId, enabled, error });
      await message.reply(translate(locale, 'commands.announce.error'));
    }
  },
};
