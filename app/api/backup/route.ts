import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
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
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;
    const Parser = (await import("rss-parser")).default;
    const { clearStatsCache } = await import("@/lib/cache");

    const parser = new Parser();

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
      // Get all sources for the user (simplified to avoid relationship issues)
      const userSources = await prisma.pesos_UserSources.findMany({
        where: { userId },
      });

      const sourceIds = userSources.map((us) => us.sourceId);
      const sources = await prisma.pesos_Sources.findMany({
        where: { id: { in: sourceIds } },
      });

      let totalNewItems = 0;

      // Process sources in batches
      for (let i = 0; i < sources.length; i += BATCH_SIZE) {
        const batch = sources.slice(i, i + BATCH_SIZE);

        // Process each batch in parallel
        await Promise.all(
          batch.map(async (source) => {
            try {
              // Fetch with timeout
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);

              const response = await fetch(source.url, {
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
                      sourceId: source.id,
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
              console.error(`Error processing source ${source.url}:`, error);
              // Store the last error but continue processing
              if (global.backupStatus && error instanceof Error) {
                global.backupStatus.lastError = error.message;
              }
            }
          })
        );

        // Add a small delay between batches
        if (i + BATCH_SIZE < sources.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Create a backup record (simplified to avoid potential table issues)
      try {
        await prisma.backup.create({
          data: {
            storyCount: totalNewItems,
          },
        });
      } catch (error) {
        console.log(
          "Backup table doesn't exist, skipping backup record creation"
        );
      }

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
    return NextResponse.json(
      { error: "Failed to start backup" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
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
    const { auth } = await import("@clerk/nextjs");

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all user data for backup
    const user = await prisma.pesos_User.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's sources
    const userSources = await prisma.pesos_UserSources.findMany({
      where: { userId },
    });

    const sourceIds = userSources.map((us) => us.sourceId);
    const sources = await prisma.pesos_Sources.findMany({
      where: { id: { in: sourceIds } },
    });

    // Get user's posts
    const posts = await prisma.pesos_items.findMany({
      where: { userId },
      orderBy: { postdate: "desc" },
    });

    const backupData = {
      user,
      userSources,
      sources,
      posts,
      exportDate: new Date().toISOString(),
    };

    return NextResponse.json(backupData);
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}
