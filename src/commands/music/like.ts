import { VoiceChannel } from 'discord.js';
import { Command } from '../../types/Command';
import {
  getGuildLocale,
  likeTrack,
  unlikeTrack,
  hasUserLikedTrack,
  getTrackLikes,
} from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';

export const likeCommand: Command = {
  name: 'like',
  description: 'Like or unlike the currently playing track',
  usage: 'like',
  aliases: ['fav', 'favorite', 'heart'],
  category: 'music',
  guildOnly: true,

  async execute({ message, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const member = message.member;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
      await message.reply(translate(locale, 'commands.like.no_voice'));
      return;
    }

    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player || !player.queue.current) {
      await message.reply(translate(locale, 'commands.like.not_playing'));
      return;
    }

    // Check if user is in the same voice channel
    if (player.voiceChannelId !== voiceChannel.id) {
      await message.reply(translate(locale, 'commands.like.same_voice_channel'));
      return;
    }

    const currentTrack = player.queue.current;
    const trackUri = currentTrack.info.uri;
    const trackIdentifier = currentTrack.info.identifier || null;
    const guildId = message.guild!.id;
    const userId = message.author.id;

    try {
      // Check if already liked
      const alreadyLiked = await hasUserLikedTrack(userId, trackUri, guildId);

      if (alreadyLiked) {
        // Unlike
        const success = await unlikeTrack(userId, trackUri, guildId);
        if (success) {
          const likes = await getTrackLikes(trackUri, guildId);
          const embed = createEmbed({
            title: translate(locale, 'commands.like.unliked_title'),
            description: translate(locale, 'commands.like.unliked_description', {
              title: currentTrack.info.title,
              likes: likes.toString(),
            }),
            color: '#FF6B6B',
          });
          await message.reply({ embeds: [embed] });
        } else {
          await message.reply(translate(locale, 'commands.like.error'));
        }
      } else {
        // Like
        const success = await likeTrack(
          userId,
          trackUri,
          trackIdentifier,
          guildId,
          currentTrack.info.title,
          currentTrack.info.author || null
        );
        if (success) {
          const likes = await getTrackLikes(trackUri, guildId);
          const embed = createEmbed({
            title: translate(locale, 'commands.like.liked_title'),
            description: translate(locale, 'commands.like.liked_description', {
              title: currentTrack.info.title,
              likes: likes.toString(),
            }),
            color: '#FF69B4',
          });
          await message.reply({ embeds: [embed] });
        } else {
          await message.reply(translate(locale, 'commands.like.error'));
        }
      }
    } catch (error) {
      logger.error('Error in like command', { error, guildId, userId });
      await message.reply(translate(locale, 'commands.like.error'));
    }
  },
};
