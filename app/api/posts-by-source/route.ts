import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Get user ID from auth
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get source ID from query parameters
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");
    if (!sourceId) {
      return NextResponse.json(
        { error: "Source ID is required" },
        { status: 400 }
      );
    }

    // Check if the user is subscribed to this source
    const userSource = await prisma.pesos_UserSources.findUnique({
      where: {
        userId_sourceId: {
          userId: userId,
          sourceId: parseInt(sourceId),
        },
      },
    });

    // Get posts for the specified source
    // If user is subscribed, get their posts, otherwise get any posts from this source
    const posts = await prisma.pesos_items.findMany({
      where: userSource
        ? {
            userId: userId,
            sourceId: parseInt(sourceId),
          }
        : {
            sourceId: parseInt(sourceId),
          },
      select: {
        id: true,
        title: true,
        url: true,
        postdate: true,
        description: true,
        userId: true, // Include user ID to identify if it's the current user's post
      },
      orderBy: {
        postdate: "desc",
      },
      take: 100, // Limit to the most recent 100 posts
    });

    // Add a flag to indicate if each post belongs to the current user
    const postsWithOwnership = posts.map((post) => ({
      ...post,
      isUserPost: post.userId === userId,
    }));

    return NextResponse.json({
      posts: postsWithOwnership,
      isUserSubscribed: !!userSource,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
