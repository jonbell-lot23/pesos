import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

// Your Clerk ID to exclude from stats
const ADMIN_ID = "user_2XCDGHKZPXhqtZxAYXI5YMnEF1H";

// Define the type to match the one in the update endpoint
type UpdateStatus = {
  isRunning: boolean;
  status: "idle" | "running" | "completed" | "failed";
  lastError: string | null;
  lastRun: Date | null;
  logs: string[];
  failedFeeds: Record<string, { url: string, failedAt: Date, error: string }>;
};

// This will be updated by the update endpoint
declare global {
  var updateStatus: UpdateStatus | undefined;
}

export async function GET() {
  try {
    // Check authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // Get total number of users (excluding admin)
    const totalUsers = await prisma.pesos_User.count({
      where: {
        NOT: {
          id: ADMIN_ID,
        },
      },
    });

    // Get number of users with no RSS feeds (excluding admin)
    const usersWithNoFeeds = await prisma.pesos_User.count({
      where: {
        NOT: {
          id: ADMIN_ID,
        },
        sources: {
          none: {},
        },
      },
    });

    // Get total number of sources (excluding admin's sources)
    const totalSources = await prisma.pesos_Sources.count({
      where: {
        users: {
          none: {
            userId: ADMIN_ID,
          },
        },
      },
    });

    // Get total number of items (excluding admin's items)
    const totalItems = await prisma.pesos_items.count({
      where: {
        NOT: {
          userId: ADMIN_ID,
        },
      },
    });

    // Get last sync time from global state
    const lastSyncTime = global.updateStatus?.lastRun || null;
    const syncStatus = global.updateStatus?.status || "idle";
    const isCurrentlySyncing = global.updateStatus?.isRunning || false;
    
    // Get information about failed feeds
    const failedFeeds = global.updateStatus?.failedFeeds || {};
    const failedFeedsCount = Object.keys(failedFeeds).length;
    
    // Count inactive sources
    const inactiveSourcesCount = await prisma.pesos_Sources.count({
      where: {
        active: "N"
      }
    });

    return NextResponse.json({
      totalUsers,
      usersWithNoFeeds,
      totalSources,
      totalItems,
      lastSyncTime,
      syncStatus,
      isCurrentlySyncing,
      failedFeedsCount,
      failedFeeds,
      inactiveSourcesCount,
    });
  } catch (error) {
    console.error("Error fetching server stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch server statistics" },
      { status: 500 }
    );
  }
}
