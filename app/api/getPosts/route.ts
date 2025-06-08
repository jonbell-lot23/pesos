import { NextResponse } from "next/server";
import { deduplicateItems } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  // More targeted build detection
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
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all items for accurate counting
    const allItems = await prisma.pesos_items.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        url: true,
        userId: true,
      },
    });

    // Get paginated items for display
    const displayItems = await prisma.pesos_items.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        url: true,
        userId: true,
        postdate: true,
        description: true,
        slug: true,
      },
      orderBy: { postdate: "desc" },
      take: 50,
    });

    // Deduplicate both sets
    const deduplicatedAllItems = deduplicateItems(allItems);
    const deduplicatedDisplayItems = deduplicateItems(displayItems);

    console.log("[getPosts] Total unique items:", deduplicatedAllItems.length);
    console.log(
      "[getPosts] Display items after deduplication:",
      deduplicatedDisplayItems.length
    );

    return NextResponse.json({
      posts: deduplicatedDisplayItems,
      total: deduplicatedAllItems.length,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ posts: [] });
  }
}
