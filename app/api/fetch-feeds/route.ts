import { NextResponse } from "next/server";
import { parseString } from "xml2js";
import { promisify } from "util";
import { auth } from "@clerk/nextjs";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  source?: string;
}

interface ParsedFeed {
  title: string;
  items: FeedItem[];
}

const parseXml = promisify(parseString);

async function fetchFeed(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PESOS RSS Aggregator/1.0",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out after 10 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseFeed(url: string, data: any): Promise<ParsedFeed> {
  try {
    if (typeof data === "object") {
      // JSON feed
      return {
        title: data.title || new URL(url).hostname,
        items: (data.items || []).map(
          (item: any): FeedItem => ({
            title: item.title || "No title",
            link: item.url || "#",
            pubDate: item.date_published || new Date().toISOString(),
            content: item.content_html || item.content_text || "",
          })
        ),
      };
    } else {
      // XML feed
      const result = await parseXml(data, {
        explicitArray: false,
        mergeAttrs: true,
      });
      if (!result.rss || !result.rss.channel) {
        throw new Error("Invalid RSS feed format");
      }
      const channel = result.rss.channel;
      return {
        title: channel.title || new URL(url).hostname,
        items: (Array.isArray(channel.item)
          ? channel.item
          : [channel.item] || []
        ).map(
          (item: any): FeedItem => ({
            title: item?.title || "No title",
            link: item?.link || "#",
            pubDate: item?.pubDate || new Date().toISOString(),
            content: item?.["content:encoded"] || item?.description || "",
          })
        ),
      };
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse feed: ${error.message}`);
    }
    throw new Error("Failed to parse feed: Unknown error");
  }
}

export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    const authResult = await auth();
    userId = authResult.userId ?? undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (authError) {
    console.error("Error during authentication:", authError);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }

  const { sources } = await request.json();
  if (!sources || !Array.isArray(sources)) {
    return NextResponse.json(
      { error: "Invalid sources format" },
      { status: 400 }
    );
  }

  const feedPromises = sources.map(async (url: string) => {
    try {
      const data = await fetchFeed(url);
      const feed = await parseFeed(url, data);
      return {
        url,
        title: feed.title,
        items: feed.items.map((item) => ({
          ...item,
          source: feed.title,
        })),
      };
    } catch (error: unknown) {
      console.error(`Error parsing feed ${url}:`, error);
      return {
        url,
        title: new URL(url).hostname,
        items: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const feedsData = await Promise.all(feedPromises);
  const allItems = feedsData
    .flatMap((feed) => feed.items)
    .sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );

  const validSources = feedsData.filter((feed) => !feed.error);
  const errors = feedsData
    .filter((feed) => feed.error)
    .map((feed) => ({ url: feed.url, error: feed.error }));

  return NextResponse.json({
    items: allItems,
    sources: validSources.map(({ url, title }) => ({ url, title })),
    errors: errors,
  });
}
