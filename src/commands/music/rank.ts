import { Command } from '../../types/Command';
import { getGuildLocale, getUserStats, getUserRank } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { createEmbed } from '../../utils/embed';

export const rankCommand: Command = {
  name: 'rank',
  description: 'View your personal ranking and stats',
  usage: 'rank [user]',
  aliases: ['stats', 'myrank', 'profile'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const guildId = message.guild!.id;

    // Get target user (default: message author)
    let targetUserId = message.author.id;
    if (args.length > 0) {
      const mention = message.mentions.users.first();
      if (mention) {
        targetUserId = mention.id;
      } else {
        // Try to parse as user ID
        const userId = args[0].trim();
        if (userId.match(/^\d+$/)) {
          targetUserId = userId;
        }
      }
    }

    const userStats = await getUserStats(targetUserId, guildId);
    const isSelf = targetUserId === message.author.id;

    if (!userStats || (userStats.total_requests === 0 && userStats.total_listening_minutes === 0)) {
      const embed = createEmbed({
        title: translate(locale, 'commands.rank.title'),
        description: isSelf
          ? translate(locale, 'commands.rank.no_stats_self')
          : translate(locale, 'commands.rank.no_stats_other'),
        color: '#FFA500',
      });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Get ranks
    const requestsRank = await getUserRank(targetUserId, guildId, 'requests');
    const listeningRank = await getUserRank(targetUserId, guildId, 'listening');

    // Format listening time
    const hours = Math.floor(userStats.total_listening_minutes / 60);
    const minutes = userStats.total_listening_minutes % 60;
    const listeningTime =
      hours > 0
        ? `${hours}${translate(locale, 'commands.leaderboard.hours')} ${minutes}${translate(locale, 'commands.leaderboard.minutes')}`
        : `${minutes}${translate(locale, 'commands.leaderboard.minutes')}`;

    const embed = createEmbed({
      title: isSelf
        ? translate(locale, 'commands.rank.your_stats')
        : translate(locale, 'commands.rank.user_stats', { user: `<@${targetUserId}>` }),
      description: translate(locale, 'commands.rank.description'),
      color: '#00FF00',
    }).addFields(
      {
        name: translate(locale, 'commands.rank.dj_rank'),
        value: `#${requestsRank > 0 ? requestsRank : '?'} - **${userStats.total_requests}** ${translate(locale, 'commands.leaderboard.tracks')}`,
        inline: true,
      },
      {
        name: translate(locale, 'commands.rank.listener_rank'),
        value: `#${listeningRank > 0 ? listeningRank : '?'} - **${listeningTime}**`,
        inline: true,
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true,
      },
      {
        name: translate(locale, 'commands.rank.total_votes'),
        value: `**${userStats.total_votes}**`,
        inline: true,
      },
      {
        name: translate(locale, 'commands.rank.total_playlists'),
        value: `**${userStats.total_playlists}**`,
        inline: true,
      },
      {
        name: translate(locale, 'commands.rank.total_likes'),
        value: `**${userStats.total_likes}**`,
        inline: true,
      }
    );

    if (userStats.last_active_at) {
      embed.setFooter({
        text: translate(locale, 'commands.rank.last_active', {
          date: new Date(userStats.last_active_at).toLocaleDateString(
            locale === 'vi' ? 'vi-VN' : 'en-US'
          ),
        }),
      });
    }

    await message.reply({ embeds: [embed] });
  },
};
