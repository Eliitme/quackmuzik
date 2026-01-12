import { Client } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { logger } from '../utils/logger';
import { initDatabase, ensureSchema } from '../utils/database';
import { validateEnvironment } from '../utils/env';

/**
 * Bot ready event handler
 * Initializes database and Lavalink connection
 */
export function registerReadyEvent(client: Client, lavalinkManager: LavalinkManager): void {
  client.once('clientReady', async () => {
    logger.info('Bot ready', { userTag: client.user?.tag });

    // Validate environment variables
    try {
      validateEnvironment();
    } catch (error) {
      logger.error('Environment validation failed', { error });
      // Don't throw - allow bot to start but log the error
    }

    // Initialize database
    try {
      initDatabase();
      await ensureSchema();
      logger.info('Database initialized');
    } catch (error) {
      logger.error('Lỗi khi khởi tạo database', { error });
    }

    if (client.user) {
      try {
        await lavalinkManager.init({
          id: client.user.id,
          username: 'QuackMuzik', // Dùng ASCII thay vì client.user.username để tránh lỗi Unicode
        });
        logger.info('Lavalink connected');
      } catch (error) {
        logger.error('Lỗi khi kết nối Lavalink', { error });
      }
    }
  });
}
