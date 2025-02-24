import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";
import { statsCache, STATS_CACHE_DURATION } from "@/lib/cache";
import { withRetry } from "@/lib/dbPool";

export const dynamic = "force-dynamic";

// Helper function to retry database operations
async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        // Wait before retrying, with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(100 * Math.pow(2, attempt), 1000))
        );
        // Disconnect and reconnect Prisma before retrying
        await prisma.$disconnect();
        await prisma.$connect();
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      console.warn("[database-stats/GET] No userId from auth");
      return NextResponse.json(
        { error: "Unauthorized", code: "NO_USER" },
        { status: 401 }
      );
    }

    // Check cache first
    const cached = statsCache.get(userId);
    const now = Date.now();
    if (cached && now - cached.timestamp < STATS_CACHE_DURATION * 1000) {
      console.log(
        "[database-stats/GET] Returning cached data for user:",
        userId
      );
      return NextResponse.json(cached.data);
    }

    // Get the local user with retry
    const localUser = await retryOperation(async () => {
      return await prisma.pesos_User.findUnique({
        where: { id: userId },
      });
    });

    if (!localUser) {
      console.warn(
        "[database-stats/GET] No local user found for userId:",
        userId
      );
      return NextResponse.json(
        { error: "User not found in database", code: "NO_LOCAL_USER" },
        { status: 404 }
      );
    }

    // Get all posts for the user with retry
    const posts = await retryOperation(async () => {
      return await prisma.pesos_items.findMany({
        where: {
          userId: localUser.id,
        },
        orderBy: {
          postdate: "desc",
        },
        // Limit the fields we need to reduce data transfer
        select: {
          postdate: true,
          description: true,
        },
      });
    });

    // Get the last backup time
    const lastBackup = await retryOperation(async () => {
      return await prisma.backup.findFirst({
        orderBy: {
          timestamp: "desc",
        },
        select: {
          timestamp: true,
        },
      });
    });

    if (!posts || posts.length === 0) {
      const emptyStats = {
        stats: {
          totalPosts: 0,
          daysSinceLastPost: 0,
          averageTimeBetweenPosts: 0,
          medianTimeBetweenPosts: 0,
          averagePostLength: 0,
        },
        lastBackupTime: lastBackup?.timestamp || null,
      };

      statsCache.set(userId, {
        data: emptyStats,
        timestamp: now,
      });

      return NextResponse.json(emptyStats);
    }

    // Calculate statistics
    const totalPosts = posts.length;
    const lastPostDate = new Date(posts[0].postdate);
    const daysSinceLastPost = Math.floor(
      (Date.now() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate time between posts
    const timeBetweenPosts = posts.slice(0, -1).map((post, i) => {
      const currentDate = new Date(post.postdate);
      const nextDate = new Date(posts[i + 1].postdate);
      return Math.abs(currentDate.getTime() - nextDate.getTime());
    });

    const averageTimeBetweenPosts =
      timeBetweenPosts.length > 0
        ? timeBetweenPosts.reduce((a, b) => a + b, 0) / timeBetweenPosts.length
        : 0;

    // Calculate median time between posts
    const sortedTimes = [...timeBetweenPosts].sort((a, b) => a - b);
    const medianTimeBetweenPosts =
      sortedTimes.length > 0
        ? sortedTimes[Math.floor(sortedTimes.length / 2)]
        : 0;

    // Calculate average post length
    const totalLength = posts.reduce(
      (sum, post) => sum + (post.description?.length || 0),
      0
    );
    const averagePostLength = totalLength / totalPosts;

    const response = {
      stats: {
        totalPosts,
        daysSinceLastPost,
        averageTimeBetweenPosts,
        medianTimeBetweenPosts,
        averagePostLength,
      },
      lastBackupTime: lastBackup?.timestamp || null,
    };

    statsCache.set(userId, {
      data: response,
      timestamp: now,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[database-stats/GET] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("Auth") || error.message.includes("auth")) {
        return NextResponse.json(
          {
            error: "Authentication error - please try again",
            code: "AUTH_ERROR",
          },
          { status: 401 }
        );
      }

      if (error.name?.includes("Prisma")) {
        return NextResponse.json(
          {
            error: "Database connection issue - retrying...",
            code: "DB_ERROR",
            retryAfter: 5, // Suggest retry after 5 seconds
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to calculate database stats",
        code: "UNKNOWN_ERROR",
        retryAfter: 5,
      },
      { status: 500 }
    );
  }
}
