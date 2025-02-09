import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prismadb";
import RssParser from "rss-parser";

const parser = new RssParser();

const generateSlug = () => {
  return (
    Math.random().toString(36).substr(2, 2) +
    "-" +
    Math.random().toString(36).substr(2, 6)
  );
};

export async function POST(req: NextRequest) {
  try {
    const { sourceId } = await req.json();

    const source = await prisma.pesos_Sources.findUnique({
      where: { id: sourceId },
      select: { url: true, users: { select: { userId: true } } },
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

      // Fetch existing items for this user
      const existingItems = await prisma.pesos_items.findMany({
        where: { userId },
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

      // Save new items to the database
      await Promise.all(
        newItems.map((item) => prisma.pesos_items.create({ data: item }))
      );

      return NextResponse.json({ newItems }, { status: 200 });
    } catch {
      // Any error in feed processing, return empty array
      return NextResponse.json({ newItems: [] }, { status: 200 });
    }
  } catch {
    // Any error in the outer scope, return empty array
    return NextResponse.json({ newItems: [] }, { status: 200 });
  }
}
