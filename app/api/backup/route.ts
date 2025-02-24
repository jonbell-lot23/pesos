import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";
import Parser from "rss-parser";
import { clearStatsCache } from "@/lib/cache";

const parser = new Parser();

type BackupStatus = {
  isRunning: boolean;
  status: "idle" | "running" | "completed" | "failed";
  lastError: string | null;
};

declare global {
  var backupStatus: BackupStatus | undefined;
}

// Initialize global state if not exists
if (!global.backupStatus) {
  global.backupStatus = {
    isRunning: false,
    status: "idle",
    lastError: null,
  };
}

const BATCH_SIZE = 5; // Process sources in batches of 5

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (global.backupStatus?.isRunning) {
      return NextResponse.json(
        {
          error: "Backup already in progress",
          lastError: global.backupStatus.lastError,
        },
        { status: 409 }
      );
    }

    if (global.backupStatus) {
      global.backupStatus.isRunning = true;
      global.backupStatus.status = "running";
      global.backupStatus.lastError = null;
    }

    try {
      // Get all sources for the user
      const userSources = await prisma.pesos_UserSources.findMany({
        where: { userId },
        include: {
          source: true,
        },
      });

      let totalNewItems = 0;

      // Process sources in batches
      for (let i = 0; i < userSources.length; i += BATCH_SIZE) {
        const batch = userSources.slice(i, i + BATCH_SIZE);

        // Process each batch in parallel
        await Promise.all(
          batch.map(async (userSource) => {
            try {
              // Fetch with timeout
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);

              const response = await fetch(userSource.source.url, {
                signal: controller.signal,
              });
              clearTimeout(timeout);

              if (!response.ok) return;

              const rssString = await response.text();
              const parsedFeed = await parser.parseString(rssString);

              // Process items in transaction to ensure atomicity
              const newItemsCount = await prisma.$transaction(
                async (tx) => {
                  // Get potential new URLs
                  const potentialUrls = parsedFeed.items
                    .slice(0, 15)
                    .map((item) => item.link)
                    .filter((url): url is string => !!url);

                  // Check which items already exist
                  const existingItems = await tx.pesos_items.findMany({
                    where: {
                      userId,
                      url: { in: potentialUrls },
                    },
                    select: { url: true },
                  });

                  const existingUrls = new Set(
                    existingItems.map((item) => item.url)
                  );

                  // Prepare new items for insertion
                  const newItems = parsedFeed.items
                    .slice(0, 15)
                    .filter((item) => item.link && !existingUrls.has(item.link))
                    .map((item) => ({
                      title: item.title || "•",
                      url: item.link ?? "",
                      description:
                        item["content:encoded"] || item.content || "",
                      postdate: new Date(item.pubDate || item.date),
                      slug: Math.random().toString(36).substring(2, 15),
                      userId,
                      sourceId: userSource.sourceId,
                    }));

                  if (newItems.length > 0) {
                    // Store new items
                    await tx.pesos_items.createMany({
                      data: newItems,
                      skipDuplicates: true,
                    });
                  }

                  return newItems.length;
                },
                {
                  maxWait: 5000,
                  timeout: 10000,
                }
              );

              totalNewItems += newItemsCount;
            } catch (error) {
              console.error(
                `Error processing source ${userSource.source.url}:`,
                error
              );
              // Store the last error but continue processing
              if (global.backupStatus && error instanceof Error) {
                global.backupStatus.lastError = error.message;
              }
            }
          })
        );

        // Add a small delay between batches
        if (i + BATCH_SIZE < userSources.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Create a backup record
      await prisma.backup.create({
        data: {
          storyCount: totalNewItems,
        },
      });

      // Clear stats cache to ensure fresh data
      clearStatsCache(userId);

      if (global.backupStatus) {
        global.backupStatus.isRunning = false;
        global.backupStatus.status = "completed";
      }

      return NextResponse.json({
        status: "completed",
        storyCount: totalNewItems,
        lastError: global.backupStatus?.lastError,
      });
    } catch (error) {
      if (global.backupStatus) {
        global.backupStatus.isRunning = false;
        global.backupStatus.status = "failed";
        if (error instanceof Error) {
          global.backupStatus.lastError = error.message;
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in backup:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to start backup",
        details: errorMessage,
        lastError: global.backupStatus?.lastError,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(global.backupStatus);
  } catch (error) {
    console.error("Error checking backup status:", error);
    return NextResponse.json(
      { error: "Failed to check backup status" },
      { status: 500 }
    );
  }
}
