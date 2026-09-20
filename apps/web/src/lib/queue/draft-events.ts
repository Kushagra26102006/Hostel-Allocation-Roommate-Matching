import { getRedis } from "@/lib/redis.js";

export interface ReviewerPresence {
  userId: string;
  name: string;
  email: string;
  floor: number;
  updatedAt: number;
}

export interface DraftEvent {
  type: "presence" | "override" | "status_change";
  draftId: string;
  data: unknown;
  timestamp: string;
}

export function getDraftEventChannel(draftId: string): string {
  return `draft:${draftId}:events`;
}

export function getDraftPresenceKey(draftId: string): string {
  return `draft:${draftId}:presence`;
}

/**
 * Report reviewer presence for a floor in a draft (stored with 60s TTL).
 */
export async function updateReviewerPresence(
  draftId: string,
  presence: ReviewerPresence,
): Promise<ReviewerPresence[]> {
  const redis = getRedis();
  const key = getDraftPresenceKey(draftId);

  if (redis) {
    try {
      await redis.hset(key, presence.userId, JSON.stringify(presence));
      await redis.expire(key, 120);

      // Fetch all active presence in the draft
      const all = await redis.hgetall(key);
      const now = Date.now();
      const activeList: ReviewerPresence[] = [];

      for (const [uid, json] of Object.entries(all)) {
        try {
          const parsed = JSON.parse(json) as ReviewerPresence;
          // Keep active within last 90 seconds
          if (now - parsed.updatedAt < 90000) {
            activeList.push(parsed);
          } else {
            await redis.hdel(key, uid);
          }
        } catch {
          // ignore corrupted entry
        }
      }

      // Publish presence update event
      const event: DraftEvent = {
        type: "presence",
        draftId,
        data: { reviewers: activeList },
        timestamp: new Date().toISOString(),
      };
      await redis.publish(getDraftEventChannel(draftId), JSON.stringify(event));

      return activeList;
    } catch {
      // Fallback
    }
  }

  return [presence];
}

/**
 * Broadcast a live notification to reviewers (e.g. bed override or status change).
 */
export async function broadcastDraftEvent(draftId: string, event: DraftEvent): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.publish(getDraftEventChannel(draftId), JSON.stringify(event));
    } catch {
      // Fallback
    }
  }
}
