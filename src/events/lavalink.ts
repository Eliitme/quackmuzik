import { Client, User } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { logger } from '../utils/logger';
import {
  savePlayHistory,
  getGuild24_7Mode,
  getGuildAutoplay,
  getGuildAnnounceTrack,
  getGuildLocale,
  getGuildDjRole,
  getGuildDjAudioSettings,
  incrementTrackPlayCount,
  createListeningSession,
  getActiveListeningSession,
  updateListeningSessionWithTrack,
  endAllActiveSessionsInChannel,
} from '../utils/database';
import { clearVoteSkip } from '../utils/voteSkip';
import { createEmbed } from '../utils/embed';
import { translate, type Locale } from '../utils/i18n';
import { formatTime } from '../utils/formatTime';
import {
  applyDjAudioFilters,
  playerSupportsFilters,
  applySpeedFilter,
} from '../utils/audioFilters';
import { triggerAutoplay } from '../utils/autoplay';
import { getGuildSpeed, onPlayerDestroy } from '../utils/speedSession';

// Track retry count for each guild (guildId -> retryCount)
const trackRetryCount = new Map<string, number>();

/**
 * Register all Lavalink event handlers
 */
export function registerLavalinkEvents(client: Client, lavalinkManager: LavalinkManager): void {
  // Player events
  lavalinkManager.on('playerCreate', (player) => {
    logger.info('Player created', { guildId: player.guildId });
  });

  lavalinkManager.on('playerDestroy', async (player, reason) => {
    logger.info('Player destroyed', { guildId: player.guildId, reason: reason || 'unknown' });
    // Clear all vote skip data for this guild
    clearVoteSkip(player.guildId);

    // Clear speed session setting
    onPlayerDestroy(player.guildId);

    // End all active listening sessions in the voice channel
    if (player.voiceChannelId) {
      try {
        await endAllActiveSessionsInChannel(player.guildId, player.voiceChannelId);
        logger.debug('Ended all active listening sessions on player destroy', {
          guildId: player.guildId,
          voiceChannelId: player.voiceChannelId,
        });
      } catch (error) {
        logger.error('Error ending active listening sessions on player destroy', {
          guildId: player.guildId,
          voiceChannelId: player.voiceChannelId,
          error,
        });
      }
    }
  });

  lavalinkManager.on('trackStart', async (player, track) => {
    if (track) {
      // Reset retry count when track starts successfully
      trackRetryCount.set(player.guildId, 0);

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

      // Apply speed setting for session if set
      // This should be applied after DJ filters so it can override them
      try {
        const sessionSpeed = getGuildSpeed(player.guildId);
        if (sessionSpeed !== null) {
          await applySpeedFilter(player, sessionSpeed);
          logger.info('Applied session speed on track start', {
            guildId: player.guildId,
            speed: sessionSpeed,
            title: track.info.title,
          });
        }
      } catch (error) {
        logger.error('Error applying session speed on track start', {
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

      // Create listening sessions for all users in voice channel when track starts
      try {
        const guild = client.guilds.cache.get(player.guildId);
        if (guild && player.voiceChannelId) {
          const voiceChannel = guild.channels.cache.get(player.voiceChannelId);
          if (voiceChannel && 'members' in voiceChannel) {
            const members = (voiceChannel as any).members;

            // Create or ensure listening session exists for all non-bot members
            // CRITICAL: Only create sessions for users in the SAME channel as bot
            for (const member of members.values()) {
              if (!member.user.bot) {
                // Verify user is actually in bot's voice channel
                if (member.voice.channel?.id !== player.voiceChannelId) {
                  logger.debug('Skipping user on track start - not in bot channel', {
                    userId: member.id,
                    guildId: player.guildId,
                    userChannelId: member.voice.channel?.id,
                    botChannelId: player.voiceChannelId,
                  });
                  continue;
                }

                try {
                  // Check if user already has an active session in this channel
                  const activeSessionId = await getActiveListeningSession(
                    member.id,
                    player.guildId,
                    player.voiceChannelId
                  );

                  if (!activeSessionId) {
                    // Create new session if none exists for this channel
                    const sessionId = await createListeningSession(
                      member.id,
                      player.guildId,
                      player.voiceChannelId
                    );
                    if (sessionId > 0) {
                      logger.debug('Listening session created on track start', {
                        userId: member.id,
                        guildId: player.guildId,
                        voiceChannelId: player.voiceChannelId,
                        sessionId,
                      });
                    }
                  } else {
                    logger.debug('User already has active session on track start', {
                      userId: member.id,
                      guildId: player.guildId,
                      voiceChannelId: player.voiceChannelId,
                      sessionId: activeSessionId,
                    });
                  }
                } catch (error) {
                  logger.error('Error creating listening session on track start', {
                    userId: member.id,
                    guildId: player.guildId,
                    voiceChannelId: player.voiceChannelId,
                    error,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error tracking listening sessions on track start', {
          guildId: player.guildId,
          error,
        });
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

      // Track play count
      await incrementTrackPlayCount(
        track.info.uri,
        track.info.identifier || null,
        track.info.title,
        track.info.author || null,
        player.guildId
      ).catch((error) => {
        logger.error('Failed to increment track play count', {
          guildId: player.guildId,
          error,
        });
      });

      // Update listening sessions with track duration
      // Only users with active sessions (who were in channel during track) get credit
      try {
        const guild = client.guilds.cache.get(player.guildId);
        if (guild && player.voiceChannelId) {
          const voiceChannel = guild.channels.cache.get(player.voiceChannelId);
          if (voiceChannel && 'members' in voiceChannel) {
            const members = (voiceChannel as any).members;
            const trackDurationMinutes = Math.floor((track.info.duration || 0) / 60000); // Convert ms to minutes

            if (trackDurationMinutes > 0) {
              // Update listening sessions for all non-bot members currently in channel
              // CRITICAL: Only update sessions for users who are in the SAME channel as bot
              // Verify each user is actually in the bot's voice channel
              for (const member of members.values()) {
                if (!member.user.bot) {
                  // Double-check: user must be in the same channel as bot
                  if (member.voice.channel?.id !== player.voiceChannelId) {
                    logger.debug('Skipping user - not in bot channel', {
                      userId: member.id,
                      guildId: player.guildId,
                      userChannelId: member.voice.channel?.id,
                      botChannelId: player.voiceChannelId,
                    });
                    continue;
                  }

                  try {
                    // Get active session for this specific voice channel
                    const activeSessionId = await getActiveListeningSession(
                      member.id,
                      player.guildId,
                      player.voiceChannelId
                    );

                    if (activeSessionId) {
                      // User has active session in bot's channel, update it with track duration
                      await updateListeningSessionWithTrack(activeSessionId, trackDurationMinutes);
                      logger.debug('Updated listening session with track duration', {
                        userId: member.id,
                        guildId: player.guildId,
                        voiceChannelId: player.voiceChannelId,
                        sessionId: activeSessionId,
                        trackDurationMinutes,
                      });
                    } else {
                      // User joined mid-track but is now in bot's channel
                      // Create session now (they'll get partial credit)
                      const sessionId = await createListeningSession(
                        member.id,
                        player.guildId,
                        player.voiceChannelId
                      );
                      if (sessionId > 0) {
                        // Estimate remaining time (rough approximation)
                        // We don't know exact position, so we'll use a conservative estimate
                        // This is better than giving full credit
                        const estimatedRemainingMinutes = Math.max(
                          1,
                          Math.floor(trackDurationMinutes * 0.3)
                        );
                        await updateListeningSessionWithTrack(sessionId, estimatedRemainingMinutes);
                        logger.debug(
                          'Created late listening session for user who joined mid-track',
                          {
                            userId: member.id,
                            guildId: player.guildId,
                            voiceChannelId: player.voiceChannelId,
                            sessionId,
                            estimatedRemainingMinutes,
                          }
                        );
                      }
                    }
                  } catch (error) {
                    logger.error('Failed to update listening session', {
                      userId: member.id,
                      guildId: player.guildId,
                      voiceChannelId: player.voiceChannelId,
                      error,
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error tracking listening sessions', {
          guildId: player.guildId,
          error,
        });
      }
    }

    // Tự động destroy player khi hết nhạc (trừ khi 24/7 mode được bật hoặc autoplay được bật)
    if (player.queue.tracks.length === 0) {
      // Check autoplay and 24/7 mode asynchronously
      Promise.all([
        getGuildAutoplay(player.guildId),
        getGuild24_7Mode(player.guildId),
        getGuildLocale(player.guildId),
      ])
        .then(async ([autoplayEnabled, mode247, locale]) => {
          if (autoplayEnabled && track) {
            // Try to trigger autoplay
            logger.info('Queue empty, autoplay enabled, searching for recommendation', {
              guildId: player.guildId,
            });

            const success = await triggerAutoplay(player, track, locale as Locale);

            if (success) {
              // Notify in text channel if available
              if (player.textChannelId) {
                const channel = client.channels.cache.get(player.textChannelId);
                if (channel && 'send' in channel) {
                  try {
                    await channel.send(
                      translate(locale as Locale, 'commands.autoplay.recommendation_playing')
                    );
                  } catch (error) {
                    logger.error('Error sending autoplay notification', {
                      guildId: player.guildId,
                      error,
                    });
                  }
                }
              }
            } else {
              // Autoplay failed, check 24/7 mode
              if (mode247) {
                logger.info('Autoplay failed, but 24/7 mode is enabled, keeping player alive', {
                  guildId: player.guildId,
                });
              } else {
                logger.info('Autoplay failed, destroying player', { guildId: player.guildId });
                player.destroy();
              }

              // Notify in text channel if available
              if (player.textChannelId) {
                const channel = client.channels.cache.get(player.textChannelId);
                if (channel && 'send' in channel) {
                  try {
                    await channel.send(
                      translate(locale as Locale, 'commands.autoplay.recommendation_failed')
                    );
                  } catch (error) {
                    logger.error('Error sending autoplay failure notification', {
                      guildId: player.guildId,
                      error,
                    });
                  }
                }
              }
            }
          } else if (mode247) {
            logger.info('Queue empty, but 24/7 mode is enabled, keeping player alive', {
              guildId: player.guildId,
            });
          } else {
            logger.info('Queue empty, destroying player', { guildId: player.guildId });
            player.destroy();
          }
        })
        .catch((error) => {
          logger.error('Error checking autoplay/24/7 mode when queue empty', {
            guildId: player.guildId,
            error,
          });
          // Default to destroying if error
          player.destroy();
        });
    }
  });

  lavalinkManager.on('trackError', async (player, track, error) => {
    const errorMsg = error.exception?.message || 'Unknown error';
    const errorSeverity = error.exception?.severity || 'unknown';

    // Get current retry count for this guild
    const currentRetryCount = trackRetryCount.get(player.guildId) || 0;
    const maxRetries = 3;

    logger.error('Track error', {
      guildId: player.guildId,
      title: track?.info?.title || 'Unknown',
      uri: track?.info?.uri || 'Unknown',
      error: errorMsg,
      severity: errorSeverity,
      retryCount: currentRetryCount,
      maxRetries,
    });

    // Get locale for error messages
    const locale = (await getGuildLocale(player.guildId)) as Locale;

    // If retry count is less than max, retry playing
    if (currentRetryCount < maxRetries) {
      const newRetryCount = currentRetryCount + 1;
      trackRetryCount.set(player.guildId, newRetryCount);

      logger.info('Retrying track play', {
        guildId: player.guildId,
        title: track?.info?.title || 'Unknown',
        retryAttempt: newRetryCount,
        maxRetries,
      });

      // Notify user about retry
      const channel = client.channels.cache.get(player.textChannelId || '');
      if (channel && 'send' in channel) {
        channel
          .send(
            translate(locale, 'events.track_error.retrying', {
              title: track?.info?.title || 'Unknown',
              attempt: newRetryCount,
              max: maxRetries,
            })
          )
          .catch((e) =>
            logger.error('Send retry message failed', { guildId: player.guildId, error: e })
          );
      }

      // Wait a bit before retrying (500ms delay)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Retry playing the current track
      try {
        await player.play();
      } catch (retryError) {
        logger.error('Error during retry play', {
          guildId: player.guildId,
          retryAttempt: newRetryCount,
          error: retryError,
        });
        // If retry play fails, the error will be caught again by this handler
        // and we'll increment retry count again or give up
      }
    } else {
      // Max retries reached, show error and skip
      logger.warn('Max retries reached, skipping track', {
        guildId: player.guildId,
        title: track?.info?.title || 'Unknown',
        retryCount: currentRetryCount,
      });

      // Reset retry count
      trackRetryCount.set(player.guildId, 0);

      // Notify user in text channel
      const channel = client.channels.cache.get(player.textChannelId || '');
      if (channel && 'send' in channel) {
        channel
          .send(
            translate(locale, 'events.track_error.failed', {
              title: track?.info?.title || 'Unknown',
              error: errorMsg,
            })
          )
          .catch((e) =>
            logger.error('Send error message failed', { guildId: player.guildId, error: e })
          );
      }

      // Try next track if available
      if (player.queue.tracks.length > 0) {
        logger.info('Skipping to next track after max retries', {
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

  lavalinkManager.on('queueEnd', async (player) => {
    logger.info('Queue ended', { guildId: player.guildId });

    // Check autoplay and 24/7 mode when queue ends
    try {
      const [autoplayEnabled, mode247, locale] = await Promise.all([
        getGuildAutoplay(player.guildId),
        getGuild24_7Mode(player.guildId),
        getGuildLocale(player.guildId),
      ]);

      // Get current track for autoplay recommendation
      const currentTrack = player.queue.current;

      if (autoplayEnabled && currentTrack) {
        // Try to trigger autoplay
        logger.info('Queue ended, autoplay enabled, searching for recommendation', {
          guildId: player.guildId,
        });

        const success = await triggerAutoplay(player, currentTrack, locale as Locale);

        if (success) {
          // Notify in text channel if available
          if (player.textChannelId) {
            const channel = client.channels.cache.get(player.textChannelId);
            if (channel && 'send' in channel) {
              try {
                await channel.send(
                  translate(locale as Locale, 'commands.autoplay.recommendation_playing')
                );
              } catch (error) {
                logger.error('Error sending autoplay notification', {
                  guildId: player.guildId,
                  error,
                });
              }
            }
          }
        } else {
          // Autoplay failed, check 24/7 mode
          if (mode247) {
            logger.info('Autoplay failed, but 24/7 mode is enabled, keeping player alive', {
              guildId: player.guildId,
            });
          } else {
            logger.info('Autoplay failed, destroying player', { guildId: player.guildId });
            player.destroy();
          }

          // Notify in text channel if available
          if (player.textChannelId) {
            const channel = client.channels.cache.get(player.textChannelId);
            if (channel && 'send' in channel) {
              try {
                await channel.send(
                  translate(locale as Locale, 'commands.autoplay.recommendation_failed')
                );
              } catch (error) {
                logger.error('Error sending autoplay failure notification', {
                  guildId: player.guildId,
                  error,
                });
              }
            }
          }
        }
      } else if (mode247) {
        logger.info('Queue ended, but 24/7 mode is enabled, keeping player alive', {
          guildId: player.guildId,
        });
      } else {
        logger.info('Queue ended, destroying player', { guildId: player.guildId });
        player.destroy();
      }
    } catch (error) {
      logger.error('Error checking autoplay/24/7 mode when queue ended', {
        guildId: player.guildId,
        error,
      });
      // Default to destroying if error
      player.destroy();
    }
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
