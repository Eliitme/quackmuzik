import { Command } from '../../types/Command';
import { translate } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { getCommandContext, validateMusicCommand } from '../../utils/musicHelpers';

export const jumpCommand: Command = {
  name: 'jump',
  description: 'Jump to a specific song in queue',
  usage: 'jump <position>',
  aliases: ['j', 'skipto'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const { locale, prefix } = await getCommandContext(message.guild?.id || null);
    const validation = await validateMusicCommand(
      message.member,
      lavalinkManager,
      message.guild!.id,
      locale,
      'jump',
      message,
      false
    );

    if (!validation) {
      return;
    }

    const { player } = validation;

    if (!args.length) {
      await message.reply(translate(locale, 'commands.jump.no_position', { prefix }));
      return;
    }

    const position = parseInt(args[0]);
    const queueLength = player.queue.tracks.length;

    if (isNaN(position) || position < 1) {
      await message.reply(translate(locale, 'commands.jump.invalid_number'));
      return;
    }

    if (position > queueLength) {
      await message.reply(
        translate(locale, 'commands.jump.out_of_range', {
          count: queueLength,
        })
      );
      return;
    }

    try {
      // Get the target track before removing
      const targetTrack = player.queue.tracks[position - 1];

      // Remove tracks before the target position
      // Skip to position means removing (position - 1) tracks
      for (let i = 0; i < position - 1; i++) {
        player.queue.tracks.shift();
      }

      // Skip current track to start the target track
      await player.skip();

      await message.reply(
        translate(locale, 'commands.jump.jumped', {
          position,
          title: targetTrack.info.title,
        })
      );
    } catch (error) {
      logger.error('Error jumping to track', { error, guildId: message.guild?.id });
      await message.reply(translate(locale, 'commands.jump.error'));
    }
  },
};
