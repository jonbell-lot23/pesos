import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";
import {
  postsCache,
  POSTS_CACHE_DURATION,
  getPostsCacheKey,
} from "@/lib/cache";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      console.warn("[getPosts/GET] No userId from auth");
      return NextResponse.json(
        { error: "Unauthorized", code: "NO_USER" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "25");
    const getAll = searchParams.get("all") === "true";

    // Check cache first
    const cacheKey = getPostsCacheKey(userId, offset, limit, getAll);
    const cached = postsCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < POSTS_CACHE_DURATION * 1000) {
      console.log("[getPosts/GET] Returning cached data for key:", cacheKey);
      return NextResponse.json(cached.data);
    }

    // Get the local user
    const localUser = await prisma.pesos_User.findUnique({
      where: { id: userId },
    });

    if (!localUser) {
      console.warn("[getPosts/GET] No local user found for userId:", userId);
      return NextResponse.json(
        { error: "User not found in database", code: "NO_LOCAL_USER" },
        { status: 404 }
      );
    }

    // Get total count
    const total = await prisma.pesos_items.count({
      where: {
        userId: localUser.id,
      },
    });

    // Get posts with pagination
    const posts = await prisma.pesos_items.findMany({
      where: {
        userId: localUser.id,
      },
      include: {
        pesos_Sources: {
          select: {
            url: true,
          },
        },
      },
      orderBy: {
        postdate: "desc",
      },
      ...(getAll ? {} : { skip: offset, take: limit }),
    });

    const response = {
      posts,
      total,
    };

    // Cache the response
    postsCache.set(cacheKey, {
      data: response,
      timestamp: now,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[getPosts/GET] Error details:", {
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
      { error: "Failed to fetch posts", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

// Function to manually clear cache for a user
export async function clearPostsCache(userId: string) {
  // Clear all cache entries for this user
  Array.from(postsCache.keys()).forEach((key) => {
    if (key.startsWith(userId)) {
      postsCache.delete(key);
    }
  });
}
