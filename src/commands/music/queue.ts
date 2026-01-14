import { User } from 'discord.js';
import { Command } from '../../types/Command';
import { formatTime } from '../../utils/formatTime';
import { createEmbedWithCustomFooter } from '../../utils/embed';
import { translate, getTranslations } from '../../utils/i18n';
import { getCommandContext, getAndValidatePlayer } from '../../utils/musicHelpers';

export const queueCommand: Command = {
  name: 'queue',
  description: 'Display list of songs in queue',
  usage: 'queue [page]',
  aliases: ['q', 'list'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const { locale, prefix } = await getCommandContext(message.guild?.id || null);
    const queueT = getTranslations(locale, 'commands.queue');

    const player = await getAndValidatePlayer(
      lavalinkManager,
      message.guild!.id,
      locale,
      'queue',
      message,
      false
    );

    if (!player) {
      return;
    }

    const queue = player.queue;
    const current = queue.current;
    const upcoming = queue.tracks;

    if (!current && upcoming.length === 0) {
      await message.reply(translate(locale, 'commands.queue.empty'));
      return;
    }

    // Pagination - 10 tracks per page
    const pageSize = 10;
    const page = parseInt(args[0]) || 1;
    const totalPages = Math.ceil(upcoming.length / pageSize);
    const actualPage = Math.max(1, Math.min(page, totalPages));

    const start = (actualPage - 1) * pageSize;
    const end = start + pageSize;
    const queuePage = upcoming.slice(start, end);

    // Build queue list
    let queueList = '';

    if (current) {
      queueList += `**${translate(locale, 'commands.queue.now_playing')}**\n`;
      queueList += `[${current.info.title}](${current.info.uri})\n`;
      queueList += `\`${formatTime(player.position)} / ${formatTime(current.info.duration)}\`\n`;
      const requestedBy = translate(locale, 'commands.queue.requested_by');
      const unknown = translate(locale, 'commands.nowplaying.unknown');
      queueList += `${requestedBy} ${current.requester ? `<@${(current.requester as User).id}>` : unknown}\n\n`;
    }

    if (upcoming.length > 0) {
      queueList += `**${translate(locale, 'commands.queue.up_next', { count: upcoming.length })}**\n`;

      queuePage.forEach((track, index) => {
        const position = start + index + 1;
        const title =
          track.info.title.length > 50
            ? track.info.title.substring(0, 47) + '...'
            : track.info.title;
        const duration = track.info.duration || 0;
        queueList += `\`${position}.\` [${title}](${track.info.uri}) - \`${formatTime(duration)}\`\n`;
      });

      if (totalPages > 1) {
        queueList += `\n*${translate(locale, 'commands.queue.page', { current: actualPage, total: totalPages })}*`;
      }
    }

    // Calculate total duration
    const totalDuration = upcoming.reduce((acc, track) => acc + (track.info.duration || 0), 0);
    const currentRemaining = current ? (current.info.duration || 0) - player.position : 0;
    const totalRemaining = totalDuration + currentRemaining;

    const footerText = translate(locale, 'commands.queue.footer', {
      prefix,
      page: actualPage + 1,
    });

    const embed = createEmbedWithCustomFooter(footerText, {
      title: translate(locale, 'commands.queue.title', { guild: message.guild!.name }),
      description: queueList || translate(locale, 'commands.queue.empty_queue'),
    }).addFields(
      {
        name: translate(locale, 'commands.queue.stats'),
        value: `${translate(locale, 'commands.queue.total_tracks', {
          count: upcoming.length + (current ? 1 : 0),
        })}\n${translate(locale, 'commands.queue.time_remaining', {
          time: formatTime(totalRemaining),
        })}`,
        inline: true,
      },
      {
        name: translate(locale, 'commands.queue.volume'),
        value: `${player.volume}%`,
        inline: true,
      },
      {
        name: translate(locale, 'commands.queue.loop'),
        value:
          player.repeatMode === 'queue'
            ? translate(locale, 'commands.queue.loop_queue')
            : player.repeatMode === 'track'
              ? translate(locale, 'commands.queue.loop_track')
              : translate(locale, 'commands.queue.loop_off'),
        inline: true,
      }
    );

    await message.reply({ embeds: [embed] });
  },
};
