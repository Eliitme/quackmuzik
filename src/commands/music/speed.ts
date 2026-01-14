import { Command } from '../../types/Command';
import { translate } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { setGuildSpeed, getGuildSpeed, clearGuildSpeed } from '../../utils/speedSession';
import { applySpeedFilter, getCurrentSpeed } from '../../utils/audioFilters';
import { getCommandContext, validateMusicCommand } from '../../utils/musicHelpers';

export const speedCommand: Command = {
  name: 'speed',
  description: 'Adjust playback speed for the current track',
  usage: 'speed <0.25-2.0|reset>',
  aliases: ['tempo', 'rate'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const { locale, prefix } = await getCommandContext(message.guild?.id || null);
    const validation = await validateMusicCommand(
      message.member,
      lavalinkManager,
      message.guild!.id,
      locale,
      'speed',
      message,
      true
    );

    if (!validation) {
      return;
    }

    const { player } = validation;

    try {
      // If no args, show current speed
      if (!args.length) {
        // Check session speed setting first, then current filters
        const sessionSpeed = getGuildSpeed(message.guild!.id);
        const currentSpeed = sessionSpeed ?? getCurrentSpeed(player);

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

        // Remove speed filter
        const success = await applySpeedFilter(player, null);
        if (!success) {
          await message.reply(translate(locale, 'commands.speed.filters_not_supported'));
          return;
        }

        await message.reply(
          translate(locale, 'commands.speed.reset', {
            title: player.queue.current!.info.title, // Already validated with requireCurrent: true
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

      // Apply speed filter
      const success = await applySpeedFilter(player, speed);
      if (!success) {
        await message.reply(translate(locale, 'commands.speed.filters_not_supported'));
        return;
      }

      logger.info('Speed adjusted for session', {
        guildId: message.guild!.id,
        userId: message.author.id,
        speed,
        track: player.queue.current!.info.title, // Already validated with requireCurrent: true
      });

      await message.reply(
        translate(locale, 'commands.speed.set', {
          speed: (speed * 100).toFixed(0),
          speedValue: speed.toFixed(2),
          title: player.queue.current!.info.title, // Already validated with requireCurrent: true
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
