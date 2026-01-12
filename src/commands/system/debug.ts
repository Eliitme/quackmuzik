import { Command } from '../../types/Command';
import { formatTime } from '../../utils/formatTime';
import { createEmbedWithCustomFooter } from '../../utils/embed';
import { getGuildLocale } from '../../utils/database';
import { translate, getTranslations, type Locale } from '../../utils/i18n';

/**
 * DEBUG COMMAND - Tùy chọn
 * Command này giúp debug player state
 * Chỉ dùng khi cần debug, có thể xóa sau khi production
 */
export const debugCommand: Command = {
  name: 'debug',
  description: '[DEBUG] Hiển thị thông tin chi tiết về player state',
  usage: '!debug',
  aliases: ['d', 'info'],
  category: 'system',
  guildOnly: true,

  async execute({ message, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const debugT = getTranslations(locale, 'commands.debug');

    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player) {
      await message.reply(translate(locale, 'commands.debug.no_player'));
      return;
    }

    // Collect player info
    const debugInfo = {
      connected: player.connected,
      playing: player.playing,
      paused: player.paused,
      volume: player.volume,
      position: formatTime(player.position),
      positionMs: player.position,
      repeatMode: player.repeatMode,
      voiceChannelId: player.voiceChannelId,
      textChannelId: player.textChannelId,
      ping: player.ping,
    };

    // Queue info
    const queueInfo = {
      tracksCount: player.queue.tracks.length,
      totalTracks: player.queue.tracks.length + (player.queue.current ? 1 : 0),
      current: player.queue.current
        ? {
            title: player.queue.current.info.title,
            author: player.queue.current.info.author,
            duration: formatTime(player.queue.current.info.duration || 0),
            sourceName: player.queue.current.info.sourceName,
            uri: player.queue.current.info.uri,
          }
        : null,
      upcoming: player.queue.tracks.slice(0, 5).map((t, i) => ({
        position: i + 1,
        title: t.info.title.length > 40 ? t.info.title.substring(0, 37) + '...' : t.info.title,
        duration: formatTime(t.info.duration || 0),
      })),
    };

    // Node info
    const node = player.node;
    const nodeInfo = {
      id: node.options.id,
      host: `${node.options.host}:${node.options.port}`,
      connected: node.connected,
      stats: node.stats
        ? {
            players: node.stats.players,
            playingPlayers: node.stats.playingPlayers,
            uptime: formatTime(node.stats.uptime || 0),
            memory: `${Math.round((node.stats.memory?.used || 0) / 1024 / 1024)}MB / ${Math.round((node.stats.memory?.reservable || 0) / 1024 / 1024)}MB`,
            cpu: `${((node.stats.cpu?.systemLoad || 0) * 100).toFixed(1)}%`,
          }
        : null,
    };

    const embed = createEmbedWithCustomFooter(translate(locale, 'commands.debug.footer'), {
      title: translate(locale, 'commands.debug.title'),
      description: translate(locale, 'commands.debug.description_full'),
      color: '#FF6B6B',
    }).addFields(
      {
        name: translate(locale, 'commands.debug.player_state'),
        value: `\`\`\`json\n${JSON.stringify(debugInfo, null, 2)}\n\`\`\``,
        inline: false,
      },
      {
        name: translate(locale, 'commands.debug.queue_info'),
        value: `\`\`\`json\n${JSON.stringify(queueInfo, null, 2)}\n\`\`\``,
        inline: false,
      },
      {
        name: translate(locale, 'commands.debug.node_info'),
        value: `\`\`\`json\n${JSON.stringify(nodeInfo, null, 2)}\n\`\`\``,
        inline: false,
      }
    );

    await message.reply({ embeds: [embed] });

    // Also log to console for easier debugging
    console.log('[DEBUG] Player state requested by', message.author.tag);
    console.log('[DEBUG] Player info:', debugInfo);
    console.log('[DEBUG] Queue info:', queueInfo);
    console.log('[DEBUG] Node info:', nodeInfo);
  },
};
