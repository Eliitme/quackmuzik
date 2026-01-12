import { Client, User } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { logger } from '../utils/logger';
import {
  savePlayHistory,
  getGuild24_7Mode,
  getGuildAnnounceTrack,
  getGuildLocale,
  getGuildDjRole,
  getGuildDjAudioSettings,
} from '../utils/database';
import { clearVoteSkip } from '../utils/voteSkip';
import { createEmbed } from '../utils/embed';
import { translate, type Locale } from '../utils/i18n';
import { formatTime } from '../utils/formatTime';
import { applyDjAudioFilters } from '../utils/audioFilters';

/**
 * Register all Lavalink event handlers
 */
export function registerLavalinkEvents(client: Client, lavalinkManager: LavalinkManager): void {
  // Player events
  lavalinkManager.on('playerCreate', (player) => {
    logger.info('Player created', { guildId: player.guildId });
  });

  lavalinkManager.on('playerDestroy', (player, reason) => {
    logger.info('Player destroyed', { guildId: player.guildId, reason: reason || 'unknown' });
    // Clear all vote skip data for this guild
    clearVoteSkip(player.guildId);
  });

  lavalinkManager.on('trackStart', async (player, track) => {
    if (track) {
      // Clear all vote skip data for this guild when new track starts
      clearVoteSkip(player.guildId);

      logger.info('Track start', {
        guildId: player.guildId,
        title: track.info.title,
        author: track.info.author,
        durationMs: track.info.duration,
        source: track.info.sourceName,
        queueSize: player.queue.tracks.length,
      });

      // Apply DJ audio filters if requester has DJ role
      try {
        const requesterId =
          typeof track.requester === 'string'
            ? track.requester
            : (track.requester as User)?.id || null;

        if (requesterId) {
          const djRoleId = await getGuildDjRole(player.guildId);
          if (djRoleId) {
            // Check if requester has DJ role (we need to get guild member)
            const guild = client.guilds.cache.get(player.guildId);
            if (guild) {
              const member = await guild.members.fetch(requesterId).catch(() => null);
              if (member && member.roles.cache.has(djRoleId)) {
                const djSettings = await getGuildDjAudioSettings(player.guildId);
                await applyDjAudioFilters(player, djSettings);
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error applying DJ filters on track start', {
          guildId: player.guildId,
          error,
        });
      }

      // Announce track if enabled
      const announceEnabled = await getGuildAnnounceTrack(player.guildId);
      if (announceEnabled && player.textChannelId) {
        const channel = client.channels.cache.get(player.textChannelId);
        if (channel && 'send' in channel) {
          try {
            const locale = (await getGuildLocale(player.guildId)) as Locale;
            const thumbnail =
              track.info.artworkUrl ||
              `https://img.youtube.com/vi/${track.info.identifier}/maxresdefault.jpg`;

            const sourceText = translate(locale, 'commands.nowplaying.unknown');
            const requesterId =
              typeof track.requester === 'string'
                ? track.requester
                : (track.requester as User)?.id || null;

            const embed = createEmbed({
              title: translate(locale, 'commands.announce.now_playing'),
              description: `**[${track.info.title}](${track.info.uri})**`,
              color: '#00FF00',
            })
              .addFields(
                {
                  name: translate(locale, 'commands.nowplaying.author'),
                  value: track.info.author || sourceText,
                  inline: true,
                },
                {
                  name: translate(locale, 'commands.nowplaying.duration'),
                  value: formatTime(track.info.duration),
                  inline: true,
                },
                {
                  name: '\u200B',
                  value: '\u200B',
                  inline: true,
                }
              )
              .setThumbnail(thumbnail);

            if (requesterId) {
              embed.addFields({
                name: translate(locale, 'commands.nowplaying.requested_by'),
                value: `<@${requesterId}>`,
                inline: false,
              });
            }

            if (player.queue.tracks.length > 0) {
              embed.addFields({
                name: translate(locale, 'commands.announce.queue_info'),
                value: translate(locale, 'commands.announce.queue_count', {
                  count: player.queue.tracks.length,
                }),
                inline: false,
              });
            }

            await channel.send({ embeds: [embed] });
          } catch (error) {
            logger.error('Error sending track announcement', {
              guildId: player.guildId,
              error,
            });
          }
        }
      }
    }
  });

  lavalinkManager.on('trackEnd', async (player, track, payload) => {
    logger.info('Track end', {
      guildId: player.guildId,
      title: track?.info?.title || 'Unknown',
      reason: payload?.reason || 'unknown',
      remaining: player.queue.tracks.length,
    });

    // Lưu track vào lịch sử khi track kết thúc (chỉ lưu track đã phát, không phải track trong queue)
    if (track) {
      // Transform track to match savePlayHistory signature
      const trackForHistory = {
        info: track.info,
        requester:
          typeof track.requester === 'string'
            ? track.requester
            : typeof track.requester === 'object' && track.requester && 'id' in track.requester
              ? { id: String(track.requester.id) }
              : undefined,
      };
      await savePlayHistory(player.guildId, trackForHistory).catch((error) => {
        logger.error('Failed to save play history', {
          guildId: player.guildId,
          error,
        });
      });
    }

    // Tự động destroy player khi hết nhạc (trừ khi 24/7 mode được bật)
    if (player.queue.tracks.length === 0) {
      // Check 24/7 mode asynchronously
      getGuild24_7Mode(player.guildId)
        .then((mode247) => {
          if (mode247) {
            logger.info('Queue empty, but 24/7 mode is enabled, keeping player alive', {
              guildId: player.guildId,
            });
          } else {
            logger.info('Queue empty, destroying player', { guildId: player.guildId });
            player.destroy();
          }
        })
        .catch((error) => {
          logger.error('Error checking 24/7 mode when queue empty', {
            guildId: player.guildId,
            error,
          });
          // Default to destroying if error
          player.destroy();
        });
    }
  });

  lavalinkManager.on('trackError', (player, track, error) => {
    const errorMsg = error.exception?.message || 'Unknown error';
    const errorSeverity = error.exception?.severity || 'unknown';

    logger.error('Track error', {
      guildId: player.guildId,
      title: track?.info?.title || 'Unknown',
      uri: track?.info?.uri || 'Unknown',
      error: errorMsg,
      severity: errorSeverity,
    });

    // Notify user in text channel
    const channel = client.channels.cache.get(player.textChannelId || '');
    if (channel && 'send' in channel) {
      channel
        .send(
          `❌ Lỗi khi phát: **${track?.info?.title || 'Unknown'}**\n` +
            `\`${errorMsg}\`\n` +
            `💡 Đang thử track tiếp theo...`
        )
        .catch((e) =>
          logger.error('Send error message failed', { guildId: player.guildId, error: e })
        );
    }

    // Try next track if available
    if (player.queue.tracks.length > 0) {
      logger.info('Skipping to next track after error', {
        guildId: player.guildId,
        remaining: player.queue.tracks.length,
      });
      player.skip();
    } else {
      // Check 24/7 mode asynchronously
      getGuild24_7Mode(player.guildId)
        .then((mode247) => {
          if (mode247) {
            logger.info(
              'No more tracks after error, but 24/7 mode is enabled, keeping player alive',
              {
                guildId: player.guildId,
              }
            );
          } else {
            logger.info('No more tracks after error, destroying player', {
              guildId: player.guildId,
            });
            player.destroy();
          }
        })
        .catch((error) => {
          logger.error('Error checking 24/7 mode after track error', {
            guildId: player.guildId,
            error,
          });
          // Default to destroying if error
          player.destroy();
        });
    }
  });

  lavalinkManager.on('trackStuck', (player, track, payload) => {
    logger.warn('Track stuck', {
      guildId: player.guildId,
      title: track?.info?.title || 'Unknown',
      thresholdMs: payload?.thresholdMs,
    });

    const channel = client.channels.cache.get(player.textChannelId || '');
    if (channel && 'send' in channel) {
      channel
        .send(`⚠️ Track bị stuck: **${track?.info?.title || 'Unknown'}**. Đang skip...`)
        .catch((e) =>
          logger.error('Send stuck message failed', { guildId: player.guildId, error: e })
        );
    }

    player.skip();
  });

  lavalinkManager.on('queueEnd', (player) => {
    logger.info('Queue ended', { guildId: player.guildId });
  });

  lavalinkManager.on('playerUpdate', (player) => {
    // Only log occasionally to avoid spam
    if (player.position % 30000 < 1000) {
      // Log every ~30 seconds
      logger.debug('Player update', {
        guildId: player.guildId,
        positionSec: Math.floor(player.position / 1000),
      });
    }
  });

  // Node manager events
  lavalinkManager.nodeManager.on('error', (node, error) => {
    logger.error('Node error', { nodeId: node.options.id, message: error.message, error });
  });

  lavalinkManager.nodeManager.on('reconnecting', (node) => {
    logger.warn('Node reconnecting', { nodeId: node.options.id });
  });

  lavalinkManager.nodeManager.on('connect', (node) => {
    logger.info('Node connected', {
      nodeId: node.options.id,
      host: node.options.host,
      port: node.options.port,
    });
  });

  lavalinkManager.nodeManager.on('disconnect', (node, reason) => {
    logger.warn('Node disconnected', { nodeId: node.options.id, reason });
  });

  lavalinkManager.nodeManager.on('create', (node) => {
    logger.info('Node created', { nodeId: node.options.id });
  });

  lavalinkManager.nodeManager.on('destroy', (node) => {
    logger.info('Node destroyed', { nodeId: node.options.id });
  });
}
