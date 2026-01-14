import { VoiceChannel } from 'discord.js';
import { Command } from '../../types/Command';
import { getGuildLocale, getGuildPrefix } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { setGuildSpeed, getGuildSpeed, clearGuildSpeed } from '../../utils/speedSession';

export const speedCommand: Command = {
  name: 'speed',
  description: 'Adjust playback speed for the current track',
  usage: 'speed <0.25-2.0|reset>',
  aliases: ['tempo', 'rate'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const prefix = await getGuildPrefix(message.guild?.id || null, 'z!');
    const member = message.member;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
      await message.reply(translate(locale, 'commands.speed.no_voice'));
      return;
    }

    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player || !player.queue.current) {
      await message.reply(translate(locale, 'commands.speed.not_playing'));
      return;
    }

    // Check if user is in the same voice channel
    if (player.voiceChannelId !== voiceChannel.id) {
      await message.reply(translate(locale, 'commands.speed.same_voice_channel'));
      return;
    }

    // Check if player has filters API
    const playerWithFilters = player as any;
    if (!playerWithFilters.filters) {
      await message.reply(translate(locale, 'commands.speed.filters_not_supported'));
      return;
    }

    try {
      // If no args, show current speed
      if (!args.length) {
        // Check session speed setting first, then current filters
        const sessionSpeed = getGuildSpeed(message.guild!.id);
        const currentFilters = (playerWithFilters.filters as any)?.data || {};
        const currentSpeed = sessionSpeed ?? currentFilters.timescale?.speed ?? 1.0;

        const embed = createEmbed({
          title: translate(locale, 'commands.speed.current_title'),
          description: translate(locale, 'commands.speed.current_description', {
            speed: (currentSpeed * 100).toFixed(0),
            speedValue: currentSpeed.toFixed(2),
          }),
          color: '#00FF00',
        });

        embed.addFields({
          name: translate(locale, 'commands.speed.how_to_use'),
          value: translate(locale, 'commands.speed.usage_examples', { prefix }),
        });

        if (sessionSpeed !== null) {
          embed.addFields({
            name: '💡 Session Setting',
            value: translate(locale, 'commands.speed.session_active'),
            inline: false,
          });
        }

        await message.reply({ embeds: [embed] });
        return;
      }

      const speedArg = args[0].toLowerCase();

      // Handle reset
      if (speedArg === 'reset' || speedArg === '1' || speedArg === '1.0') {
        // Clear session speed setting
        clearGuildSpeed(message.guild!.id);

        // Get current filters
        const currentFilters = (playerWithFilters.filters as any)?.data || {};

        // Remove timescale if it exists, or set to default
        if (currentFilters.timescale) {
          delete currentFilters.timescale;

          // If no other filters, reset all
          if (Object.keys(currentFilters).length === 0) {
            await playerWithFilters.filters.reset();
          } else {
            // Keep other filters, just remove timescale
            await playerWithFilters.filters.set(currentFilters);
          }
        }

        await message.reply(
          translate(locale, 'commands.speed.reset', {
            title: player.queue.current.info.title,
          })
        );
        return;
      }

      // Parse speed value
      const speed = parseFloat(speedArg);

      if (isNaN(speed)) {
        await message.reply(translate(locale, 'commands.speed.invalid_value', { prefix }));
        return;
      }

      // Validate speed range (0.25 to 2.0)
      if (speed < 0.25 || speed > 2.0) {
        await message.reply(translate(locale, 'commands.speed.out_of_range'));
        return;
      }

      // Save speed setting for session
      setGuildSpeed(message.guild!.id, speed);

      // Get current filters to preserve other filters
      const currentFilters = (playerWithFilters.filters as any)?.data || {};

      // Apply timescale filter with new speed
      currentFilters.timescale = {
        speed: speed,
        pitch: 1.0, // Keep pitch at normal
        rate: 1.0, // Keep rate at normal
      };

      await playerWithFilters.filters.set(currentFilters);

      logger.info('Speed adjusted for session', {
        guildId: message.guild!.id,
        userId: message.author.id,
        speed,
        track: player.queue.current.info.title,
      });

      await message.reply(
        translate(locale, 'commands.speed.set', {
          speed: (speed * 100).toFixed(0),
          speedValue: speed.toFixed(2),
          title: player.queue.current.info.title,
        })
      );
    } catch (error) {
      logger.error('Error adjusting speed', {
        error,
        guildId: message.guild?.id,
        userId: message.author.id,
      });
      await message.reply(translate(locale, 'commands.speed.error'));
    }
  },
};
