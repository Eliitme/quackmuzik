import { Client, VoiceState } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { logger } from '../utils/logger';
import {
  createListeningSession,
  getActiveListeningSession,
  endListeningSession,
} from '../utils/database';

/**
 * Register voice state update event handler
 * Tracks when users join/leave voice channels for accurate listening time
 */
export function registerVoiceStateUpdateEvent(
  client: Client,
  lavalinkManager: LavalinkManager
): void {
  client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    // Skip if bot user
    if (newState.member?.user.bot || oldState.member?.user.bot) {
      return;
    }

    const userId = newState.member?.id || oldState.member?.id;
    if (!userId) {
      return;
    }

    const guildId = newState.guild.id;
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // User joined a voice channel
    if (!oldChannelId && newChannelId) {
      try {
        // Check if bot is playing in this channel
        const player = lavalinkManager.getPlayer(guildId);
        if (player && player.voiceChannelId === newChannelId) {
          // Bot is playing, create listening session
          const sessionId = await createListeningSession(userId, guildId, newChannelId);
          if (sessionId > 0) {
            logger.debug('Listening session created', {
              userId,
              guildId,
              voiceChannelId: newChannelId,
              sessionId,
            });
          }
        }
      } catch (error) {
        logger.error('Error creating listening session on voice join', {
          userId,
          guildId,
          voiceChannelId: newChannelId,
          error,
        });
      }
    }

    // User left a voice channel
    if (oldChannelId && !newChannelId) {
      try {
        // Only end session if it was for the channel user just left
        // This ensures we only end sessions when user actually leaves bot's channel
        const activeSessionId = await getActiveListeningSession(userId, guildId, oldChannelId);
        if (activeSessionId) {
          // Verify bot was actually in that channel
          const player = lavalinkManager.getPlayer(guildId);
          if (player && player.voiceChannelId === oldChannelId) {
            await endListeningSession(activeSessionId);
            logger.debug('Listening session ended on voice leave', {
              userId,
              guildId,
              voiceChannelId: oldChannelId,
              sessionId: activeSessionId,
            });
          } else {
            // Bot not in that channel, session shouldn't exist - end it anyway to clean up
            await endListeningSession(activeSessionId);
            logger.debug('Cleaned up orphaned listening session', {
              userId,
              guildId,
              voiceChannelId: oldChannelId,
              sessionId: activeSessionId,
            });
          }
        }
      } catch (error) {
        logger.error('Error ending listening session on voice leave', {
          userId,
          guildId,
          voiceChannelId: oldChannelId,
          error,
        });
      }
    }

    // User moved between channels
    if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
      try {
        const player = lavalinkManager.getPlayer(guildId);

        // End session in old channel (only if bot was there)
        if (player && player.voiceChannelId === oldChannelId) {
          const activeSessionId = await getActiveListeningSession(userId, guildId, oldChannelId);
          if (activeSessionId) {
            await endListeningSession(activeSessionId);
            logger.debug('Listening session ended on channel move', {
              userId,
              guildId,
              oldChannelId,
              sessionId: activeSessionId,
            });
          }
        }

        // Check if bot is playing in new channel
        if (player && player.voiceChannelId === newChannelId) {
          // Bot is playing in new channel, create new session
          const sessionId = await createListeningSession(userId, guildId, newChannelId);
          if (sessionId > 0) {
            logger.debug('Listening session moved to new channel', {
              userId,
              guildId,
              oldChannelId,
              newChannelId,
              sessionId,
            });
          }
        } else {
          // User moved to a channel where bot is not playing
          // End any existing session to clean up
          const activeSessionId = await getActiveListeningSession(userId, guildId);
          if (activeSessionId) {
            await endListeningSession(activeSessionId);
            logger.debug('Ended session - user moved to channel without bot', {
              userId,
              guildId,
              newChannelId,
              sessionId: activeSessionId,
            });
          }
        }
      } catch (error) {
        logger.error('Error handling voice channel move', {
          userId,
          guildId,
          oldChannelId,
          newChannelId,
          error,
        });
      }
    }
  });
}
