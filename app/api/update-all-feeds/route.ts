import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import RssParser from "rss-parser";

const parser = new RssParser();

type UpdateStatus = {
  isRunning: boolean;
  status: "idle" | "running" | "completed" | "failed";
  lastError: string | null;
  lastRun: Date | null;
};

declare global {
  var updateStatus: UpdateStatus | undefined;
}

// Initialize global state if not exists
if (!global.updateStatus) {
  global.updateStatus = {
    isRunning: false,
    status: "idle",
    lastError: null,
    lastRun: null,
  };
}

interface FeedStats {
  url: string;
  newItemsCount: number;
  totalItemsProcessed: number;
  error?: string;
}

interface UpdateStats {
  successfulFeeds: FeedStats[];
  failedFeeds: FeedStats[];
  skippedFeeds: string[];
  totalNewItems: number;
  totalFeedsProcessed: number;
  totalErrors: number;
  executionTimeMs: number;
}

const BATCH_SIZE = 5; // Process 5 feeds at a time to avoid overwhelming the connection pool

export async function GET() {
  // Check if another update is already running
  if (global.updateStatus?.isRunning) {
    return NextResponse.json(
      {
        error: "Update already in progress",
        lastError: global.updateStatus.lastError,
        lastRun: global.updateStatus.lastRun,
      },
      { status: 409 }
    );
  }

  const startTime = Date.now();
  const stats: UpdateStats = {
    successfulFeeds: [],
    failedFeeds: [],
    skippedFeeds: [],
    totalNewItems: 0,
    totalFeedsProcessed: 0,
    totalErrors: 0,
    executionTimeMs: 0,
  };

  if (global.updateStatus) {
    global.updateStatus.isRunning = true;
    global.updateStatus.status = "running";
    global.updateStatus.lastError = null;
  }

  try {
    // Get all unique sources
    const sources = await prisma.pesos_Sources.findMany({
      include: {
        users: true, // Include the user relationships
      },
    });

    // Process sources in batches
    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      const batch = sources.slice(i, i + BATCH_SIZE);

      // Process each batch in parallel
      await Promise.all(
        batch.map(async (source) => {
          if (!source.users.length) {
            stats.skippedFeeds.push(source.url);
            return;
          }

          try {
            // Fetch with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(source.url, {
              signal: controller.signal,
              headers: {
                "User-Agent": "PESOS RSS Aggregator/1.0",
              },
            });
            clearTimeout(timeout);

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const rssString = await response.text();
            const parsedFeed = await parser.parseString(rssString);

            // Process items in transaction to ensure atomicity
            const feedStats = await prisma.$transaction(
              async (tx) => {
                const stats: FeedStats = {
                  url: source.url,
                  newItemsCount: 0,
                  totalItemsProcessed: 0,
                };

                // Get all user IDs for this source
                const userIds = source.users.map((u) => u.userId);

                // Get potential new URLs from the feed
                const feedItems = parsedFeed.items.slice(0, 50); // Limit to 50 most recent items
                stats.totalItemsProcessed = feedItems.length;

                // For each user of this source, process their items
                for (const userId of userIds) {
                  // Check which items already exist for this user
                  const existingItems = await tx.pesos_items.findMany({
                    where: {
                      userId,
                      sourceId: source.id,
                      url: {
                        in: feedItems
                          .map((item) => item.link)
                          .filter(Boolean) as string[],
                      },
                    },
                    select: { url: true },
                  });

                  const existingUrls = new Set(
                    existingItems.map((item) => item.url)
                  );

                  // Prepare new items for this user
                  const newItems = feedItems
                    .filter((item) => item.link && !existingUrls.has(item.link))
                    .map((item) => ({
                      title: item.title || "•",
                      url: item.link ?? "",
                      description:
                        item["content:encoded"] || item.content || "",
                      postdate: new Date(item.pubDate || item.date),
                      slug: Math.random().toString(36).substring(2, 15),
                      userId,
                      sourceId: source.id,
                    }));

                  if (newItems.length > 0) {
                    // Store new items
                    await tx.pesos_items.createMany({
                      data: newItems,
                      skipDuplicates: true,
                    });
                    stats.newItemsCount += newItems.length;
                  }
                }

                return stats;
              },
              {
                maxWait: 5000,
                timeout: 30000,
              }
            );

            if (feedStats.newItemsCount > 0) {
              stats.successfulFeeds.push(feedStats);
              stats.totalNewItems += feedStats.newItemsCount;
            }
            stats.totalFeedsProcessed++;
          } catch (error) {
            stats.failedFeeds.push({
              url: source.url,
              newItemsCount: 0,
              totalItemsProcessed: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            stats.totalErrors++;

            // Store the last error but continue processing
            if (global.updateStatus && error instanceof Error) {
              global.updateStatus.lastError = error.message;
            }
          }
        })
      );

      // Add a small delay between batches to prevent overwhelming the connection pool
      if (i + BATCH_SIZE < sources.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    stats.executionTimeMs = Date.now() - startTime;

    // Update global status
    if (global.updateStatus) {
      global.updateStatus.isRunning = false;
      global.updateStatus.status = "completed";
      global.updateStatus.lastRun = new Date();
    }

    // Format the response message
    let message = `Feed Update Complete\n\n`;

    // Successful feeds with new items
    if (stats.successfulFeeds.length > 0) {
      message += `Feeds with new items:\n`;
      stats.successfulFeeds
        .sort((a, b) => b.newItemsCount - a.newItemsCount)
        .forEach((feed) => {
          message += `• ${feed.url}: ${feed.newItemsCount} new items (processed ${feed.totalItemsProcessed} items)\n`;
        });
      message += `\n`;
    }

    // Failed feeds
    if (stats.failedFeeds.length > 0) {
      message += `Failed feeds:\n`;
      stats.failedFeeds.forEach((feed) => {
        message += `• ${feed.url}: ${feed.error}\n`;
      });
      message += `\n`;
    }

    // Summary
    const successfulWithoutNewItems =
      stats.totalFeedsProcessed -
      stats.successfulFeeds.length -
      stats.failedFeeds.length;
    if (successfulWithoutNewItems > 0) {
      message += `${successfulWithoutNewItems} other feeds checked (no new items or problems)\n\n`;
    }

    message += `Summary:\n`;
    message += `• Total new items: ${stats.totalNewItems}\n`;
    message += `• Total feeds processed: ${stats.totalFeedsProcessed}\n`;
    message += `• Failed feeds: ${stats.totalErrors}\n`;
    message += `• Skipped feeds: ${stats.skippedFeeds.length}\n`;
    message += `• Execution time: ${(stats.executionTimeMs / 1000).toFixed(
      2
    )}s\n`;

    return NextResponse.json({
      success: true,
      message,
      stats,
    });
  } catch (error) {
    // Update global status on error
    if (global.updateStatus) {
      global.updateStatus.isRunning = false;
      global.updateStatus.status = "failed";
      if (error instanceof Error) {
        global.updateStatus.lastError = error.message;
      }
    }

    console.error("Error in feed update:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
