import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import RssParser from "rss-parser";

const prisma = new PrismaClient();
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

    console.log(`Received sourceId:`, sourceId); // Log received sourceId

    if (!sourceId) {
      console.error("No sourceId provided");
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    console.log("Testing Prisma:", prisma);
    console.log(
      "Testing Prisma sources:",
      await prisma.pesos_Sources.findMany()
    );

    // Fetch source from database
    const source = await prisma.pesos_Sources.findUnique({
      where: { id: sourceId },
      select: { url: true, users: true },
    });

    if (!source) {
      console.error(`Source not found for id: ${sourceId}`);
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    console.log(`Fetching RSS feed from: ${source.url}`);

    const rssString = await fetch(source.url).then((res) => res.text());

    console.log("Fetched RSS successfully. Parsing...");

    const parsedFeed = await parser.parseString(rssString);

    console.log(`Parsed ${parsedFeed.items.length} items from feed.`);

    const existingItems = await prisma.pesos_items.findMany({
      where: { userid: source.userid },
      select: { url: true },
    });

    const existingUrls = new Set(existingItems.map((item) => item.url));

    const newItems = parsedFeed.items
      .slice(0, 15)
      .filter((item) => item.link && !existingUrls.has(item.link))
      .map((item) => ({
        title: item.title || `${source.emoji} •`,
        url: item.link,
        description: item["content:encoded"] || item.content || "",
        postdate: new Date(item.pubDate || item.date),
        slug: `${Math.random().toString(36).substr(2, 2)}-${Math.random()
          .toString(36)
          .substr(2, 5)}`,
        userid: source.userid,
        sourceId,
      }));

    console.log(`Found ${newItems.length} new items for source ${sourceId}`);

    for (let item of newItems) {
      console.log(`Saving item: ${item.title}`);
      await prisma.pesos_items.create({ data: item });
    }

    return NextResponse.json(
      { message: "Check complete", newItems },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in check-sources API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
