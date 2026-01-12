import { VoiceChannel } from 'discord.js';
import { Command } from '../../types/Command';
import { formatTime } from '../../utils/formatTime';
import { logger } from '../../utils/logger';
import { getGuildLocale, getGuildPrefix } from '../../utils/database';
import { translate, type Locale } from '../../utils/i18n';

export const playCommand: Command = {
  name: 'play',
  description: 'Phát nhạc từ link hoặc tìm kiếm trên YouTube',
  usage: '!play <link hoặc từ khóa>',
  aliases: ['p'],
  category: 'music',
  guildOnly: true,

  async execute({ message, args, lavalinkManager }) {
    const locale = (await getGuildLocale(message.guild?.id || null)) as Locale;
    const prefix = await getGuildPrefix(message.guild?.id || null, 'z!');

    if (!args.length) {
      await message.reply(translate(locale, 'commands.play.no_query', { prefix }));
      return;
    }

    const member = message.member;
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel || !(voiceChannel instanceof VoiceChannel)) {
      await message.reply(translate(locale, 'commands.play.no_voice'));
      return;
    }

    try {
      const query = args.join(' ');

      logger.info('[PLAY] Incoming request', {
        guildId: message.guild!.id,
        query,
        userId: message.author.id,
      });

      // Tạo hoặc lấy player
      const player = lavalinkManager.createPlayer({
        guildId: message.guild!.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
      });

      // Kết nối nếu chưa
      if (!player.connected) {
        logger.info('[PLAY] Connecting to voice channel', {
          guildId: message.guild!.id,
          voiceChannelId: voiceChannel.id,
        });
        await player.connect();
      }

      // Kiểm tra xem có phải link hay không
      const isUrl = /^https?:\/\//.test(query);

      // Send loading message
      const loadingMsg = await message.reply(translate(locale, 'commands.play.searching'));

      // Search hoặc load track
      logger.info('[PLAY] Searching', { isUrl, guildId: message.guild!.id });
      const res = await player.search(
        {
          query: query,
          source: isUrl ? undefined : 'ytsearch', // mặc định search trên youtube
        },
        message.author
      );

      // Debug: Log search result
      logger.info('[PLAY] Search result', {
        loadType: res.loadType,
        tracksCount: res.tracks.length,
        playlist: !!res.playlist,
      });

      if (!res.tracks.length) {
        await loadingMsg.edit(translate(locale, 'commands.play.not_found'));
        return;
      }

      // Xử lý playlist
      if (res.loadType === 'playlist') {
        logger.info('[PLAY] Loading playlist', {
          name: res.playlist?.name,
          tracks: res.tracks.length,
          guildId: message.guild!.id,
        });

        // Thêm tất cả tracks vào queue
        await player.queue.add(res.tracks);

        if (!player.playing) {
          await player.play();
        }

        const totalDuration = res.tracks.reduce(
          (acc, track) => acc + (track.info.duration || 0),
          0
        );

        await loadingMsg.edit(
          translate(locale, 'commands.play.playlist_added', {
            name: res.playlist?.name || translate(locale, 'commands.nowplaying.unknown'),
            count: res.tracks.length,
            duration: formatTime(totalDuration),
            requester: `<@${message.author.id}>`,
          })
        );

        logger.info('[PLAY] Playlist added', {
          queueSize: player.queue.tracks.length + 1,
          guildId: message.guild!.id,
        });
      }
      // Xử lý single track hoặc search result
      else {
        logger.info('[PLAY] Loading single track', {
          title: res.tracks[0].info.title,
          guildId: message.guild!.id,
        });

        const track = res.tracks[0];
        await player.queue.add(track);

        if (!player.playing) {
          await player.play();
        }

        const duration = track.info.duration || 0;
        const durationText =
          duration > 0
            ? translate(locale, 'commands.play.duration_label', {
                duration: formatTime(duration),
              })
            : '';

        await loadingMsg.edit(
          translate(locale, 'commands.play.track_added', {
            title: track.info.title,
            author: track.info.author || translate(locale, 'commands.nowplaying.unknown'),
            duration: durationText,
          })
        );

        logger.info('[PLAY] Track added', {
          queueSize: player.queue.tracks.length + (player.queue.current ? 1 : 0),
          guildId: message.guild!.id,
        });
      }
    } catch (error) {
      logger.error('[PLAY] Error', { error, guildId: message.guild?.id });

      // Enhanced error logging
      if (error instanceof Error) {
        logger.error('[PLAY] Error details', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await message.reply(
        `${translate(locale, 'commands.play.error')}\n\`\`\`${errorMessage}\`\`\`\n${translate(locale, 'commands.play.error_tip')}`
      );
    }
  },
};
