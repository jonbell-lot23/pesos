"use server";

import { headers } from "next/headers";

async function normalizeUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

async function discoverRSSFeed(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "PESOS RSS Reader/1.0" },
    });
    const html = await response.text();

    // Look for RSS/Atom links using a corrected regex pattern
    const rssRegex =
      /<link[^>]+(?:type="application\/(?:rss\+xml|atom\+xml)"[^>]+href="([^"]+)"|href="([^"]+)"[^>]+type="application\/(?:rss\+xml|atom\+xml)")/i;
    const match = html.match(rssRegex);
    const feedUrl = match?.[1] || match?.[2];

    if (feedUrl) {
      try {
        return new URL(feedUrl, url).toString();
      } catch {
        return feedUrl;
      }
    }

    // If no RSS link found, check common feed paths
    const commonPaths = [
      "/feed",
      "/rss",
      "/feed.xml",
      "/atom.xml",
      "/rss.xml",
      "/index.xml",
    ];
    for (const path of commonPaths) {
      const feedUrl = new URL(path, url).toString();
      try {
        const response = await fetch(feedUrl, {
          headers: { "User-Agent": "PESOS RSS Reader/1.0" },
        });
        if (
          response.ok &&
          response.headers.get("content-type")?.includes("xml")
        ) {
          return feedUrl;
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error("Error discovering RSS feed:", error);
    return null;
  }
}

async function getPostCount(feedUrl: string): Promise<number> {
  try {
    const response = await fetch(feedUrl, {
      headers: { "User-Agent": "PESOS RSS Reader/1.0" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch feed");
    }

    const text = await response.text();

    // Count the number of <item> or <entry> tags
    const itemCount = (text.match(/<item>|<entry>/g) || []).length;

    return itemCount;
  } catch (error) {
    console.error("Error getting post count:", error);
    return 0;
  }
}

export async function validateRSSFeed(url: string) {
  try {
    const normalizedUrl = await normalizeUrl(url);
    let feedUrl = normalizedUrl;

    // Try to discover feed if not a direct feed URL
    if (
      !url.includes("/feed") &&
      !url.includes("/rss") &&
      !url.endsWith(".xml")
    ) {
      const discoveredUrl = await discoverRSSFeed(normalizedUrl);
      if (discoveredUrl) {
        feedUrl = discoveredUrl;
      } else {
        throw new Error("No RSS feed found");
      }
    }

    // Validate the feed
    const response = await fetch(feedUrl, {
      headers: { "User-Agent": "PESOS RSS Reader/1.0" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch feed");
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("xml")) {
      throw new Error("Invalid feed format");
    }

    const text = await response.text();

    // Basic XML validation
    if (!text.includes("<rss") && !text.includes("<feed")) {
      throw new Error("Invalid feed format");
    }

    // Extract title using a simpler regex pattern
    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(text);
    const title = titleMatch?.[1]?.trim() || "Untitled Feed";

    // Get post count
    const postCount = await getPostCount(feedUrl);

    return {
      success: true,
      feedUrl: feedUrl !== normalizedUrl ? feedUrl : undefined,
      title,
      postCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid RSS feed",
    };
  }
}
