import { Client } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { logger } from '../utils/logger';
import { savePlayHistory } from '../utils/database';

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
  });

  lavalinkManager.on('trackStart', (player, track) => {
    if (track) {
      logger.info('Track start', {
        guildId: player.guildId,
        title: track.info.title,
        author: track.info.author,
        durationMs: track.info.duration,
        source: track.info.sourceName,
        queueSize: player.queue.tracks.length,
      });
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
      await savePlayHistory(player.guildId, track).catch((error) => {
        logger.error('Failed to save play history', {
          guildId: player.guildId,
          error,
        });
      });
    }

    // Tự động destroy player khi hết nhạc (không lưu playlist)
    if (player.queue.tracks.length === 0) {
      logger.info('Queue empty, destroying player', { guildId: player.guildId });
      player.destroy();
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
      logger.info('No more tracks after error, destroying player', { guildId: player.guildId });
      player.destroy();
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
