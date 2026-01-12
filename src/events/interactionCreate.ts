import { Client, Interaction, ButtonInteraction, VoiceChannel } from 'discord.js';
import { LavalinkManager } from 'lavalink-client';
import { logger } from '../utils/logger';
import { getGuildLocale, getGuildDjRole, getGuild24_7Mode } from '../utils/database';
import { translate, type Locale } from '../utils/i18n';
import { addVoteSkip, clearVoteSkip, getVoteSkipCount } from '../utils/voteSkip';

/**
 * Register interaction create event handler
 * Handles button interactions for nowplaying command
 */
export function registerInteractionCreateEvent(
  client: Client,
  lavalinkManager: LavalinkManager
): void {
  client.on('interactionCreate', async (interaction: Interaction) => {
    // Only handle button interactions
    if (!interaction.isButton()) return;

    const buttonInteraction = interaction as ButtonInteraction;

    // Only handle buttons from nowplaying command
    if (!buttonInteraction.customId.startsWith('np_')) return;

    // Defer reply to prevent timeout
    await buttonInteraction.deferUpdate().catch(() => {
      // If message was deleted, try to reply instead
      if (buttonInteraction.deferred || buttonInteraction.replied) return;
      buttonInteraction.deferReply({ ephemeral: true }).catch(() => {});
    });

    const locale = (await getGuildLocale(buttonInteraction.guild?.id || null)) as Locale;

    if (!buttonInteraction.guild || !buttonInteraction.member) {
      await buttonInteraction
        .followUp({
          content: translate(locale, 'commands.nowplaying.guild_only'),
          ephemeral: true,
        })
        .catch(() => {});
      return;
    }

    const member = buttonInteraction.member;
    const voiceChannel = (member as any).voice?.channel;

    if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
      await buttonInteraction
        .followUp({
          content: translate(locale, 'commands.nowplaying.no_voice'),
          ephemeral: true,
        })
        .catch(() => {});
      return;
    }

    const player = lavalinkManager.getPlayer(buttonInteraction.guild.id);

    if (!player || !player.queue.current) {
      await buttonInteraction
        .followUp({
          content: translate(locale, 'commands.nowplaying.not_playing'),
          ephemeral: true,
        })
        .catch(() => {});
      return;
    }

    // Check if user is in the same voice channel
    if (player.voiceChannelId !== voiceChannel.id) {
      await buttonInteraction
        .followUp({
          content: translate(locale, 'commands.nowplaying.same_voice_channel'),
          ephemeral: true,
        })
        .catch(() => {});
      return;
    }

    const action = buttonInteraction.customId.replace('np_', '');

    try {
      switch (action) {
        case 'previous': {
          // Previous track - go back in play history
          // For now, we'll skip to position 0 (restart current) or go back if possible
          // This is a simplified implementation
          if (player.position > 10000) {
            // If track has played for more than 10 seconds, restart it
            await player.seek(0);
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.restarted'),
                ephemeral: true,
              })
              .catch(() => {});
          } else {
            // Otherwise, we can't go back (no history tracking for previous tracks)
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.no_previous'),
                ephemeral: true,
              })
              .catch(() => {});
          }
          break;
        }

        case 'pause': {
          if (player.paused) {
            await player.resume();
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.resumed'),
                ephemeral: true,
              })
              .catch(() => {});
          } else {
            await player.pause();
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.paused'),
                ephemeral: true,
              })
              .catch(() => {});
          }
          break;
        }

        case 'skip': {
          const currentTrack = player.queue.current;
          const trackIdentifier = currentTrack.info.identifier || currentTrack.info.uri;
          const hasNext = player.queue.tracks.length > 0;

          // Get DJ role
          const djRoleId = await getGuildDjRole(buttonInteraction.guild.id);
          const hasDjRole = djRoleId && (member as any).roles?.cache?.has(djRoleId);

          // If user has DJ role, skip immediately
          if (hasDjRole) {
            if (!hasNext) {
              clearVoteSkip(buttonInteraction.guild.id, trackIdentifier);
              const mode247 = await getGuild24_7Mode(buttonInteraction.guild.id);
              if (mode247) {
                // 24/7 mode is on, just skip (player will stay)
                await player.skip();
                await buttonInteraction
                  .followUp({
                    content: translate(locale, 'commands.skip.skipped', {
                      title: currentTrack.info.title,
                    }),
                    ephemeral: true,
                  })
                  .catch(() => {});
              } else {
                // 24/7 mode is off, destroy player
                await player.destroy();
                await buttonInteraction
                  .followUp({
                    content: translate(locale, 'commands.skip.skipped_last', {
                      title: currentTrack.info.title,
                    }),
                    ephemeral: true,
                  })
                  .catch(() => {});
              }
            } else {
              clearVoteSkip(buttonInteraction.guild.id, trackIdentifier);
              await player.skip();
              await buttonInteraction
                .followUp({
                  content: translate(locale, 'commands.skip.skipped', {
                    title: currentTrack.info.title,
                  }),
                  ephemeral: true,
                })
                .catch(() => {});
            }
          } else {
            // Vote skip logic
            const membersInChannel = voiceChannel.members.filter((m) => !m.user.bot).size;
            const voteResult = addVoteSkip(
              buttonInteraction.guild.id,
              trackIdentifier,
              buttonInteraction.user.id,
              membersInChannel
            );

            if (!voteResult.success) {
              const voteInfo = getVoteSkipCount(buttonInteraction.guild.id, trackIdentifier);
              if (voteInfo) {
                await buttonInteraction
                  .followUp({
                    content: translate(locale, 'commands.skip.already_voted', {
                      votes: voteInfo.votes,
                      required: voteInfo.required,
                    }),
                    ephemeral: true,
                  })
                  .catch(() => {});
              }
              break;
            }

            if (voteResult.skipped) {
              clearVoteSkip(buttonInteraction.guild.id, trackIdentifier);

              if (!hasNext) {
                const mode247 = await getGuild24_7Mode(buttonInteraction.guild.id);
                if (mode247) {
                  // 24/7 mode is on, just skip (player will stay)
                  await player.skip();
                  await buttonInteraction
                    .followUp({
                      content: translate(locale, 'commands.skip.vote_skipped', {
                        title: currentTrack.info.title,
                        votes: voteResult.votes,
                        required: voteResult.required,
                      }),
                      ephemeral: true,
                    })
                    .catch(() => {});
                } else {
                  // 24/7 mode is off, destroy player
                  await player.destroy();
                  await buttonInteraction
                    .followUp({
                      content: translate(locale, 'commands.skip.vote_skipped_last', {
                        title: currentTrack.info.title,
                        votes: voteResult.votes,
                        required: voteResult.required,
                      }),
                      ephemeral: true,
                    })
                    .catch(() => {});
                }
              } else {
                await player.skip();
                await buttonInteraction
                  .followUp({
                    content: translate(locale, 'commands.skip.vote_skipped', {
                      title: currentTrack.info.title,
                      votes: voteResult.votes,
                      required: voteResult.required,
                    }),
                    ephemeral: true,
                  })
                  .catch(() => {});
              }
            } else {
              await buttonInteraction
                .followUp({
                  content: translate(locale, 'commands.skip.vote_added', {
                    votes: voteResult.votes,
                    required: voteResult.required,
                  }),
                  ephemeral: true,
                })
                .catch(() => {});
            }
          }
          break;
        }

        case 'loop': {
          // Toggle loop mode: off -> queue -> track -> off
          // Try setRepeatMode first, fallback to direct assignment
          if (player.repeatMode === 'off') {
            if (typeof (player as any).setRepeatMode === 'function') {
              (player as any).setRepeatMode('queue');
            } else {
              (player as any).repeatMode = 'queue';
            }
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.loop_queue'),
                ephemeral: true,
              })
              .catch(() => {});
          } else if (player.repeatMode === 'queue') {
            if (typeof (player as any).setRepeatMode === 'function') {
              (player as any).setRepeatMode('track');
            } else {
              (player as any).repeatMode = 'track';
            }
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.loop_track'),
                ephemeral: true,
              })
              .catch(() => {});
          } else {
            if (typeof (player as any).setRepeatMode === 'function') {
              (player as any).setRepeatMode('off');
            } else {
              (player as any).repeatMode = 'off';
            }
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.loop_off'),
                ephemeral: true,
              })
              .catch(() => {});
          }
          break;
        }

        case 'shuffle': {
          if (player.queue.tracks.length > 0) {
            // Shuffle queue
            const tracks = player.queue.tracks;
            for (let i = tracks.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
            }
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.shuffled'),
                ephemeral: true,
              })
              .catch(() => {});
          } else {
            await buttonInteraction
              .followUp({
                content: translate(locale, 'commands.nowplaying.no_queue'),
                ephemeral: true,
              })
              .catch(() => {});
          }
          break;
        }

        case 'stop': {
          await player.destroy();
          await buttonInteraction
            .followUp({
              content: translate(locale, 'commands.stop.stopped'),
              ephemeral: true,
            })
            .catch(() => {});
          break;
        }

        default:
          logger.warn('Unknown button action', { action, guildId: buttonInteraction.guild.id });
      }
    } catch (error) {
      logger.error('Error handling button interaction', {
        action,
        guildId: buttonInteraction.guild.id,
        error,
      });
      await buttonInteraction
        .followUp({
          content: translate(locale, 'commands.nowplaying.error'),
          ephemeral: true,
        })
        .catch(() => {});
    }
  });
}
