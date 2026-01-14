import { Command } from '../../types/Command';
import { translate } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import {
  getCommandContext,
  getAndValidateVoiceChannel,
  getOrCreatePlayer,
  ensurePlayerConnected,
} from '../../utils/musicHelpers';

export const speakCommand: Command = {
  name: 'speak',
  description: 'Play text-to-speech',
  usage: 'speak <text>',
  aliases: ['tts'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const { locale, prefix } = await getCommandContext(message.guild?.id || null);
    const voiceChannel = await getAndValidateVoiceChannel(message.member, locale, 'speak', message);

    if (!voiceChannel) {
      return;
    }

    const text = args.join(' ').trim();
    if (!text) {
      await message.reply(translate(locale, 'commands.speak.no_text', { prefix }));
      return;
    }

    try {
      // Create or get player
      const player = getOrCreatePlayer(
        lavalinkManager,
        message.guild!.id,
        voiceChannel.id,
        message.channel.id
      );

      // If bot is already in a different channel
      if (player.voiceChannelId && player.voiceChannelId !== voiceChannel.id) {
        await message.reply(translate(locale, 'commands.speak.same_voice_channel'));
        return;
      }

      await ensurePlayerConnected(player, message.guild!.id, voiceChannel.id);

      const loadingMsg = await message.reply(translate(locale, 'commands.speak.loading'));

      // Use FloweryTTS integrated in Lavalink: query format "floweryTts:<text>"
      // Voice/speed/translate settings configured in lavalink/application.yml
      const res = await player.search({ query: `floweryTts:${text}` }, message.author);

      if (!res.tracks.length) {
        await loadingMsg.edit(translate(locale, 'commands.speak.not_found'));
        return;
      }

      const track = res.tracks[0];
      await player.queue.add(track);
      if (!player.playing) {
        await player.play();
      }

      const displayText = text.slice(0, 80) + (text.length > 80 ? '...' : '');
      await loadingMsg.edit(
        translate(locale, 'commands.speak.added', {
          text: displayText,
        })
      );
    } catch (error) {
      logger.error('Error in speak command', { error, guildId: message.guild?.id });
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      await message.reply(
        translate(locale, 'commands.speak.error', {
          error: errMsg,
        })
      );
    }
  },
};
