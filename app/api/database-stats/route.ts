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

    // Get all posts for this user, ordered by date
    const posts = await prisma.pesos_items.findMany({
      where: {
        userId: localUser.id,
      },
      orderBy: {
        postdate: "desc",
      },
      select: {
        postdate: true,
        description: true,
      },
    });

    // Calculate stats
    const totalPosts = posts.length;

    // Time since last post (in days)
    const daysSinceLastPost =
      posts.length > 0
        ? Math.round(
            (Date.now() - posts[0].postdate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

    // Average and median time between posts
    let timeBetweenPosts: number[] = [];
    for (let i = 0; i < posts.length - 1; i++) {
      const diff =
        posts[i].postdate.getTime() - posts[i + 1].postdate.getTime();
      timeBetweenPosts.push(diff);
    }

    const averageTimeBetweenPosts =
      timeBetweenPosts.length > 0
        ? Math.round(
            timeBetweenPosts.reduce((a, b) => a + b, 0) /
              timeBetweenPosts.length /
              (1000 * 60 * 60 * 24)
          )
        : 0;

    const medianTimeBetweenPosts =
      timeBetweenPosts.length > 0
        ? Math.round(
            timeBetweenPosts.sort((a, b) => a - b)[
              Math.floor(timeBetweenPosts.length / 2)
            ] /
              (1000 * 60 * 60)
          )
        : 0;

    // Average post length
    const averagePostLength =
      posts.length > 0
        ? posts.reduce(
            (sum, post) => sum + (post.description?.length || 0),
            0
          ) / posts.length
        : 0;

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
    console.error("Error fetching database stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch database stats" },
      { status: 500 }
    );
  }
}
