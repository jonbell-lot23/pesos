import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  source?: string;
}

interface PesosItem {
  id: number;
  title: string;
  url: string;
  userId: string;
  [key: string]: any;
}

export function calculateMetrics(items: FeedItem[]) {
  const totalPosts = items.length;

  const now = new Date();
  const lastPostDate = new Date(items[0]?.pubDate || now);
  const timeSinceLastPost = Math.abs(now.getTime() - lastPostDate.getTime());

  const timeDiffs = items.slice(1).map((item, index) => {
    const currentDate = new Date(item.pubDate);
    const previousDate = new Date(items[index].pubDate);
    return Math.abs(currentDate.getTime() - previousDate.getTime());
  });

  const averageTimeBetweenPosts =
    timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length || 0;

  const medianTimeBetweenPosts = (() => {
    const sortedDiffs = [...timeDiffs].sort((a, b) => a - b);
    const mid = Math.floor(sortedDiffs.length / 2);
    return sortedDiffs.length % 2 !== 0
      ? sortedDiffs[mid]
      : (sortedDiffs[mid - 1] + sortedDiffs[mid]) / 2;
  })();

  const totalLength = items.reduce((sum, item) => {
    const len = item.content ? item.content.length : item.title.length;
    return sum + len;
  }, 0);
  const averageLength =
    totalPosts > 0 ? Math.round(totalLength / totalPosts) : 0;

  return {
    totalPosts,
    timeSinceLastPost,
    averageTimeBetweenPosts,
    medianTimeBetweenPosts,
    averageLengthOfPosts: averageLength,
  };
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUsername(username: string): UsernameValidationResult {
  // Trim whitespace
  const trimmedUsername = username.trim();

  // Check length
  if (trimmedUsername.length < 3) {
    return {
      isValid: false,
      error: "Username must be at least 3 characters long",
    };
  }
  if (trimmedUsername.length > 28) {
    return {
      isValid: false,
      error: "Username must be no more than 28 characters long",
    };
  }

  // Check for valid characters (alphanumeric and underscore only)
  const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!validUsernameRegex.test(trimmedUsername)) {
    return {
      isValid: false,
      error: "Username can only contain letters, numbers, and underscores",
    };
  }

  return { isValid: true };
}

export function deduplicateItems(items: PesosItem[]): PesosItem[] {
  const seen = new Map<string, PesosItem>();

  for (const item of items) {
    const key = `${item.title}|${item.url}|${item.userId}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }

  return Array.from(seen.values());
}
