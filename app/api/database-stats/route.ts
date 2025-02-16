import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the local user
    const localUser = await prisma.pesos_User.findUnique({
      where: { id: userId },
    });

    if (!localUser) {
      return NextResponse.json(
        { error: "User not found in database" },
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
      return NextResponse.json({
        stats: {
          totalPosts: 0,
          daysSinceLastPost: 0,
          averageTimeBetweenPosts: 0,
          medianTimeBetweenPosts: 0,
          averagePostLength: 0,
        },
      });
    }

    // Calculate total posts
    const totalPosts = posts.length;

    // Calculate days since last post
    const lastPostDate = new Date(posts[0].postdate);
    const now = new Date();
    const daysSinceLastPost = Math.floor(
      (now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24)
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

    return NextResponse.json({
      stats: {
        totalPosts,
        daysSinceLastPost,
        averageTimeBetweenPosts,
        medianTimeBetweenPosts,
        averagePostLength,
      },
    });
  } catch (error) {
    console.error("Error calculating database stats:", error);
    return NextResponse.json(
      { error: "Failed to calculate database stats" },
      { status: 500 }
    );
  }
}
