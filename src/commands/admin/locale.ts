import { PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/Command';
import { getGuildLocale, setGuildLocale, getGuildPrefix } from '../../utils/database';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { translate, getTranslations, type Locale } from '../../utils/i18n';

export const localeCommand: Command = {
  name: 'locale',
  description: 'View or change bot display language for this server',
  usage: 'locale [language]',
  aliases: ['language', 'lang'],
  category: 'admin',
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  guildOnly: true,

  async execute({ message, args }) {
    const currentLocale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const localeT = getTranslations(currentLocale, 'commands.locale');

    const guildId = message.guild!.id; // Safe to use ! because guildOnly is true

    // Available languages list
    const availableLocales: Record<string, { name: string; flag: string }> = {
      vi: { name: 'Tiếng Việt', flag: '🇻🇳' },
      en: { name: 'English', flag: '🇺🇸' },
    };

    // If no args, display current locale
    if (args.length === 0) {
      const currentLocaleInfo = availableLocales[currentLocale];
      const embed = createEmbed({
        title: translate(currentLocale, 'commands.locale.current_title'),
        description: translate(currentLocale, 'commands.locale.current_description', {
          locale: currentLocaleInfo.flag + ' ' + currentLocaleInfo.name,
          code: currentLocale,
        }),
      });

      // Add available languages list
      let availableList = '';
      Object.entries(availableLocales).forEach(([code, info]) => {
        const isCurrent = code === currentLocale ? ' ✅' : '';
        availableList += `${info.flag} **${info.name}** (\`${code}\`)${isCurrent}\n`;
      });

      embed.addFields({
        name: translate(currentLocale, 'commands.locale.available_title'),
        value: availableList,
        inline: false,
      });

      const prefix = await getGuildPrefix(guildId);
      embed.addFields({
        name: translate(currentLocale, 'commands.locale.change_hint'),
        value: translate(currentLocale, 'commands.locale.change_value', {
          prefix,
        }),
        inline: false,
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Set new locale
    const newLocale = args[0].toLowerCase().trim();

    // Validate locale
    if (!availableLocales[newLocale]) {
      const validCodes = Object.keys(availableLocales).join(', ');
      await message.reply(
        translate(currentLocale, 'commands.locale.invalid', {
          code: newLocale,
          valid: validCodes,
        })
      );
      return;
    }

    // If already current locale
    if (newLocale === currentLocale) {
      await message.reply(translate(currentLocale, 'commands.locale.already_set'));
      return;
    }

    try {
      await setGuildLocale(guildId, newLocale);
      const newLocaleInfo = availableLocales[newLocale];

      // Use new locale to display message
      const embed = createEmbed({
        title: translate(newLocale as Locale, 'commands.locale.updated_title'),
        description: translate(newLocale as Locale, 'commands.locale.updated_description', {
          locale: newLocaleInfo.flag + ' ' + newLocaleInfo.name,
          code: newLocale,
        }),
        color: '#00FF00',
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error setting locale', { guildId, newLocale, error });
      await message.reply(translate(currentLocale, 'commands.locale.error'));
    }
  },
};
