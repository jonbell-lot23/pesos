import "dotenv/config";
import RssParser from "rss-parser";
import pg from "pg";
const { Client } = pg;

// Enable detailed Node.js debugging
process.env.DEBUG = "*";

// Force Node to show unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("🚨 UNHANDLED REJECTION:", err);
  console.error("Stack trace:", err.stack);
  process.exit(1);
});

// Force Node to show uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("🚨 UNCAUGHT EXCEPTION:", err);
  console.error("Stack trace:", err.stack);
  process.exit(1);
});

console.log("[Feed Update] Initializing...");
console.log("[Feed Update] Node version:", process.version);
console.log("[Feed Update] Current directory:", process.cwd());
console.log("[Feed Update] Environment variables present:", {
  DATABASE_URL: !!process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
});

const parser = new RssParser();
const BATCH_SIZE = 5;

// Create a new client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function updateFeeds() {
  console.log("\n[Feed Update] Starting feed update process");

  try {
    // Connect to database
    console.log("[Feed Update] Connecting to database...");
    await client.connect();
    console.log("[Feed Update] Connected successfully!");

    // Get all sources with their users
    console.log("[Feed Update] Fetching sources from database...");
    const sourcesResult = await client.query(`
      SELECT s.*, array_agg(us."userId") as user_ids 
      FROM "pesos_Sources" s 
      LEFT JOIN "pesos_UserSources" us ON s.id = us."sourceId" 
      WHERE s.active = 'Y'
      GROUP BY s.id
    `);
    const sources = sourcesResult.rows;
    console.log(`[Feed Update] Found ${sources.length} active sources`);

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
          const userIds = source.user_ids.filter((id) => id != null);

          if (!userIds.length) {
            console.log(
              `[Feed Update] Skipping ${source.url} - no users associated`
            );
            return;
          }

          console.log(
            `[Feed Update] ${source.url} has ${userIds.length} users`
          );

          try {
            // Fetch feed
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

            // Process items
            const feedItems = parsedFeed.items.slice(0, 50);

            for (const userId of userIds) {
              console.log(
                `[Feed Update] Processing items for user ${userId}...`
              );

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
              console.log(
                `[Feed Update] Found ${existingUrls.size} existing items`
              );

              // Filter new items
              const newItems = feedItems
                .filter((item) => item.link && !existingUrls.has(item.link))
                .map((item) => ({
                  title: item.title || "•",
                  url: item.link,
                  description: item["content:encoded"] || item.content || "",
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

                // Insert new items
                const values = newItems
                  .map((item) => {
                    // Validate the date before using toISOString to prevent RangeError
                    let dateString = "";
                    try {
                      // Check if date is valid
                      if (!isNaN(item.postdate.getTime())) {
                        dateString = item.postdate.toISOString();
                      } else {
                        // Use current date as fallback
                        console.log(
                          `[Feed Update] Invalid date detected, using current date as fallback`
                        );
                        dateString = new Date().toISOString();
                      }
                    } catch (e) {
                      console.log(
                        `[Feed Update] Error processing date: ${e.message}, using current date`
                      );
                      dateString = new Date().toISOString();
                    }

                    return `(
                    '${item.title.replace(/'/g, "''")}',
                    '${item.url.replace(/'/g, "''")}',
                    '${item.description.replace(/'/g, "''")}',
                    '${dateString}',
                    '${item.slug}',
                    '${item.userId}',
                    '${item.sourceId}'
                  )`;
                  })
                  .join(",");

                await client.query(`
                  INSERT INTO "pesos_items" (
                    "title", "url", "description", 
                    "postdate", "slug", "userId", "sourceId"
                  )
                  VALUES ${values}
                  ON CONFLICT DO NOTHING
                `);

                console.log(`[Feed Update] Successfully inserted items`);
              }
            }

            console.log(`[Feed Update] Completed processing ${source.url}`);
          } catch (error) {
            console.error(
              `[Feed Update] Error processing ${source.url}:`,
              error
            );
          }
        })
      );

      // Add a small delay between batches
      if (i + BATCH_SIZE < sources.length) {
        console.log("[Feed Update] Adding delay between batches...");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log("\n[Feed Update] Complete!\n");
  } catch (error) {
    console.error("[Feed Update] Fatal error:", error);
    throw error;
  } finally {
    try {
      console.log("[Feed Update] Disconnecting from database...");
      await client.end();
      console.log("[Feed Update] Successfully disconnected from database");
    } catch (error) {
      console.error("[Feed Update] Error disconnecting from database:", error);
    }
  }
}

// Insert forcedUpdate function before running the update
async function forcedUpdate(forceSlug) {
  console.log(`[Feed Update] Forcing update for post with slug ${forceSlug}`);

  // Fetch the post by slug
  const itemResult = await client.query(
    `SELECT * FROM "pesos_items" WHERE slug = $1`,
    [forceSlug]
  );
  if (itemResult.rows.length === 0) {
    console.error(`[Feed Update] No item found with slug ${forceSlug}.`);
    return;
  }
  const item = itemResult.rows[0];
  console.log(
    `[Feed Update] Found post. URL: ${item.url}, sourceId: ${item.sourceId}`
  );

  // Fetch source info
  const sourceResult = await client.query(
    `SELECT * FROM "pesos_Sources" WHERE id = $1 AND active = 'Y'`,
    [item.sourceId]
  );
  if (sourceResult.rows.length === 0) {
    console.error(
      `[Feed Update] Active source not found for id ${item.sourceId}.`
    );
    return;
  }
  const source = sourceResult.rows[0];
  console.log(`[Feed Update] Fetching feed from source: ${source.url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const response = await fetch(source.url, {
    signal: controller.signal,
    headers: { "User-Agent": "PESOS RSS Aggregator/1.0" },
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const rssString = await response.text();
  const parsedFeed = await parser.parseString(rssString);
  console.log(
    `[Feed Update] Feed fetched. ${parsedFeed.items.length} items found.`
  );

  // Find the matching feed item based on the original post's URL
  const matchingItem = parsedFeed.items.find(
    (feedItem) => feedItem.link === item.url
  );
  if (!matchingItem) {
    console.error(
      `[Feed Update] Could not find matching feed item for URL ${item.url}. Unable to force update.`
    );
    return;
  }

  const updatedTitle = matchingItem.title || "•";
  const updatedUrl = matchingItem.link;
  const updatedDescription =
    matchingItem["content:encoded"] || matchingItem.content || "";
  const updatedPostdate = new Date(matchingItem.pubDate || matchingItem.date);

  let dateString;
  try {
    if (!isNaN(updatedPostdate.getTime())) {
      dateString = updatedPostdate.toISOString();
    } else {
      console.log(
        `[Feed Update] Invalid date in forced update, using current date`
      );
      dateString = new Date().toISOString();
    }
  } catch (e) {
    console.log(
      `[Feed Update] Error processing date in forced update: ${e.message}`
    );
    dateString = new Date().toISOString();
  }

  console.log(`[Feed Update] Updating the post with new values.`);
  await client.query(
    `
    UPDATE "pesos_items"
    SET "title" = $1,
        "url" = $2,
        "description" = $3,
        "postdate" = $4
    WHERE slug = $5
  `,
    [updatedTitle, updatedUrl, updatedDescription, dateString, forceSlug]
  );

  console.log(`[Feed Update] Successfully forced update for slug ${forceSlug}`);
}

// Run the update
console.log("[Feed Update] Script started");

// Updated run function to support forced updates
const run = async () => {
  const forceSlugArg = process.argv.find((arg) => arg.startsWith("--force="));
  if (forceSlugArg) {
    const forceSlug = forceSlugArg.split("=")[1];
    console.log("[Feed Update] Running forced update for slug:", forceSlug);
    try {
      console.log("[Feed Update] Connecting to database...");
      await client.connect();
      await forcedUpdate(forceSlug);
      console.log("[Feed Update] Forced update complete");
      process.exit(0);
    } catch (error) {
      console.error("[Feed Update] Forced update failed:", error);
      process.exit(1);
    } finally {
      console.log("[Feed Update] Disconnecting from database...");
      await client.end();
      console.log("[Feed Update] Successfully disconnected from database");
    }
  } else {
    try {
      await updateFeeds();
    } catch (error) {
      console.error("[Feed Update] Script failed:", error);
      process.exit(1);
    }
  }
};

run();
