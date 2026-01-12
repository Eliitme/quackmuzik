import { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../types/Command';
import {
  getGuildLocale,
  hasGuildAcceptedTerms,
  setGuildTermsAccepted,
} from '../../utils/database';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { translate, getTranslations, type Locale } from '../../utils/i18n';
import { getGuildPrefix } from '../../utils/database';

export const termsCommand: Command = {
  name: 'terms',
  description: 'View or accept Terms of Service',
  usage: 'terms [accept]',
  aliases: ['tos', 'terms-of-service'],
  category: 'admin',
  guildOnly: true,
  cooldown: 5,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const prefix = await getGuildPrefix(message.guild?.id || null);
    const termsT = getTranslations(locale, 'commands.terms');

    const guildId = message.guild!.id; // Safe to use ! because guildOnly is true

    // Check if user wants to accept terms
    if (args.length > 0 && args[0].toLowerCase() === 'accept') {
      // Check if already accepted
      const alreadyAccepted = await hasGuildAcceptedTerms(guildId);
      if (alreadyAccepted) {
        await message.reply(translate(locale, 'commands.terms.already_accepted'));
        return;
      }

      // Check if user has ManageGuild permission
      if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply(translate(locale, 'commands.terms.no_permission'));
        return;
      }

      try {
        await setGuildTermsAccepted(guildId, message.author.id);
        const embed = createEmbed({
          title: translate(locale, 'commands.terms.accepted_title'),
          description: translate(locale, 'commands.terms.accepted_description'),
          color: '#00FF00',
        });

        await message.reply({ embeds: [embed] });
        logger.info('Terms accepted', {
          guildId,
          acceptedBy: message.author.id,
          userTag: message.author.tag,
        });
      } catch (error) {
        logger.error('Error accepting terms', { guildId, error });
        await message.reply(translate(locale, 'commands.terms.error'));
      }
      return;
    }

    // Display terms of service
    const accepted = await hasGuildAcceptedTerms(guildId);
    const embed = createEmbed({
      title: translate(locale, 'commands.terms.title'),
      description: translate(locale, 'commands.terms.description'),
      color: accepted ? '#00FF00' : '#FFA500',
    });

    if (accepted) {
      embed.addFields({
        name: translate(locale, 'commands.terms.status'),
        value: translate(locale, 'commands.terms.status_accepted'),
        inline: false,
      });
    } else {
      embed
        .addFields({
          name: translate(locale, 'commands.terms.status'),
          value: translate(locale, 'commands.terms.status_not_accepted'),
          inline: false,
        })
        .addFields({
          name: translate(locale, 'commands.terms.how_to_accept'),
          value: translate(locale, 'commands.terms.accept_instruction', {
            prefix,
          }),
          inline: false,
        });
    }

    embed.addFields({
      name: translate(locale, 'commands.terms.full_terms'),
      value: translate(locale, 'commands.terms.full_terms_link'),
      inline: false,
    });

    // Create button to view terms page
    const viewTermsButton = new ButtonBuilder()
      .setLabel(translate(locale, 'commands.terms.view_button'))
      .setStyle(ButtonStyle.Link)
      .setURL('https://eliitme.github.io/quackmuzik/terms.html');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(viewTermsButton);

    await message.reply({ embeds: [embed], components: [row] });
  },
};
