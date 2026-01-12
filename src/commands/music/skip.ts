import { VoiceChannel } from 'discord.js';
import { Command } from '../../types/Command';
import { getGuildLocale, getGuildDjRole, getGuild24_7Mode } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { createEmbed } from '../../utils/embed';
import { addVoteSkip, clearVoteSkip, hasUserVoted, getVoteSkipCount } from '../../utils/voteSkip';

export const skipCommand: Command = {
  name: 'skip',
  description: 'Skip current song',
  usage: 'skip',
  aliases: ['s', 'next'],
  category: 'music',
  guildOnly: true,

  async execute({ message, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const member = message.member;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
      await message.reply(translate(locale, 'commands.skip.no_voice'));
      return;
    }

    const player = lavalinkManager.getPlayer(message.guild!.id);

    if (!player || !player.queue.current) {
      await message.reply(translate(locale, 'commands.skip.not_playing'));
      return;
    }

    // Check if user is in the same voice channel
    if (player.voiceChannelId !== voiceChannel.id) {
      await message.reply(translate(locale, 'commands.skip.same_voice_channel'));
      return;
    }

    const currentTrack = player.queue.current;
    const trackIdentifier = currentTrack.info.identifier || currentTrack.info.uri;
    const hasNext = player.queue.tracks.length > 0;

    // Get DJ role
    const djRoleId = await getGuildDjRole(message.guild!.id);
    const hasDjRole = djRoleId && member?.roles.cache.has(djRoleId);

    // If user has DJ role, skip immediately
    if (hasDjRole) {
      try {
        if (!hasNext) {
          // If this is the last track, check 24/7 mode before destroying
          clearVoteSkip(message.guild!.id, trackIdentifier);
          const mode247 = await getGuild24_7Mode(message.guild!.id);
          if (mode247) {
            // 24/7 mode is on, just skip (player will stay)
            await player.skip();
            await message.reply(
              translate(locale, 'commands.skip.skipped', {
                title: currentTrack.info.title,
              })
            );
          } else {
            // 24/7 mode is off, destroy player
            await player.destroy();
            await message.reply(
              translate(locale, 'commands.skip.skipped_last', {
                title: currentTrack.info.title,
              })
            );
          }
          return;
        }

        clearVoteSkip(message.guild!.id, trackIdentifier);
        await player.skip();

        await message.reply(
          translate(locale, 'commands.skip.skipped', {
            title: currentTrack.info.title,
          })
        );
      } catch (error) {
        logger.error('Error skipping track', { error, guildId: message.guild?.id });
        await message.reply(translate(locale, 'commands.skip.error'));
      }
      return;
    }

    // Vote skip logic
    const membersInChannel = voiceChannel.members.filter((m) => !m.user.bot).size;
    const voteResult = addVoteSkip(
      message.guild!.id,
      trackIdentifier,
      message.author.id,
      membersInChannel
    );

    if (!voteResult.success) {
      // User already voted
      const voteInfo = getVoteSkipCount(message.guild!.id, trackIdentifier);
      if (voteInfo) {
        await message.reply(
          translate(locale, 'commands.skip.already_voted', {
            votes: voteInfo.votes,
            required: voteInfo.required,
          })
        );
      }
      return;
    }

    // Check if threshold reached
    if (voteResult.skipped) {
      try {
        clearVoteSkip(message.guild!.id, trackIdentifier);

        if (!hasNext) {
          // If this is the last track, check 24/7 mode before destroying
          const mode247 = await getGuild24_7Mode(message.guild!.id);
          if (mode247) {
            // 24/7 mode is on, just skip (player will stay)
            await player.skip();
            await message.reply(
              translate(locale, 'commands.skip.vote_skipped', {
                title: currentTrack.info.title,
                votes: voteResult.votes,
                required: voteResult.required,
              })
            );
          } else {
            // 24/7 mode is off, destroy player
            await player.destroy();
            await message.reply(
              translate(locale, 'commands.skip.vote_skipped_last', {
                title: currentTrack.info.title,
                votes: voteResult.votes,
                required: voteResult.required,
              })
            );
          }
          return;
        }

        await player.skip();

        await message.reply(
          translate(locale, 'commands.skip.vote_skipped', {
            title: currentTrack.info.title,
            votes: voteResult.votes,
            required: voteResult.required,
          })
        );
      } catch (error) {
        logger.error('Error skipping track via vote', { error, guildId: message.guild?.id });
        await message.reply(translate(locale, 'commands.skip.error'));
      }
    } else {
      // Show vote status
      const embed = createEmbed({
        title: translate(locale, 'commands.skip.vote_title'),
        description: translate(locale, 'commands.skip.vote_description', {
          title: currentTrack.info.title,
          votes: voteResult.votes,
          required: voteResult.required,
        }),
        color: '#FFA500',
      });

      await message.reply({ embeds: [embed] });
    }
  },
};
