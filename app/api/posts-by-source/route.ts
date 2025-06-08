import { NextResponse } from "next/server";
import { deduplicateItems } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const prisma = (await import("@/lib/prismadb")).default;
    const { auth } = await import("@clerk/nextjs");

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    const posts = await prisma.pesos_items.findMany({
      where: {
        sourceId: parseInt(sourceId),
      },
      select: {
        id: true,
        title: true,
        url: true,
        userId: true,
        postdate: true,
        description: true,
        slug: true,
      },
      orderBy: {
        postdate: "desc",
      },
      take: 20,
    });

    // Deduplicate posts before returning
    const deduplicatedPosts = deduplicateItems(posts);
    console.log(
      "[posts-by-source] Posts after deduplication:",
      deduplicatedPosts.length
    );

    return NextResponse.json({ posts: deduplicatedPosts });
  } catch (error) {
    console.error("Error fetching posts by source:", error);
    return NextResponse.json({ posts: [] });
  }
}
