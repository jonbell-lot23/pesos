import { NextResponse } from "next/server";
import pg from "pg";
import RssParser from "rss-parser";

const parser = new RssParser();

type UpdateStatus = {
  isRunning: boolean;
  status: "idle" | "running" | "completed" | "failed";
  lastError: string | null;
  lastRun: Date | null;
  logs: string[];
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
    logs: [],
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

const BATCH_SIZE = 5;

function addLog(message: string) {
  if (global.updateStatus) {
    global.updateStatus.logs.push(`${new Date().toISOString()} - ${message}`);
    // Keep only last 1000 logs
    if (global.updateStatus.logs.length > 1000) {
      global.updateStatus.logs = global.updateStatus.logs.slice(-1000);
    }
  }
  console.log(message);
}

export async function GET() {
  // Check if another update is already running
  if (global.updateStatus?.isRunning) {
    return NextResponse.json(
      {
        error: "Update already in progress",
        lastError: global.updateStatus.lastError,
        lastRun: global.updateStatus.lastRun,
        logs: global.updateStatus.logs,
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
    global.updateStatus.logs = [];
  }

  // Create database client
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    addLog("Connecting to database...");
    await client.connect();
    addLog("Connected successfully!");

    // Get all sources with their users
    addLog("Fetching sources from database...");
    const sourcesResult = await client.query(`
      SELECT s.*, array_agg(us."userId") as user_ids 
      FROM "pesos_Sources" s 
      LEFT JOIN "pesos_UserSources" us ON s.id = us."sourceId" 
      GROUP BY s.id
    `);
    const sources = sourcesResult.rows;
    addLog(`Found ${sources.length} sources to process`);

    // Process sources in batches
    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      const batch = sources.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(sources.length / BATCH_SIZE);

      addLog(`Processing batch ${batchNum} of ${totalBatches}`);

      // Process each batch in parallel
      await Promise.all(
        batch.map(async (source) => {
          const userIds = source.user_ids.filter((id: string) => id != null);

          if (!userIds.length) {
            addLog(`Skipping ${source.url} - no users associated`);
            stats.skippedFeeds.push(source.url);
            return;
          }

          addLog(`Processing ${source.url} (${userIds.length} users)`);

          try {
            // Fetch feed
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
            addLog(`Found ${parsedFeed.items.length} items in ${source.url}`);

            const feedStats: FeedStats = {
              url: source.url,
              newItemsCount: 0,
              totalItemsProcessed: 0,
            };

            // Process items
            const feedItems = parsedFeed.items.slice(0, 50);
            feedStats.totalItemsProcessed = feedItems.length;

            for (const userId of userIds) {
              // Get existing items
              const existingResult = await client.query(
                `SELECT url FROM "pesos_items" WHERE "userId" = $1 AND "sourceId" = $2 AND url = ANY($3)`,
                [
                  userId,
                  source.id,
                  feedItems.map((item) => item.link).filter(Boolean),
                ]
              );

              const existingUrls = new Set(
                existingResult.rows.map((row) => row.url)
              );

              // Filter new items
              const newItems = feedItems
                .filter(
                  (item): item is typeof item & { link: string } =>
                    item.link != null && !existingUrls.has(item.link)
                )
                .map((item) => ({
                  title: item.title || "•",
                  url: item.link,
                  description: item["content:encoded"] || item.content || "",
                  postdate: new Date(item.pubDate || item.date),
                  slug: Math.random().toString(36).substring(2, 15),
                  userId,
                  sourceId: source.id,
                }));

              if (newItems.length > 0) {
                addLog(
                  `Adding ${newItems.length} new items from ${source.url}`
                );

                // Insert new items
                const values = newItems
                  .map(
                    (item) => `(
                    '${item.title.replace(/'/g, "''")}',
                    '${item.url.replace(/'/g, "''")}',
                    '${item.description.replace(/'/g, "''")}',
                    '${item.postdate.toISOString()}',
                    '${item.slug}',
                    '${item.userId}',
                    '${item.sourceId}'
                  )`
                  )
                  .join(",");

                await client.query(`
                  INSERT INTO "pesos_items" (
                    "title", "url", "description", 
                    "postdate", "slug", "userId", "sourceId"
                  )
                  VALUES ${values}
                  ON CONFLICT DO NOTHING
                `);

                feedStats.newItemsCount += newItems.length;
              }
            }

            if (feedStats.newItemsCount > 0) {
              stats.successfulFeeds.push(feedStats);
              stats.totalNewItems += feedStats.newItemsCount;
            }
            stats.totalFeedsProcessed++;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            addLog(`Error processing ${source.url}: ${errorMessage}`);
            stats.failedFeeds.push({
              url: source.url,
              newItemsCount: 0,
              totalItemsProcessed: 0,
              error: errorMessage,
            });
            stats.totalErrors++;

            if (global.updateStatus) {
              global.updateStatus.lastError = errorMessage;
            }
          }
        })
      );

      // Add a small delay between batches
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

    if (stats.successfulFeeds.length > 0) {
      message += `Feeds with new items:\n`;
      stats.successfulFeeds
        .sort((a, b) => b.newItemsCount - a.newItemsCount)
        .forEach((feed) => {
          message += `• ${feed.url}: ${feed.newItemsCount} new items (processed ${feed.totalItemsProcessed} items)\n`;
        });
      message += `\n`;
    }

    if (stats.failedFeeds.length > 0) {
      message += `Failed feeds:\n`;
      stats.failedFeeds.forEach((feed) => {
        message += `• ${feed.url}: ${feed.error}\n`;
      });
      message += `\n`;
    }

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

    addLog(message);

    return NextResponse.json({
      success: true,
      message,
      stats,
      logs: global.updateStatus?.logs || [],
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    addLog(`Fatal error: ${errorMessage}`);

    // Update global status on error
    if (global.updateStatus) {
      global.updateStatus.isRunning = false;
      global.updateStatus.status = "failed";
      global.updateStatus.lastError = errorMessage;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        logs: global.updateStatus?.logs || [],
      },
      { status: 500 }
    );
  } finally {
    try {
      addLog("Disconnecting from database...");
      await client.end();
      addLog("Successfully disconnected from database");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      addLog(`Error disconnecting from database: ${errorMessage}`);
    }
  }
}
