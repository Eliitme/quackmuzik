import { Command } from '../../types/Command';
import { likeTrack, unlikeTrack, hasUserLikedTrack, getTrackLikes } from '../../utils/database';
import { translate } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { getCommandContext, validateMusicCommand } from '../../utils/musicHelpers';

export const likeCommand: Command = {
  name: 'like',
  description: 'Like or unlike the currently playing track',
  usage: 'like',
  aliases: ['fav', 'favorite', 'heart'],
  category: 'music',
  guildOnly: true,

  async execute({ message, lavalinkManager }) {
    const { locale } = await getCommandContext(message.guild?.id || null);
    const validation = await validateMusicCommand(
      message.member,
      lavalinkManager,
      message.guild!.id,
      locale,
      'like',
      message,
      true
    );

    if (!validation) {
      return;
    }

    const { player } = validation;

    const currentTrack = player.queue.current!; // Already validated with requireCurrent: true
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
