import { PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/Command';
import {
  getGuildLocale,
  getGuildDjAudioSettings,
  setGuildDjAudioSettings,
  getGuildPrefix,
  type DjAudioSettings,
} from '../../utils/database';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { translate, type Locale } from '../../utils/i18n';

export const djconfigCommand: Command = {
  name: 'djconfig',
  description: 'Configure audio filters and effects for DJ role',
  usage: 'djconfig [filter] [on|off]',
  aliases: ['djfilters', 'djaudio'],
  category: 'admin',
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  guildOnly: true,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const guildId = message.guild!.id; // Safe to use ! because guildOnly is true

    // If no args, display current settings
    if (args.length === 0) {
      const settings = await getGuildDjAudioSettings(guildId);
      const embed = createEmbed({
        title: translate(locale, 'commands.djconfig.current_title'),
        description: translate(locale, 'commands.djconfig.current_description'),
      });

      const filterStatus = [
        {
          name: translate(locale, 'commands.djconfig.bassboost'),
          value: settings.bassboost ? '✅' : '❌',
          inline: true,
        },
        {
          name: translate(locale, 'commands.djconfig.nightcore'),
          value: settings.nightcore ? '✅' : '❌',
          inline: true,
        },
        {
          name: translate(locale, 'commands.djconfig.lofi'),
          value: settings.lofi ? '✅' : '❌',
          inline: true,
        },
        {
          name: translate(locale, 'commands.djconfig.vaporwave'),
          value: settings.vaporwave ? '✅' : '❌',
          inline: true,
        },
        {
          name: translate(locale, 'commands.djconfig.volume_normalization'),
          value: settings.volumeNormalization ? '✅' : '❌',
          inline: true,
        },
        {
          name: translate(locale, 'commands.djconfig.audio8d'),
          value: settings.audio8d ? '✅' : '❌',
          inline: true,
        },
      ];

      embed.addFields(filterStatus);

      const prefix = await getGuildPrefix(guildId);
      embed.addFields({
        name: translate(locale, 'commands.djconfig.how_to_configure'),
        value: translate(locale, 'commands.djconfig.config_instruction', { prefix }),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Parse filter name and value
    const filterName = args[0].trim().toLowerCase();
    const value = args[1]?.trim().toLowerCase();

    if (
      !value ||
      (value !== 'on' && value !== 'off' && value !== 'enable' && value !== 'disable')
    ) {
      await message.reply(translate(locale, 'commands.djconfig.invalid_value'));
      return;
    }

    const enabled = value === 'on' || value === 'enable';

    // Get current settings
    const currentSettings = await getGuildDjAudioSettings(guildId);
    const newSettings: DjAudioSettings = { ...currentSettings };

    // Map filter names
    const filterMap: Record<string, keyof DjAudioSettings> = {
      bassboost: 'bassboost',
      bass: 'bassboost',
      nightcore: 'nightcore',
      lofi: 'lofi',
      'lo-fi': 'lofi',
      vaporwave: 'vaporwave',
      vapor: 'vaporwave',
      'volume-normalization': 'volumeNormalization',
      normalization: 'volumeNormalization',
      normalize: 'volumeNormalization',
      '8d': 'audio8d',
      '8d-audio': 'audio8d',
      audio8d: 'audio8d',
    };

    const filterKey = filterMap[filterName];
    if (!filterKey) {
      await message.reply(translate(locale, 'commands.djconfig.invalid_filter'));
      return;
    }

    // Update setting
    newSettings[filterKey] = enabled;

    try {
      await setGuildDjAudioSettings(guildId, newSettings);
      // Map filterKey (camelCase) to locale key (snake_case)
      const localeKeyMap: Record<keyof DjAudioSettings, string> = {
        bassboost: 'bassboost',
        nightcore: 'nightcore',
        lofi: 'lofi',
        vaporwave: 'vaporwave',
        volumeNormalization: 'volume_normalization',
        audio8d: 'audio8d',
      };
      const localeKey = localeKeyMap[filterKey];
      const filterDisplayName = translate(locale, `commands.djconfig.${localeKey}`);
      const embed = createEmbed({
        title: enabled
          ? translate(locale, 'commands.djconfig.enabled_title')
          : translate(locale, 'commands.djconfig.disabled_title'),
        description: enabled
          ? translate(locale, 'commands.djconfig.enabled_message', {
              filter: filterDisplayName,
            })
          : translate(locale, 'commands.djconfig.disabled_message', {
              filter: filterDisplayName,
            }),
        color: enabled ? '#00FF00' : '#FFA500',
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error setting DJ audio config', { guildId, filterKey, enabled, error });
      await message.reply(translate(locale, 'commands.djconfig.error'));
    }
  },
};
