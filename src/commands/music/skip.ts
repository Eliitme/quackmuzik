import { VoiceChannel } from 'discord.js';
import { Command } from '../../types/Command';
import { getGuildLocale } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { logger } from '../../utils/logger';

export const skipCommand: Command = {
  name: 'skip',
  description: 'Skip current song',
  usage: 'skip',
  aliases: ['s', 'next'],
  category: 'music',
  guildOnly: true,

  async execute({ message, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const member = message.member;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
      await message.reply(translate(locale, 'commands.skip.no_voice'));
      return;
    }

    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player || !player.queue.current) {
      await message.reply(translate(locale, 'commands.skip.not_playing'));
      return;
    }

    // Check if user is in the same voice channel
    if (player.voiceChannelId !== voiceChannel.id) {
      await message.reply(translate(locale, 'commands.skip.same_voice_channel'));
      return;
    }

    const currentTrack = player.queue.current;
    const hasNext = player.queue.tracks.length > 0;

    try {
      if (!hasNext) {
        // If this is the last track, destroy player instead of skipping
        await player.destroy();
        await message.reply(
          translate(locale, 'commands.skip.skipped_last', {
            title: currentTrack.info.title,
          })
        );
        return;
      }

      await player.skip();

      await message.reply(
        translate(locale, 'commands.skip.skipped', {
          title: currentTrack.info.title,
        })
      );
    } catch (error) {
      logger.error('Error skipping track', { error, guildId: message.guild?.id });
      await message.reply(translate(locale, 'commands.skip.error'));
    }
  },
};
