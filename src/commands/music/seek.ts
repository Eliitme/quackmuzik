import { VoiceChannel } from 'discord.js';
import { Command } from '../../types/Command';
import { formatTime } from '../../utils/formatTime';
import { getGuildLocale, getGuildPrefix } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { logger } from '../../utils/logger';

export const seekCommand: Command = {
  name: 'seek',
  description: 'Seek to a specific position in the song',
  usage: 'seek <time> (e.g., 1:30 or 90s)',
  aliases: ['scrub', 'position'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const prefix = await getGuildPrefix(message.guild?.id || null, 'z!');
    const member = message.member;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
      await message.reply(translate(locale, 'commands.seek.no_voice'));
      return;
    }

    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player || !player.queue.current) {
      await message.reply(translate(locale, 'commands.seek.not_playing'));
      return;
    }

    // Check if user is in the same voice channel
    if (player.voiceChannelId !== voiceChannel.id) {
      await message.reply(translate(locale, 'commands.seek.same_voice_channel'));
      return;
    }

    if (!args.length) {
      await message.reply(translate(locale, 'commands.seek.no_time', { prefix }));
      return;
    }

    const timeString = args[0];
    let targetMs = 0;

    try {
      // Parse time format: hh:mm:ss, mm:ss, or seconds
      if (timeString.includes(':')) {
        const parts = timeString.split(':').map(Number);

        if (parts.some(isNaN)) {
          throw new Error('Invalid time format');
        }

        if (parts.length === 2) {
          // mm:ss
          const [mins, secs] = parts;
          targetMs = (mins * 60 + secs) * 1000;
        } else if (parts.length === 3) {
          // hh:mm:ss
          const [hours, mins, secs] = parts;
          targetMs = (hours * 3600 + mins * 60 + secs) * 1000;
        } else {
          throw new Error('Invalid time format');
        }
      } else {
        // Plain seconds
        const seconds = parseFloat(timeString);
        if (isNaN(seconds)) {
          throw new Error('Invalid time format');
        }
        targetMs = seconds * 1000;
      }

      const currentTrack = player.queue.current;
      const duration = currentTrack.info.duration;

      if (targetMs < 0) {
        await message.reply(translate(locale, 'commands.seek.invalid_negative'));
        return;
      }

      if (targetMs > duration) {
        await message.reply(
          translate(locale, 'commands.seek.out_of_range', {
            duration: formatTime(duration),
          })
        );
        return;
      }

      // Check if track is seekable (some streams might not be)
      if (!currentTrack.info.isSeekable) {
        await message.reply(translate(locale, 'commands.seek.not_seekable'));
        return;
      }

      await player.seek(targetMs);

      await message.reply(
        translate(locale, 'commands.seek.seeked', {
          time: formatTime(targetMs),
          duration: formatTime(duration),
          title: currentTrack.info.title,
        })
      );
    } catch (error) {
      logger.error('Error seeking', { error, guildId: message.guild?.id });
      await message.reply(translate(locale, 'commands.seek.error'));
    }
  },
};
