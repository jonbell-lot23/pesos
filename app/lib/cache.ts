import { revalidatePath } from "next/cache";

// Cache durations in seconds
export const STATS_CACHE_DURATION = 60; // 1 minute
export const POSTS_CACHE_DURATION = 30; // 30 seconds

// In-memory caches
export const statsCache = new Map<string, { data: any; timestamp: number }>();
export const postsCache = new Map<string, { data: any; timestamp: number }>();

// Generate cache key for posts
export function getPostsCacheKey(
  userId: string,
  offset: number,
  limit: number,
  getAll: boolean
) {
  return `${userId}:${offset}:${limit}:${getAll}`;
}

// Clear stats cache for a user
export function clearStatsCache(userId: string) {
  statsCache.delete(userId);
  revalidatePath("/api/database-stats");
}

// Clear posts cache for a user
export function clearPostsCache(userId: string) {
  Array.from(postsCache.keys()).forEach((key) => {
    if (key.startsWith(userId)) {
      postsCache.delete(key);
    }
  });
  revalidatePath("/api/getPosts");
}
