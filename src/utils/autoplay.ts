import { Player } from 'lavalink-client';
import { logger } from './logger';
import { getPlayHistory, getTopTracks } from './database';
import { translate, type Locale } from './i18n';

/**
 * Get a recommended track query for autoplay
 * Strategy:
 * 1. Try to find similar track based on current track (title + author)
 * 2. If that fails, try to get a popular track from guild's top tracks
 * 3. If that fails, try to get a recent track from play history
 */
export async function getRecommendedTrackQuery(
  player: Player,
  currentTrack: any,
  locale: Locale
): Promise<string | null> {
  const guildId = player.guildId;

  try {
    // Strategy 1: Search for similar track based on current track
    if (currentTrack?.info) {
      const title = currentTrack.info.title || '';
      const author = currentTrack.info.author || '';

      // Try different search queries
      const searchQueries = [
        // Full title + author
        author && title ? `${author} ${title}` : null,
        // Just author (for similar artists)
        author || null,
        // Just title (for similar songs)
        title || null,
      ].filter((q): q is string => q !== null);

      // Return first valid query
      if (searchQueries.length > 0) {
        logger.info('Autoplay: Using similar track search', {
          guildId,
          query: searchQueries[0],
        });
        return searchQueries[0];
      }
    }

    // Strategy 2: Get a popular track from guild's top tracks
    const topTracks = await getTopTracks(guildId, 10, 'month');
    if (topTracks.length > 0) {
      // Pick a random track from top 10 to add variety
      const randomTrack = topTracks[Math.floor(Math.random() * topTracks.length)];
      const title = randomTrack.track_title || '';
      const author = randomTrack.track_author || '';

      if (title || author) {
        const query = author && title ? `${author} ${title}` : title || author;
        logger.info('Autoplay: Using top track from guild', {
          guildId,
          query,
          trackTitle: title,
        });
        return query;
      }
    }

    // Strategy 3: Get a recent track from play history
    const playHistory = await getPlayHistory(guildId, 20);
    if (playHistory.length > 0) {
      // Pick a random track from recent history
      const randomTrack = playHistory[Math.floor(Math.random() * playHistory.length)];
      const title = randomTrack.track_title || '';
      const author = randomTrack.track_author || '';

      if (title || author) {
        const query = author && title ? `${author} ${title}` : title || author;
        logger.info('Autoplay: Using track from play history', {
          guildId,
          query,
          trackTitle: title,
        });
        return query;
      }
    }

    logger.warn('Autoplay: No recommendation found', { guildId });
    return null;
  } catch (error) {
    logger.error('Error getting recommended track query', { guildId, error });
    return null;
  }
}

/**
 * Trigger autoplay by finding and playing a recommended track
 */
export async function triggerAutoplay(
  player: Player,
  currentTrack: any,
  locale: Locale
): Promise<boolean> {
  try {
    const query = await getRecommendedTrackQuery(player, currentTrack, locale);

    if (!query) {
      logger.warn('Autoplay: No recommendation query available', {
        guildId: player.guildId,
      });
      return false;
    }

    logger.info('Autoplay: Searching for recommended track', {
      guildId: player.guildId,
      query,
    });

    // Search for the recommended track
    const res = await player.search(
      {
        query: query,
        source: 'ytsearch',
      },
      null // No requester for autoplay
    );

    if (!res.tracks || res.tracks.length === 0) {
      logger.warn('Autoplay: No tracks found for recommendation', {
        guildId: player.guildId,
        query,
      });
      return false;
    }

    // Pick the first track (most relevant)
    const recommendedTrack = res.tracks[0];

    // Add to queue and play
    await player.queue.add(recommendedTrack);
    await player.play();

    logger.info('Autoplay: Successfully added recommended track', {
      guildId: player.guildId,
      title: recommendedTrack.info.title,
      author: recommendedTrack.info.author,
    });

    return true;
  } catch (error) {
    logger.error('Error triggering autoplay', {
      guildId: player.guildId,
      error,
    });
    return false;
  }
}
