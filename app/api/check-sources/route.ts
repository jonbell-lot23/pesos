import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const generateSlug = () => {
  return (
    Math.random().toString(36).substr(2, 2) +
    "-" +
    Math.random().toString(36).substr(2, 6)
  );
};

export async function POST(req: NextRequest) {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ newItems: [] });
  }

  try {
    const prisma = (await import("../../../lib/prismadb")).default;
    const RssParser = (await import("rss-parser")).default;
    const parser = new RssParser();

    const { sourceId } = await req.json();

    // Use more efficient query with index
    const source = await prisma.pesos_Sources.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        url: true,
        users: {
          take: 1, // We only need one user
          select: { userId: true },
        },
      },
    });

    if (!source || source.users.length === 0) {
      return NextResponse.json({ newItems: [] }, { status: 200 });
    }

    const userId = source.users[0].userId;

    try {
      // Fetch with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(source.url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({ newItems: [] }, { status: 200 });
      }

      const rssString = await response.text();
      const parsedFeed = await parser.parseString(rssString);

      // Get potential new URLs first
      const potentialUrls = parsedFeed.items
        .slice(0, 15)
        .map((item) => item.link)
        .filter((url): url is string => !!url);

      // Use the new compound index (userId, url) for efficient lookup
      const existingItems = await prisma.pesos_items.findMany({
        where: {
          userId,
          url: { in: potentialUrls },
        },
        select: { url: true },
      });

      const existingUrls = new Set(existingItems.map((item) => item.url));

      const newItems = parsedFeed.items
        .slice(0, 15)
        .filter((item) => item.link && !existingUrls.has(item.link))
        .map((item) => ({
          title: item.title || "•",
          url: item.link ?? "",
          description: item["content:encoded"] || item.content || "",
          postdate: new Date(item.pubDate || item.date),
          slug: generateSlug(),
          userId,
          sourceId,
        }));

      if (newItems.length > 0) {
        // Use createMany for better performance with multiple items
        await prisma.pesos_items.createMany({
          data: newItems,
          skipDuplicates: true,
        });
      }

      return NextResponse.json({ newItems }, { status: 200 });
    } catch (error) {
      // Any error in feed processing, return empty array
      return NextResponse.json({ newItems: [] }, { status: 200 });
    }
  } catch (error) {
    // Any error in the outer scope, return empty array
    return NextResponse.json({ newItems: [] }, { status: 200 });
  }
}

export async function GET() {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ sources: [] });
  }

  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("../../../lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sources = await prisma.pesos_Sources.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error checking sources:", error);
    return NextResponse.json({ sources: [] });
  }
}
