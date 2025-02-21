import { PrismaClient } from "@prisma/client";
import RssParser from "rss-parser";

console.log("[Feed Update] Initializing...");

const prisma = new PrismaClient({
  log: ["query", "warn", "error"],
});
const parser = new RssParser();
const BATCH_SIZE = 5;

async function updateFeeds() {
  console.log("[Feed Update] Starting feed update process");
  console.log("[Feed Update] Connecting to database...");

  const startTime = Date.now();
  const stats = {
    successfulFeeds: [],
    failedFeeds: [],
    skippedFeeds: [],
    totalNewItems: 0,
    totalFeedsProcessed: 0,
    totalErrors: 0,
  };

  try {
    // Test database connection
    try {
      await prisma.$connect();
      console.log("[Feed Update] Successfully connected to database");
    } catch (error) {
      console.error("[Feed Update] Database connection error:", error);
      throw error;
    }

    // Get all unique sources
    console.log("[Feed Update] Fetching sources from database...");
    let sources;
    try {
      sources = await prisma.pesos_Sources.findMany({
        include: {
          users: true,
        },
      });
      console.log("[Feed Update] Database query completed");
    } catch (error) {
      console.error("[Feed Update] Error fetching sources:", error);
      throw error;
    }

    if (!sources) {
      console.log("[Feed Update] No sources returned from database!");
      return;
    }

    if (sources.length === 0) {
      console.log("[Feed Update] No sources found in database!");
      return;
    }

    console.log(`[Feed Update] Found ${sources.length} sources to process`);
    console.log("[Feed Update] Sources:", sources.map((s) => s.url).join(", "));

    // Process sources in batches
    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      const batch = sources.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(sources.length / BATCH_SIZE);

      console.log(
        `\n[Feed Update] Processing batch ${batchNum} of ${totalBatches}`
      );
      console.log(
        "[Feed Update] Batch URLs:",
        batch.map((s) => s.url).join(", ")
      );

      // Process each batch in parallel
      await Promise.all(
        batch.map(async (source) => {
          console.log(`\n[Feed Update] Processing source: ${source.url}`);

          if (!source.users.length) {
            console.log(
              `[Feed Update] Skipping ${source.url} - no users associated`
            );
            stats.skippedFeeds.push(source.url);
            return;
          }

          console.log(
            `[Feed Update] ${source.url} has ${source.users.length} users`
          );

          try {
            // Fetch with timeout
            console.log(`[Feed Update] Fetching ${source.url}...`);
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

            console.log(`[Feed Update] Successfully fetched ${source.url}`);
            const rssString = await response.text();
            console.log(`[Feed Update] Parsing RSS feed from ${source.url}...`);
            const parsedFeed = await parser.parseString(rssString);
            console.log(
              `[Feed Update] Found ${parsedFeed.items.length} items in feed`
            );

            // Process items in transaction to ensure atomicity
            console.log(
              `[Feed Update] Starting database transaction for ${source.url}...`
            );
            const feedStats = await prisma.$transaction(
              async (tx) => {
                const stats = {
                  url: source.url,
                  newItemsCount: 0,
                  totalItemsProcessed: 0,
                };

                const userIds = source.users.map((u) => u.userId);
                const feedItems = parsedFeed.items.slice(0, 50);
                stats.totalItemsProcessed = feedItems.length;

                for (const userId of userIds) {
                  console.log(
                    `[Feed Update] Processing items for user ${userId}...`
                  );
                  const existingItems = await tx.pesos_items.findMany({
                    where: {
                      userId,
                      sourceId: source.id,
                      url: {
                        in: feedItems.map((item) => item.link).filter(Boolean),
                      },
                    },
                    select: { url: true },
                  });

                  const existingUrls = new Set(
                    existingItems.map((item) => item.url)
                  );
                  console.log(
                    `[Feed Update] Found ${existingUrls.size} existing items`
                  );

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

                  console.log(
                    `[Feed Update] Found ${newItems.length} new items to add`
                  );

                  if (newItems.length > 0) {
                    console.log(
                      `[Feed Update] Inserting ${newItems.length} new items...`
                    );
                    await tx.pesos_items.createMany({
                      data: newItems,
                      skipDuplicates: true,
                    });
                    stats.newItemsCount += newItems.length;
                    console.log(`[Feed Update] Successfully inserted items`);
                  }
                }

                return stats;
              },
              {
                maxWait: 5000,
                timeout: 30000,
              }
            );

            console.log(`[Feed Update] Completed processing ${source.url}`);
            if (feedStats.newItemsCount > 0) {
              stats.successfulFeeds.push(feedStats);
              stats.totalNewItems += feedStats.newItemsCount;
              console.log(
                `[Feed Update] Added ${feedStats.newItemsCount} new items from ${source.url}`
              );
            } else {
              console.log(`[Feed Update] No new items from ${source.url}`);
            }
            stats.totalFeedsProcessed++;
          } catch (error) {
            console.error(
              `[Feed Update] Error processing ${source.url}:`,
              error
            );
            stats.failedFeeds.push({
              url: source.url,
              newItemsCount: 0,
              totalItemsProcessed: 0,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            stats.totalErrors++;
          }
        })
      );

      // Add a small delay between batches
      if (i + BATCH_SIZE < sources.length) {
        console.log("[Feed Update] Adding delay between batches...");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Format and log the results
    console.log("\n[Feed Update] Complete!\n");

    if (stats.successfulFeeds.length > 0) {
      console.log("Feeds with new items:");
      stats.successfulFeeds
        .sort((a, b) => b.newItemsCount - a.newItemsCount)
        .forEach((feed) => {
          console.log(
            `• ${feed.url}: ${feed.newItemsCount} new items (processed ${feed.totalItemsProcessed} items)`
          );
        });
      console.log();
    }

    if (stats.failedFeeds.length > 0) {
      console.log("Failed feeds:");
      stats.failedFeeds.forEach((feed) => {
        console.log(`• ${feed.url}: ${feed.error}`);
      });
      console.log();
    }

    const successfulWithoutNewItems =
      stats.totalFeedsProcessed -
      stats.successfulFeeds.length -
      stats.failedFeeds.length;
    if (successfulWithoutNewItems > 0) {
      console.log(
        `${successfulWithoutNewItems} other feeds checked (no new items or problems)\n`
      );
    }

    console.log("Summary:");
    console.log(`• Total new items: ${stats.totalNewItems}`);
    console.log(`• Total feeds processed: ${stats.totalFeedsProcessed}`);
    console.log(`• Failed feeds: ${stats.totalErrors}`);
    console.log(`• Skipped feeds: ${stats.skippedFeeds.length}`);
    console.log(
      `• Execution time: ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`
    );
  } catch (error) {
    console.error("[Feed Update] Fatal error:", error);
    throw error; // Let the outer promise handler deal with it
  } finally {
    try {
      console.log("[Feed Update] Disconnecting from database...");
      await prisma.$disconnect();
      console.log("[Feed Update] Successfully disconnected from database");
    } catch (error) {
      console.error("[Feed Update] Error disconnecting from database:", error);
    }
  }
}

// Run the update
console.log("[Feed Update] Script started");

// Make sure we properly handle the promise and keep the process alive
const run = async () => {
  try {
    await updateFeeds();
    console.log("[Feed Update] Script finished successfully");
    process.exit(0);
  } catch (error) {
    console.error("[Feed Update] Script failed:", error);
    process.exit(1);
  }
};

run();
