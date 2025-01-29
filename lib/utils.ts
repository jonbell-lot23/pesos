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

  const averageLengthOfPosts =
    items.reduce(
      (sum, item) => sum + (item.content?.split(/\s+/).length || 0),
      0
    ) / totalPosts;

  return {
    totalPosts,
    timeSinceLastPost,
    averageTimeBetweenPosts,
    medianTimeBetweenPosts,
    averageLengthOfPosts,
  };
}
