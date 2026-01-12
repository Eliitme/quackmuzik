import { logger } from './logger';

/**
 * Vote skip tracking per guild per track
 */
interface VoteSkipData {
  trackIdentifier: string;
  votes: Set<string>; // User IDs who voted
  requiredVotes: number;
  startedAt: number; // Timestamp
}

const voteSkipMap = new Map<string, VoteSkipData>();

/**
 * Get or create vote skip data for a guild
 */
export function getVoteSkipData(
  guildId: string,
  trackIdentifier: string,
  totalMembers: number
): VoteSkipData {
  const key = `${guildId}:${trackIdentifier}`;
  const existing = voteSkipMap.get(key);

  // If track changed, reset votes
  if (existing && existing.trackIdentifier !== trackIdentifier) {
    voteSkipMap.delete(key);
  }

  // Calculate required votes (50% of members in voice channel, minimum 2)
  const requiredVotes = Math.max(2, Math.ceil(totalMembers * 0.5));

  if (!voteSkipMap.has(key)) {
    voteSkipMap.set(key, {
      trackIdentifier,
      votes: new Set(),
      requiredVotes,
      startedAt: Date.now(),
    });
  }

  return voteSkipMap.get(key)!;
}

/**
 * Add a vote for skip
 * Returns: { success: boolean, votes: number, required: number, skipped: boolean }
 */
export function addVoteSkip(
  guildId: string,
  trackIdentifier: string,
  userId: string,
  totalMembers: number
): { success: boolean; votes: number; required: number; skipped: boolean } {
  const data = getVoteSkipData(guildId, trackIdentifier, totalMembers);

  // Check if already voted
  if (data.votes.has(userId)) {
    return {
      success: false,
      votes: data.votes.size,
      required: data.requiredVotes,
      skipped: false,
    };
  }

  // Add vote
  data.votes.add(userId);
  const votes = data.votes.size;
  const required = data.requiredVotes;
  const skipped = votes >= required;

  logger.debug('Vote skip added', {
    guildId,
    trackIdentifier,
    userId,
    votes,
    required,
    skipped,
  });

  return {
    success: true,
    votes,
    required,
    skipped,
  };
}

/**
 * Remove a vote (for unvoting if needed)
 */
export function removeVoteSkip(guildId: string, trackIdentifier: string, userId: string): boolean {
  const key = `${guildId}:${trackIdentifier}`;
  const data = voteSkipMap.get(key);

  if (!data) {
    return false;
  }

  return data.votes.delete(userId);
}

/**
 * Clear vote skip data for a guild (when track changes or player stops)
 */
export function clearVoteSkip(guildId: string, trackIdentifier?: string): void {
  if (trackIdentifier) {
    const key = `${guildId}:${trackIdentifier}`;
    voteSkipMap.delete(key);
  } else {
    // Clear all votes for this guild
    for (const key of voteSkipMap.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        voteSkipMap.delete(key);
      }
    }
  }
}

/**
 * Get current vote count for a track
 */
export function getVoteSkipCount(
  guildId: string,
  trackIdentifier: string
): { votes: number; required: number } | null {
  const key = `${guildId}:${trackIdentifier}`;
  const data = voteSkipMap.get(key);

  if (!data) {
    return null;
  }

  return {
    votes: data.votes.size,
    required: data.requiredVotes,
  };
}

/**
 * Check if user has already voted
 */
export function hasUserVoted(guildId: string, trackIdentifier: string, userId: string): boolean {
  const key = `${guildId}:${trackIdentifier}`;
  const data = voteSkipMap.get(key);

  if (!data) {
    return false;
  }

  return data.votes.has(userId);
}
