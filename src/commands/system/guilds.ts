import { Command } from '../../types/Command';
import { createEmbed } from '../../utils/embed';
import { getGuildLocale } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { logger } from '../../utils/logger';

/**
 * GUILDS COMMAND - System command
 * Hiển thị thông tin về số guild bot đang ở
 * Chỉ bot owner mới có thể sử dụng
 */
export const guildsCommand: Command = {
  name: 'guilds',
  description: 'Hiển thị thông tin về số guild bot đang ở',
  usage: 'guilds',
  aliases: ['servers', 'guildinfo'],
  category: 'system',
  guildOnly: false, // Có thể dùng trong DM

  async execute({ message }) {
    try {
      const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;

      const client = message.client;
      const guilds = client.guilds.cache;

      // Tính toán thống kê
      const totalGuilds = guilds.size;
      const totalMembers = guilds.reduce((acc, guild) => acc + guild.memberCount, 0);
      const totalChannels = guilds.reduce((acc, guild) => acc + guild.channels.cache.size, 0);
      const totalVoiceChannels = guilds.reduce(
        (acc, guild) => acc + guild.channels.cache.filter((ch) => ch.isVoiceBased()).size,
        0
      );

      // Lấy danh sách guilds (giới hạn 10 guilds đầu tiên để hiển thị)
      const guildsList = Array.from(guilds.values())
        .slice(0, 10)
        .map((guild, index) => {
          const memberCount = guild.memberCount;
          const channelCount = guild.channels.cache.size;
          return `${index + 1}. **${guild.name}**\n   👥 ${memberCount} ${translate(locale, 'commands.guilds.members')} | 📝 ${channelCount} ${translate(locale, 'commands.guilds.channels')}`;
        })
        .join('\n\n');

      const hasMore = totalGuilds > 10;

      // Tạo embed
      const embed = createEmbed({
        title: translate(locale, 'commands.guilds.title'),
        description: translate(locale, 'commands.guilds.description_full'),
        color: '#5865F2',
      })
        .addFields(
          {
            name: translate(locale, 'commands.guilds.stats'),
            value: translate(locale, 'commands.guilds.stats_value', {
              totalGuilds,
              totalMembers,
              totalChannels,
              totalVoiceChannels,
            }),
            inline: false,
          },
          {
            name: translate(locale, 'commands.guilds.guilds_list'),
            value: guildsList || translate(locale, 'commands.guilds.no_guilds'),
            inline: false,
          }
        )
        .setFooter({
          text: hasMore
            ? translate(locale, 'commands.guilds.footer_more', {
                shown: 10,
                total: totalGuilds,
              })
            : translate(locale, 'commands.guilds.footer', { total: totalGuilds }),
        });

      await message.reply({ embeds: [embed] });

      logger.info('Guilds command executed', {
        userId: message.author.id,
        totalGuilds,
        totalMembers,
      });
    } catch (error) {
      const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
      logger.error('Error in guilds command', {
        error,
        userId: message.author.id,
      });

      await message.reply(translate(locale, 'commands.guilds.error'));
    }
  },
};
