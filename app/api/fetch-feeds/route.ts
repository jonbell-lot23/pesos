import { NextResponse } from "next/server";
import { parseString } from "xml2js";
import { promisify } from "util";

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

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
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

async function parseFeed(url: string, data: any) {
  try {
    if (typeof data === "object") {
      // JSON feed parsing logic
      return {
        title: data.title || new URL(url).hostname,
        items: (data.items || []).map((item: any) => ({
          title: item.title || "No title",
          link: item.url || "#",
          pubDate: item.date_published || new Date().toISOString(),
          content: item.content_html || item.content_text || "",
          source: new URL(url).hostname,
        })),
      };
    } else {
      // XML feed parsing logic
      const result = await parseXml(data, {
        explicitArray: false,
        mergeAttrs: true,
      });

      if (result.rss && result.rss.channel) {
        const channel = result.rss.channel;
        return {
          title: channel.title || new URL(url).hostname,
          items: (Array.isArray(channel.item)
            ? channel.item
            : [channel.item]
          ).map((item: any) => ({
            title: item?.title || "No title",
            link: item?.link || "#",
            pubDate: item?.pubDate || new Date().toISOString(),
            content: item?.["content:encoded"] || item?.description || "",
            source: new URL(url).hostname,
          })),
        };
      }

      if (result.feed) {
        const feed = result.feed;
        return {
          title: feed.title || new URL(url).hostname,
          items: (Array.isArray(feed.entry) ? feed.entry : [feed.entry]).map(
            (entry: any) => ({
              title: entry?.title || "No title",
              link: entry?.link?.href || "#",
              pubDate: entry?.updated || new Date().toISOString(),
              content: entry?.content || "",
              source: new URL(url).hostname,
            })
          ),
        };
      }

      throw new Error("Unsupported feed format");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse feed: ${error.message}`);
    }
    throw new Error("Failed to parse feed: Unknown error");
  }
}

export async function POST(request: Request) {
  try {
    const { sources } = await request.json();

    const results = await Promise.all(
      sources.map(async (url: string) => {
        try {
          const data = await fetchFeed(url);
          const feed = await parseFeed(url, data);

          return {
            url,
            title: feed.title,
            items: feed.items,
          };
        } catch (error) {
          console.error(`Error processing source ${url}:`, error);
          return {
            url,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    const successfulResults = results.filter((result) => !result.error);
    const errors = results.filter((result) => result.error);

    const items = successfulResults.flatMap((result) => result.items);

    return NextResponse.json({
      sources: successfulResults,
      items,
      errors,
    });
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch and process sources" },
      { status: 500 }
    );
  }
}
