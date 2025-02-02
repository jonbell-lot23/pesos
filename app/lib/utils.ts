export function calculateMetrics(feedItems: FeedItem[]) {
  let wordCount = feedItems.reduce((acc, item) => {
    // Use an empty string if item.content is nullish; otherwise, force it to a string.
    const safeContent = String(item.content || "");
    return acc + safeContent.split(/\s+/).filter(Boolean).length;
  }, 0);
  const totalPosts = feedItems.length;
  return { wordCount, totalPosts };
}
