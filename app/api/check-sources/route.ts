import { NextResponse } from "next/server";
import { parseString } from "xml2js";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";

const parseXml = promisify(parseString);

async function fetchFeed(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const validUrl = new URL(url.startsWith("http") ? url : `https://${url}`);

    const response = await fetch(validUrl.toString(), {
      headers: {
        "User-Agent": "PESOS RSS Aggregator/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out after 20 seconds");
      }
      throw error;
    }
    throw new Error("An unknown error occurred");
  } finally {
    clearTimeout(timeout);
  }
}

async function parseFeed(data: string) {
  try {
    const result = await parseXml(data, {
      explicitArray: false,
      mergeAttrs: true,
    });

    if (result.rss && result.rss.channel) {
      const channel = result.rss.channel;
      return Array.isArray(channel.item) ? channel.item : [channel.item];
    }

    if (result.feed) {
      return Array.isArray(result.feed.entry)
        ? result.feed.entry
        : [result.feed.entry];
    }

    throw new Error("Unsupported feed format");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse feed: ${error.message}`);
    }
    throw new Error("Failed to parse feed: Unknown error");
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data || typeof data.sourceId !== "number") {
      console.error("Invalid request payload:", data);
      return NextResponse.json(
        { error: "Invalid request payload. 'sourceId' must be a number." },
        { status: 400 }
      );
    }

    const { sourceId } = data;

    const source = await prisma.pesos_Sources.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const feedContent = await fetchFeed(source.url);
    const feedItems = await parseFeed(feedContent);

    const totalCount = feedItems.length;

    console.log("Prisma.pesos_items:", prisma.pesos_items);

    const storedCount = await prisma.pesos_items.count({
      where: {
        sourceId: sourceId,
      },
    });

    return NextResponse.json({ stored: storedCount, total: totalCount });
  } catch (error) {
    console.error(
      "Error checking source:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to check source" },
      { status: 500 }
    );
  }
}
