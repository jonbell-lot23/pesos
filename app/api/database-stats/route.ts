import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";
import { statsCache, STATS_CACHE_DURATION } from "@/lib/cache";

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

    // Get the local user
    const localUser = await prisma.pesos_User.findUnique({
      where: { id: userId },
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

    // Get all posts for the user, ordered by date
    const posts = await prisma.pesos_items.findMany({
      where: {
        userId: localUser.id,
      },
      orderBy: {
        postdate: "desc",
      },
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
      };

      // Cache empty stats
      statsCache.set(userId, {
        data: emptyStats,
        timestamp: now,
      });

      return NextResponse.json(emptyStats);
    }

    // Calculate total posts
    const totalPosts = posts.length;

    // Calculate days since last post
    const lastPostDate = new Date(posts[0].postdate);
    const nowDate = new Date();
    const daysSinceLastPost = Math.floor(
      (nowDate.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate average time between posts
    let totalTimeBetween = 0;
    let timeDiffs = [];
    for (let i = 0; i < posts.length - 1; i++) {
      const timeDiff =
        new Date(posts[i].postdate).getTime() -
        new Date(posts[i + 1].postdate).getTime();
      totalTimeBetween += timeDiff;
      timeDiffs.push(timeDiff);
    }
    const averageTimeBetweenPosts = Math.floor(
      totalTimeBetween / (posts.length - 1) / (1000 * 60 * 60 * 24)
    );

    // Calculate median time between posts
    timeDiffs.sort((a, b) => a - b);
    const medianTimeBetweenPosts = Math.floor(
      timeDiffs[Math.floor(timeDiffs.length / 2)] / (1000 * 60 * 60)
    );

    // Calculate average post length
    const totalLength = posts.reduce(
      (sum, post) => sum + (post.description?.length || 0),
      0
    );
    const averagePostLength = totalLength / posts.length;

    const response = {
      stats: {
        totalPosts,
        daysSinceLastPost,
        averageTimeBetweenPosts,
        medianTimeBetweenPosts,
        averagePostLength,
      },
    };

    // Cache the response
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
            error: "Database error - please try again later",
            code: "DB_ERROR",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to calculate database stats", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
