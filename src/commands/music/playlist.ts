import { VoiceChannel } from 'discord.js';
import { Command } from '../../types/Command';
import { formatTime } from '../../utils/formatTime';
import { logger } from '../../utils/logger';
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistByName,
  deletePlaylist,
  updatePlaylist,
  addTrackToPlaylist,
  getPlaylistTracks,
  removeTrackFromPlaylist,
  updateUserPlaylistCount,
} from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';
import { createEmbed } from '../../utils/embed';
import {
  getCommandContext,
  getAndValidateVoiceChannel,
  getOrCreatePlayer,
  ensurePlayerConnected,
} from '../../utils/musicHelpers';

export const playlistCommand: Command = {
  name: 'playlist',
  description: 'Quản lý danh sách phát của bạn',
  usage: 'playlist <subcommand> [args]',
  aliases: ['pl'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const { locale, prefix } = await getCommandContext(message.guild?.id || null);
    const userId = message.author.id;
    const guildId = message.guild?.id || null;

    if (!args.length) {
      await message.reply(translate(locale, 'commands.playlist.no_subcommand', { prefix }));
      return;
    }

    const subcommand = args[0].toLowerCase();
    const subArgs = args.slice(1);

    try {
      switch (subcommand) {
        case 'create':
          await handleCreate(message, subArgs, locale, prefix, userId, guildId);
          break;
        case 'list':
          await handleList(message, locale, prefix, userId, guildId);
          break;
        case 'add':
          await handleAdd(message, subArgs, locale, prefix, userId, guildId, lavalinkManager);
          break;
        case 'remove':
          await handleRemove(message, subArgs, locale, prefix, userId, guildId);
          break;
        case 'play':
          await handlePlay(message, subArgs, locale, prefix, userId, guildId, lavalinkManager);
          break;
        case 'delete':
          await handleDelete(message, subArgs, locale, prefix, userId, guildId);
          break;
        case 'show':
          await handleShow(message, subArgs, locale, prefix, userId, guildId);
          break;
        case 'share':
          await handleShare(message, subArgs, locale, prefix, userId, guildId);
          break;
        default:
          await message.reply(translate(locale, 'commands.playlist.no_subcommand', { prefix }));
      }
    } catch (error) {
      logger.error('[PLAYLIST] Error', { subcommand, userId, guildId, error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await message.reply(`❌ ${errorMessage}`);
    }
  },
};

/**
 * Handle create subcommand
 */
async function handleCreate(
  message: any,
  args: string[],
  locale: Locale,
  prefix: string,
  userId: string,
  guildId: string | null
) {
  if (!args.length) {
    await message.reply(translate(locale, 'commands.playlist.create.no_name', { prefix }));
    return;
  }

  const name = args.join(' ');

  try {
    const playlist = await createPlaylist(userId, guildId, name);
    // Update playlist count stats
    await updateUserPlaylistCount(userId, guildId);
    await message.reply(
      translate(locale, 'commands.playlist.create.created', { name: playlist.name })
    );
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      await message.reply(translate(locale, 'commands.playlist.create.already_exists'));
    } else if (error.message.includes('1-100 characters')) {
      await message.reply(translate(locale, 'commands.playlist.create.name_too_long'));
    } else {
      logger.error('[PLAYLIST CREATE] Error', { userId, guildId, name, error });
      await message.reply(translate(locale, 'commands.playlist.create.error'));
    }
  }
}

/**
 * Handle list subcommand
 */
async function handleList(
  message: any,
  locale: Locale,
  prefix: string,
  userId: string,
  guildId: string | null
) {
  const playlists = await getUserPlaylists(userId, guildId);

  if (playlists.length === 0) {
    await message.reply(translate(locale, 'commands.playlist.list.empty', { prefix }));
    return;
  }

  // Get track counts for each playlist
  const playlistsWithCounts = await Promise.all(
    playlists.map(async (playlist) => {
      const tracks = await getPlaylistTracks(playlist.id);
      return { ...playlist, trackCount: tracks.length };
    })
  );

  const embed = createEmbed({
    title: translate(locale, 'commands.playlist.list.title'),
    description: playlistsWithCounts
      .map((p) =>
        translate(locale, 'commands.playlist.list.playlist_item', {
          name: p.name,
          count: p.trackCount,
        })
      )
      .join('\n'),
  });

  embed.setFooter({ text: translate(locale, 'commands.playlist.list.footer', { prefix }) });

  await message.reply({ embeds: [embed] });
}

/**
 * Handle add subcommand
 */
async function handleAdd(
  message: any,
  args: string[],
  locale: Locale,
  prefix: string,
  userId: string,
  guildId: string | null,
  lavalinkManager: any
) {
  if (args.length < 2) {
    await message.reply(translate(locale, 'commands.playlist.add.no_playlist', { prefix }));
    return;
  }

  const playlistName = args[0];
  const query = args.slice(1).join(' ');

  const playlist = await getPlaylistByName(userId, guildId, playlistName);
  if (!playlist) {
    await message.reply(
      translate(locale, 'commands.playlist.add.not_found', { name: playlistName })
    );
    return;
  }

  const loadingMsg = await message.reply(translate(locale, 'commands.playlist.add.searching'));

  try {
    // Get or create player for searching (doesn't require voice channel connection)
    let player = lavalinkManager.getPlayer(message.guild!.id);
    if (!player) {
      // Create a player just for searching (won't connect to voice)
      const voiceChannelId =
        message.member?.voice.channel?.id || message.guild!.voiceChannels.cache.first()?.id || '0';
      player = getOrCreatePlayer(
        lavalinkManager,
        message.guild!.id,
        voiceChannelId,
        message.channel.id
      );
    }

    const isUrl = /^https?:\/\//.test(query);
    const res = await player.search(
      {
        query: query,
        source: isUrl ? undefined : 'ytsearch',
      },
      message.author
    );

    if (!res.tracks.length) {
      await loadingMsg.edit(translate(locale, 'commands.playlist.add.not_found_track'));
      return;
    }

    // Add tracks to playlist
    let addedCount = 0;
    for (const track of res.tracks) {
      try {
        await addTrackToPlaylist(
          playlist.id,
          {
            uri: track.info.uri,
            identifier: track.info.identifier,
            title: track.info.title,
            author: track.info.author,
            duration: track.info.duration,
            sourceName: track.info.sourceName,
          },
          userId
        );
        addedCount++;
      } catch (error) {
        logger.error('[PLAYLIST ADD] Error adding track', {
          playlistId: playlist.id,
          track: track.info.title,
          error,
        });
      }
    }

    if (res.loadType === 'playlist') {
      await loadingMsg.edit(
        translate(locale, 'commands.playlist.add.playlist_added', {
          name: playlist.name,
          count: addedCount,
        })
      );
    } else {
      await loadingMsg.edit(
        translate(locale, 'commands.playlist.add.added', {
          name: playlist.name,
          title: res.tracks[0].info.title,
          author: res.tracks[0].info.author || translate(locale, 'commands.nowplaying.unknown'),
        })
      );
    }
  } catch (error) {
    logger.error('[PLAYLIST ADD] Error', { playlistId: playlist.id, error });
    await loadingMsg.edit(translate(locale, 'commands.playlist.add.error'));
  }
}

/**
 * Handle remove subcommand
 */
async function handleRemove(
  message: any,
  args: string[],
  locale: Locale,
  prefix: string,
  userId: string,
  guildId: string | null
) {
  if (args.length < 2) {
    await message.reply(translate(locale, 'commands.playlist.remove.no_playlist', { prefix }));
    return;
  }

  const playlistName = args[0];
  const positionStr = args[1];

  const position = parseInt(positionStr, 10);
  if (isNaN(position) || position < 1) {
    await message.reply(translate(locale, 'commands.playlist.remove.invalid_position'));
    return;
  }

  const playlist = await getPlaylistByName(userId, guildId, playlistName);
  if (!playlist) {
    await message.reply(
      translate(locale, 'commands.playlist.remove.not_found', { name: playlistName })
    );
    return;
  }

  const success = await removeTrackFromPlaylist(playlist.id, position);
  if (!success) {
    await message.reply(
      translate(locale, 'commands.playlist.remove.not_found_track', { position })
    );
    return;
  }

  await message.reply(
    translate(locale, 'commands.playlist.remove.removed', {
      name: playlist.name,
      position,
    })
  );
}

/**
 * Handle play subcommand
 */
async function handlePlay(
  message: any,
  args: string[],
  locale: Locale,
  prefix: string,
  userId: string,
  guildId: string | null,
  lavalinkManager: any
) {
  if (!args.length) {
    await message.reply(translate(locale, 'commands.playlist.play.no_playlist', { prefix }));
    return;
  }

  const playlistName = args.join(' ');

  const playlist = await getPlaylistByName(userId, guildId, playlistName);
  if (!playlist) {
    await message.reply(
      translate(locale, 'commands.playlist.play.not_found', { name: playlistName })
    );
    return;
  }

  const tracks = await getPlaylistTracks(playlist.id);
  if (tracks.length === 0) {
    await message.reply(translate(locale, 'commands.playlist.play.empty', { name: playlist.name }));
    return;
  }

  const voiceChannel = await getAndValidateVoiceChannel(
    message.member,
    locale,
    'playlist.play',
    message
  );

  if (!voiceChannel) {
    return;
  }

  const loadingMsg = await message.reply(translate(locale, 'commands.playlist.play.loading'));

  try {
    // Create or get player
    const player = getOrCreatePlayer(
      lavalinkManager,
      message.guild!.id,
      voiceChannel.id,
      message.channel.id
    );

    await ensurePlayerConnected(player, message.guild!.id, voiceChannel.id);

    // Load tracks from playlist
    let loadedCount = 0;
    for (const trackData of tracks) {
      try {
        const res = await player.search(
          {
            query: trackData.track_uri,
            source: undefined, // Let Lavalink detect source from URI
          },
          message.author
        );

        if (res.tracks.length > 0) {
          await player.queue.add(res.tracks[0]);
          loadedCount++;
        }
      } catch (error) {
        logger.error('[PLAYLIST PLAY] Error loading track', {
          trackUri: trackData.track_uri,
          error,
        });
      }
    }

    if (loadedCount === 0) {
      await loadingMsg.edit('❌ Không thể tải bất kỳ bài hát nào từ playlist!');
      return;
    }

    if (!player.playing) {
      await player.play();
    }

    await loadingMsg.edit(
      translate(locale, 'commands.playlist.play.added', {
        name: playlist.name,
        count: loadedCount,
      })
    );
  } catch (error) {
    logger.error('[PLAYLIST PLAY] Error', { playlistId: playlist.id, error });
    await loadingMsg.edit(translate(locale, 'commands.playlist.play.error'));
  }
}

/**
 * Handle delete subcommand
 */
async function handleDelete(
  message: any,
  args: string[],
  locale: Locale,
  prefix: string,
  userId: string,
  guildId: string | null
) {
  if (!args.length) {
    await message.reply(translate(locale, 'commands.playlist.delete.no_playlist', { prefix }));
    return;
  }

  const playlistName = args.join(' ');

  const playlist = await getPlaylistByName(userId, guildId, playlistName);
  if (!playlist) {
    await message.reply(
      translate(locale, 'commands.playlist.delete.not_found', { name: playlistName })
    );
    return;
  }

  const success = await deletePlaylist(playlist.id, userId);
  if (!success) {
    await message.reply(translate(locale, 'commands.playlist.delete.error'));
    return;
  }

  // Update playlist count stats
  await updateUserPlaylistCount(userId, guildId);
  await message.reply(
    translate(locale, 'commands.playlist.delete.deleted', { name: playlist.name })
  );
}

/**
 * Handle show subcommand
 */
async function handleShow(
  message: any,
  args: string[],
  locale: Locale,
  prefix: string,
  userId: string,
  guildId: string | null
) {
  if (!args.length) {
    await message.reply(translate(locale, 'commands.playlist.show.no_playlist', { prefix }));
    return;
  }

  const playlistName = args.join(' ');

  const playlist = await getPlaylistByName(userId, guildId, playlistName);
  if (!playlist) {
    await message.reply(
      translate(locale, 'commands.playlist.show.not_found', { name: playlistName })
    );
    return;
  }

  const tracks = await getPlaylistTracks(playlist.id);

  const embed = createEmbed({
    title: translate(locale, 'commands.playlist.show.title', { name: playlist.name }),
  });

  if (tracks.length === 0) {
    embed.setDescription(translate(locale, 'commands.playlist.show.empty'));
  } else {
    const tracksList = tracks
      .slice(0, 20) // Limit to 20 tracks for display
      .map((track, index) =>
        translate(locale, 'commands.playlist.show.track_item', {
          position: track.position,
          title: track.track_title,
          author: track.track_author || translate(locale, 'commands.nowplaying.unknown'),
        })
      )
      .join('\n');

    embed.setDescription(
      `${translate(locale, 'commands.playlist.show.tracks', { count: tracks.length })}\n${tracksList}`
    );
  }

  // Set footer
  let footerText = translate(locale, 'commands.playlist.show.footer', {
    prefix,
    name: playlist.name,
  });
  if (tracks.length > 20) {
    const moreTracks = translate(locale, 'commands.playlist.show.more_tracks', {
      count: tracks.length - 20,
    });
    footerText = `${moreTracks} | ${footerText}`;
  }
  embed.setFooter({
    text: footerText,
  });

  await message.reply({ embeds: [embed] });
}

/**
 * Handle share subcommand
 */
async function handleShare(
  message: any,
  args: string[],
  locale: Locale,
  prefix: string,
  userId: string,
  guildId: string | null
) {
  if (!args.length) {
    await message.reply(translate(locale, 'commands.playlist.share.no_playlist', { prefix }));
    return;
  }

  const playlistName = args.join(' ');

  const playlist = await getPlaylistByName(userId, guildId, playlistName);
  if (!playlist) {
    await message.reply(
      translate(locale, 'commands.playlist.share.not_found', { name: playlistName })
    );
    return;
  }

  const newPublicStatus = !playlist.is_public;
  const success = await updatePlaylist(playlist.id, userId, { is_public: newPublicStatus });

  if (!success) {
    await message.reply(translate(locale, 'commands.playlist.share.error'));
    return;
  }

  if (newPublicStatus) {
    await message.reply(
      translate(locale, 'commands.playlist.share.shared', { name: playlist.name })
    );
  } else {
    await message.reply(
      translate(locale, 'commands.playlist.share.unshared', { name: playlist.name })
    );
  }
}
