import { User, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { Command } from '../../types/Command';
import { formatTime } from '../../utils/formatTime';
import { createEmbedWithCustomFooter } from '../../utils/embed';
import { getGuildLocale, hasUserLikedTrack, getTrackLikes } from '../../utils/database';
import { translate, getTranslations, type Locale } from '../../utils/i18n';
import { createSimpleSpectrum } from '../../utils/spectrum';
import { logger } from '../../utils/logger';

export const nowPlayingCommand: Command = {
  name: 'nowplaying',
  description: 'Hiển thị bài hát đang phát với progress bar',
  usage: '!nowplaying',
  aliases: ['np', 'current', 'playing'],
  category: 'music',
  guildOnly: true,

  async execute({ message, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const npT = getTranslations(locale, 'commands.nowplaying');

    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player || !player.queue.current) {
      await message.reply(translate(locale, 'commands.nowplaying.not_playing'));
      return;
    }

    const track = player.queue.current;
    const position = player.position; // milliseconds
    const duration = track.info.duration; // milliseconds

    // Create progress bar
    const createProgressBar = (current: number, total: number, length = 12): string => {
      const progress = Math.min(current / total, 1);
      const filledLength = Math.floor(progress * length);
      const emptyLength = length - filledLength;

      const filledBar = '▰'.repeat(filledLength);
      const emptyBar = '▱'.repeat(emptyLength);
      const pointer = '🔘';

      // Position pointer
      if (filledLength === 0) {
        return `${pointer}${emptyBar}`;
      } else if (filledLength === length) {
        return `${filledBar}${pointer}`;
      } else {
        return `${filledBar}${pointer}${emptyBar}`;
      }
    };

    const progressBar = createProgressBar(position, duration);
    const percentage = ((position / duration) * 100).toFixed(1);

    // Create spectrum visualizer
    const spectrum = createSimpleSpectrum(position, duration, player.volume, 15);

    // Get thumbnail
    const thumbnail =
      track.info.artworkUrl ||
      `https://img.youtube.com/vi/${track.info.identifier}/maxresdefault.jpg`;

    const sourceText = translate(locale, 'commands.nowplaying.unknown');
    const source = track.info.sourceName || sourceText;

    const embed = createEmbedWithCustomFooter(
      translate(locale, 'commands.nowplaying.title') + `: ${source}`,
      {
        title: translate(locale, 'commands.nowplaying.title'),
        description: `**[${track.info.title}](${track.info.uri})**`,
      }
    )
      .addFields(
        {
          name: translate(locale, 'commands.nowplaying.author'),
          value: track.info.author || sourceText,
          inline: true,
        },
        {
          name: translate(locale, 'commands.nowplaying.duration'),
          value: formatTime(duration),
          inline: true,
        },
        {
          name: translate(locale, 'commands.nowplaying.volume'),
          value: `${player.volume}%`,
          inline: true,
        },
        {
          name: '\u200B',
          value: `${formatTime(position)} ${progressBar} ${formatTime(duration)}`,
          inline: false,
        },
        {
          name: '🎵',
          value: `\`\`\`\n${spectrum}\n\`\`\``,
          inline: false,
        },
        {
          name: translate(locale, 'commands.nowplaying.progress'),
          value: `${percentage}%`,
          inline: true,
        },
        {
          name: translate(locale, 'commands.nowplaying.requested_by'),
          value: track.requester ? `<@${(track.requester as User).id}>` : sourceText,
          inline: true,
        }
      )
      .setThumbnail(thumbnail);

    // Create control buttons
    const previousButton = new ButtonBuilder()
      .setCustomId('np_previous')
      .setLabel(translate(locale, 'commands.nowplaying.button_previous'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏮');

    const pauseButton = new ButtonBuilder()
      .setCustomId('np_pause')
      .setLabel(
        player.paused
          ? translate(locale, 'commands.nowplaying.button_resume')
          : translate(locale, 'commands.nowplaying.button_pause')
      )
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(player.paused ? '▶️' : '⏸');

    const skipButton = new ButtonBuilder()
      .setCustomId('np_skip')
      .setLabel(translate(locale, 'commands.nowplaying.button_skip'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏭');

    const loopButton = new ButtonBuilder()
      .setCustomId('np_loop')
      .setLabel(
        player.repeatMode === 'queue'
          ? translate(locale, 'commands.nowplaying.button_loop_queue')
          : player.repeatMode === 'track'
            ? translate(locale, 'commands.nowplaying.button_loop_track')
            : translate(locale, 'commands.nowplaying.button_loop')
      )
      .setStyle(player.repeatMode === 'off' ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setEmoji('🔁');

    const shuffleButton = new ButtonBuilder()
      .setCustomId('np_shuffle')
      .setLabel(translate(locale, 'commands.nowplaying.button_shuffle'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔀');

    const stopButton = new ButtonBuilder()
      .setCustomId('np_stop')
      .setLabel(translate(locale, 'commands.nowplaying.button_stop'))
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');

    // Check if user has liked this track
    let isLiked = false;
    let likesCount = 0;
    try {
      const trackUri = track.info.uri;
      const guildId = message.guild!.id;
      const userId = message.author.id;
      isLiked = await hasUserLikedTrack(userId, trackUri, guildId);
      likesCount = await getTrackLikes(trackUri, guildId);
    } catch (error) {
      logger.error('Error getting like status for nowplaying', { error });
      // Continue with default values
    }

    const likeButton = new ButtonBuilder()
      .setCustomId('np_like')
      .setLabel(
        translate(locale, 'commands.nowplaying.button_like', {
          count: likesCount.toString(),
        })
      )
      .setStyle(isLiked ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji(isLiked ? '❤️' : '🤍');

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      previousButton,
      pauseButton,
      skipButton,
      loopButton,
      shuffleButton
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(likeButton, stopButton);

    await message.reply({ embeds: [embed], components: [row1, row2] });
  },
};
