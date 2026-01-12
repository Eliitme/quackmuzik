import { Command } from '../../types/Command';
import {
  getGuildLocale,
  getTopRequesters,
  getTopListeners,
  getTopTracks,
} from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { createEmbed } from '../../utils/embed';
import { formatTime } from '../../utils/formatTime';

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  description: 'View server leaderboards',
  usage: 'leaderboard [type] [period]',
  aliases: ['lb', 'top', 'rankings'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const guildId = message.guild!.id;

    const type = args[0]?.toLowerCase() || 'dj';
    const period = args[1]?.toLowerCase() as 'week' | 'month' | 'all' | undefined;

    // Validate period
    const validPeriod = period && ['week', 'month', 'all'].includes(period) ? period : 'all';

    let embed;
    let title = '';
    let description = '';

    switch (type) {
      case 'dj':
      case 'requesters':
      case 'requests': {
        const periodText =
          validPeriod === 'week'
            ? translate(locale, 'commands.leaderboard.period_week')
            : validPeriod === 'month'
              ? translate(locale, 'commands.leaderboard.period_month')
              : translate(locale, 'commands.leaderboard.period_all');
        title = translate(locale, 'commands.leaderboard.dj_title', { period: periodText });
        description = translate(locale, 'commands.leaderboard.dj_description');

        const topRequesters = await getTopRequesters(guildId, 10, validPeriod);

        if (topRequesters.length === 0) {
          embed = createEmbed({
            title,
            description: translate(locale, 'commands.leaderboard.no_data'),
            color: '#FFA500',
          });
        } else {
          let leaderboardText = '';
          const medals = ['🥇', '🥈', '🥉'];
          const top3 = topRequesters.slice(0, 3);

          top3.forEach((user, index) => {
            leaderboardText += `${medals[index]} <@${user.user_id}> - **${user.total_requests}** ${translate(locale, 'commands.leaderboard.tracks')}\n`;
          });

          if (topRequesters.length > 3) {
            topRequesters.slice(3, 10).forEach((user, index) => {
              leaderboardText += `\`${index + 4}.\` <@${user.user_id}> - **${user.total_requests}** ${translate(locale, 'commands.leaderboard.tracks')}\n`;
            });
          }

          embed = createEmbed({
            title,
            description: description + '\n\n' + leaderboardText,
            color: '#FFD700',
          });
        }
        break;
      }

      case 'listeners':
      case 'listening': {
        const periodText =
          validPeriod === 'week'
            ? translate(locale, 'commands.leaderboard.period_week')
            : validPeriod === 'month'
              ? translate(locale, 'commands.leaderboard.period_month')
              : translate(locale, 'commands.leaderboard.period_all');
        title = translate(locale, 'commands.leaderboard.listeners_title', { period: periodText });
        description = translate(locale, 'commands.leaderboard.listeners_description');

        const topListeners = await getTopListeners(guildId, 10, validPeriod);

        if (topListeners.length === 0) {
          embed = createEmbed({
            title,
            description: translate(locale, 'commands.leaderboard.no_data'),
            color: '#FFA500',
          });
        } else {
          let leaderboardText = '';
          const medals = ['🥇', '🥈', '🥉'];
          const top3 = topListeners.slice(0, 3);

          top3.forEach((user, index) => {
            const hours = Math.floor(user.total_listening_minutes / 60);
            const minutes = user.total_listening_minutes % 60;
            const timeText =
              hours > 0
                ? `${hours}${translate(locale, 'commands.leaderboard.hours')} ${minutes}${translate(locale, 'commands.leaderboard.minutes')}`
                : `${minutes}${translate(locale, 'commands.leaderboard.minutes')}`;
            leaderboardText += `${medals[index]} <@${user.user_id}> - **${timeText}**\n`;
          });

          if (topListeners.length > 3) {
            topListeners.slice(3, 10).forEach((user, index) => {
              const hours = Math.floor(user.total_listening_minutes / 60);
              const minutes = user.total_listening_minutes % 60;
              const timeText =
                hours > 0
                  ? `${hours}${translate(locale, 'commands.leaderboard.hours')} ${minutes}${translate(locale, 'commands.leaderboard.minutes')}`
                  : `${minutes}${translate(locale, 'commands.leaderboard.minutes')}`;
              leaderboardText += `\`${index + 4}.\` <@${user.user_id}> - **${timeText}**\n`;
            });
          }

          embed = createEmbed({
            title,
            description: description + '\n\n' + leaderboardText,
            color: '#00BFFF',
          });
        }
        break;
      }

      case 'tracks':
      case 'hits':
      case 'songs': {
        const periodText =
          validPeriod === 'week'
            ? translate(locale, 'commands.leaderboard.period_week')
            : validPeriod === 'month'
              ? translate(locale, 'commands.leaderboard.period_month')
              : translate(locale, 'commands.leaderboard.period_all');
        title = translate(locale, 'commands.leaderboard.tracks_title', { period: periodText });
        description = translate(locale, 'commands.leaderboard.tracks_description');

        const topTracks = await getTopTracks(guildId, 10, validPeriod);

        if (topTracks.length === 0) {
          embed = createEmbed({
            title,
            description: translate(locale, 'commands.leaderboard.no_data'),
            color: '#FFA500',
          });
        } else {
          let leaderboardText = '';
          const medals = ['🥇', '🥈', '🥉'];
          const top3 = topTracks.slice(0, 3);

          top3.forEach((track, index) => {
            leaderboardText += `${medals[index]} **${track.track_title}**\n`;
            if (track.track_author) {
              leaderboardText += `   ${translate(locale, 'commands.leaderboard.by')} ${track.track_author}\n`;
            }
            leaderboardText += `   ${translate(locale, 'commands.leaderboard.played')} **${track.play_count}** ${translate(locale, 'commands.leaderboard.times')}\n\n`;
          });

          if (topTracks.length > 3) {
            topTracks.slice(3, 10).forEach((track, index) => {
              leaderboardText += `\`${index + 4}.\` **${track.track_title}** - **${track.play_count}** ${translate(locale, 'commands.leaderboard.times')}\n`;
            });
          }

          embed = createEmbed({
            title,
            description: description + '\n\n' + leaderboardText,
            color: '#FF69B4',
          });
        }
        break;
      }

      default: {
        embed = createEmbed({
          title: translate(locale, 'commands.leaderboard.title'),
          description: translate(locale, 'commands.leaderboard.help'),
          color: '#9B59B6',
        });
        break;
      }
    }

    await message.reply({ embeds: [embed] });
  },
};
