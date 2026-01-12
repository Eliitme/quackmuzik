import { VoiceChannel } from 'discord.js';
import { Command } from '../../types/Command';
import { getGuildLocale, getGuildPrefix } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { logger } from '../../utils/logger';

export const jumpCommand: Command = {
  name: 'jump',
  description: 'Jump to a specific song in queue',
  usage: 'jump <position>',
  aliases: ['j', 'skipto'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const prefix = await getGuildPrefix(message.guild?.id || null, 'z!');
    const member = message.member;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
      await message.reply(translate(locale, 'commands.jump.no_voice'));
      return;
    }

    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player) {
      await message.reply(translate(locale, 'commands.jump.no_queue'));
      return;
    }

    // Check if user is in the same voice channel
    if (player.voiceChannelId !== voiceChannel.id) {
      await message.reply(translate(locale, 'commands.jump.same_voice_channel'));
      return;
    }

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
