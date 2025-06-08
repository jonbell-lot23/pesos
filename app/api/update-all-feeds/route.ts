import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import pg from "pg";
import RssParser from "rss-parser";
import prisma from "@/lib/prismadb";
import { ActivityLogger } from "@/lib/activity-logger";

const parser = new RssParser();

export const dynamic = "force-dynamic";

type UpdateStatus = {
  isRunning: boolean;
  status: "idle" | "running" | "completed" | "failed";
  lastError: string | null;
  lastRun: Date | null;
  logs: string[];
  failedFeeds: Record<string, { url: string; failedAt: Date; error: string }>;
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
    failedFeeds: {},
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

export async function GET(request: Request) {
  // Get the clearFailedFeeds parameter if present
  const { searchParams } = new URL(request.url);
  const shouldClearFailedFeeds =
    searchParams.get("clearFailedFeeds") === "true";
  
  // Determine how this was triggered
  const triggeredBy = searchParams.get("triggered_by") || "manual";

  // Clear failed feeds if requested
  if (shouldClearFailedFeeds && global.updateStatus) {
    addLog("Clearing all failed feeds");
    global.updateStatus.failedFeeds = {};
  }

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

  // Log that system update is starting
  await ActivityLogger.logSystemUpdate(
    "system_update_started",
    {
      triggeredBy
    },
    true
  );

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
    addLog("Fetching active sources from database...");
    const sourcesResult = await client.query(`
      SELECT s.*, array_agg(us."userId") as user_ids 
      FROM "pesos_Sources" s 
      LEFT JOIN "pesos_UserSources" us ON s.id = us."sourceId" 
      WHERE s.active = 'Y'
      GROUP BY s.id
    `);
    const sources = sourcesResult.rows;
    addLog(`Found ${sources.length} sources to process`);

    // Track which failed feeds we're skipping in this run
    const skippedFailedFeeds: string[] = [];

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

          // Skip sources that failed in the last 24 hours
          if (global.updateStatus?.failedFeeds[source.url]) {
            const failedInfo = global.updateStatus.failedFeeds[source.url];
            const failedAt = new Date(failedInfo.failedAt);
            const hoursSinceFail =
              (new Date().getTime() - failedAt.getTime()) / (1000 * 60 * 60);

            if (hoursSinceFail < 24) {
              addLog(
                `Skipping ${source.url} - failed ${Math.floor(
                  hoursSinceFail
                )} hour(s) ago with error: ${failedInfo.error}`
              );
              stats.skippedFeeds.push(source.url);
              skippedFailedFeeds.push(source.url);
              return;
            } else {
              // Failed more than 24 hours ago, let's try again and remove from failed feeds
              delete global.updateStatus.failedFeeds[source.url];
              addLog(
                `Retrying ${source.url} after previous failure (>24h ago)`
              );
            }
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

            // Record this feed as failed so we can skip it next time
            if (global.updateStatus) {
              global.updateStatus.lastError = errorMessage;
              global.updateStatus.failedFeeds[source.url] = {
                url: source.url,
                failedAt: new Date(),
                error: errorMessage,
              };
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

    // Check how many feeds are inactive
    let inactiveCount = 0;
    try {
      const inactiveResult = await client.query(`
        SELECT COUNT(*) as count FROM "pesos_Sources" WHERE active = 'N'
      `);
      inactiveCount = parseInt(inactiveResult.rows[0].count, 10) || 0;
      addLog(`Found ${inactiveCount} inactive sources that were skipped`);
    } catch (error) {
      addLog(
        `Error checking inactive feeds: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Count feeds skipped due to previous failures
    const skippedDueToFailures = skippedFailedFeeds
      ? skippedFailedFeeds.length
      : 0;
    const skippedNoUsers = stats.skippedFeeds.length - skippedDueToFailures;

    message += `Summary:\n`;
    message += `• Total new items: ${stats.totalNewItems}\n`;
    message += `• Total feeds processed: ${stats.totalFeedsProcessed}\n`;
    message += `• Failed feeds: ${stats.totalErrors}\n`;
    message += `• Skipped feeds (no users): ${skippedNoUsers}\n`;
    if (skippedDueToFailures > 0) {
      message += `• Skipped feeds (previous failures): ${skippedDueToFailures}\n`;
    }
    if (inactiveCount > 0) {
      message += `• Skipped feeds (inactive): ${inactiveCount}\n`;
    }
    message += `• Execution time: ${(stats.executionTimeMs / 1000).toFixed(
      2
    )}s\n`;

    addLog(message);

    // Log successful system update completion
    await ActivityLogger.logSystemUpdate(
      "system_update_completed",
      {
        totalFeeds: sources.length,
        processedFeeds: stats.totalFeedsProcessed,
        failedFeeds: stats.totalErrors,
        newItems: stats.totalNewItems,
        executionTimeMs: stats.executionTimeMs,
        triggeredBy,
        summary: message
      },
      true
    );

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

    // Log failed system update
    await ActivityLogger.logSystemUpdate(
      "system_update_failed",
      {
        triggeredBy,
        executionTimeMs: Date.now() - startTime,
        errors: { error: errorMessage }
      },
      false,
      errorMessage
    );

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

export async function POST(request: NextRequest) {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json(
      { message: "Not available during build" },
      { status: 503 }
    );
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;

    const body = await request.json();
    const { sourceIds } = body;

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: "sourceIds array is required" },
        { status: 400 }
      );
    }

    // Fetch sources to update
    const sources = await prisma.pesos_Sources.findMany({
      where: {
        id: { in: sourceIds },
      },
    });

    // Update all feeds (implementation would depend on your feed update logic)
    const results = [];
    for (const source of sources) {
      results.push({
        id: source.id,
        url: source.url,
        status: "updated",
      });
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      results,
    });
  } catch (error) {
    console.error("Error updating feeds:", error);
    return NextResponse.json(
      { error: "Failed to update feeds" },
      { status: 500 }
    );
  }
}
