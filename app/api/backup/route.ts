import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";
import Parser from "rss-parser";

const parser = new Parser();

// Initialize global state if not exists
if (!global.backupStatus) {
  global.backupStatus = {
    isRunning: false,
    status: "idle",
  };
}

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (global.backupStatus.isRunning) {
      return NextResponse.json(
        { error: "Backup already in progress" },
        { status: 409 }
      );
    }

    global.backupStatus.isRunning = true;
    global.backupStatus.status = "running";

    try {
      // Get all sources for the user
      const userSources = await prisma.pesos_UserSources.findMany({
        where: { userId },
        include: {
          source: true,
        },
      });

      let totalNewItems = 0;

      // Process each source
      for (const userSource of userSources) {
        try {
          // Fetch with timeout
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(userSource.source.url, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (!response.ok) continue;

          const rssString = await response.text();
          const parsedFeed = await parser.parseString(rssString);

          // Get potential new URLs
          const potentialUrls = parsedFeed.items
            .slice(0, 15)
            .map((item) => item.link)
            .filter((url): url is string => !!url);

          // Check which items already exist
          const existingItems = await prisma.pesos_items.findMany({
            where: {
              userId,
              url: { in: potentialUrls },
            },
            select: { url: true },
          });

          const existingUrls = new Set(existingItems.map((item) => item.url));

          // Prepare new items for insertion
          const newItems = parsedFeed.items
            .slice(0, 15)
            .filter((item) => item.link && !existingUrls.has(item.link))
            .map((item) => ({
              title: item.title || "•",
              url: item.link ?? "",
              description: item["content:encoded"] || item.content || "",
              postdate: new Date(item.pubDate || item.date),
              slug: Math.random().toString(36).substring(2, 15),
              userId,
              sourceId: userSource.sourceId,
            }));

          if (newItems.length > 0) {
            // Store new items
            await prisma.pesos_items.createMany({
              data: newItems,
              skipDuplicates: true,
            });
            totalNewItems += newItems.length;
          }
        } catch (error) {
          console.error(
            `Error processing source ${userSource.source.url}:`,
            error
          );
          continue; // Continue with next source even if one fails
        }
      }

      // Create a backup record
      const backup = await prisma.backup.create({
        data: {
          storyCount: totalNewItems,
        },
      });

      global.backupStatus.isRunning = false;
      global.backupStatus.status = "completed";

      return NextResponse.json({
        status: "completed",
        storyCount: totalNewItems,
      });
    } catch (error) {
      global.backupStatus.isRunning = false;
      global.backupStatus.status = "failed";
      throw error; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error("Error in backup:", error);
    return NextResponse.json(
      { error: "Failed to start backup" },
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
