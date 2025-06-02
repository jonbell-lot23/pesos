import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import pool from "@/lib/dbPool";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 30000, // 30 second timeout
  headers: {
    "User-Agent": "PESOS RSS Reader/1.0",
  },
  customFields: {
    item: ["content:encoded", "description"],
  },
});

async function fetchWithTimeout(url: string, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PESOS RSS Reader/1.0",
      },
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all sources for the user through the join table
    const sourcesResult = await pool.query(
      `SELECT s.id, s.url 
       FROM "pesos_Sources" s
       INNER JOIN "pesos_UserSources" us ON us."sourceId" = s.id
       WHERE us."userId" = $1`,
      [userId]
    );

    const errors: string[] = [];
    const successes: string[] = [];

    // For each source, fetch and store its content
    for (const source of sourcesResult.rows) {
      try {
        // First check if the URL is accessible
        try {
          const response = await fetchWithTimeout(source.url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          throw new Error(
            `Failed to access feed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }

        // Then try to parse the feed
        const feed = await parser.parseURL(source.url);

        if (!feed.items?.length) {
          throw new Error("No items found in feed");
        }

        // Store each post from the feed
        for (const item of feed.items) {
          const content = item["content:encoded"] || item.content || "";
          const description = item.description || item.contentSnippet || "";
          const url = item.link || item.guid || "";
          const publishedAt = item.pubDate
            ? new Date(item.pubDate)
            : new Date();

          // Generate a unique slug from the URL
          const slug =
            url.split("/").pop() || Math.random().toString(36).substring(7);

          await pool.query(
            `INSERT INTO "pesos_items" (
              "sourceId",
              "userId", 
              title, 
              url, 
              postdate, 
              description,
              slug,
              source
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (slug) DO UPDATE SET
              title = EXCLUDED.title,
              postdate = EXCLUDED.postdate,
              description = EXCLUDED.description,
              source = EXCLUDED.source`,
            [
              source.id,
              userId,
              item.title || "Untitled",
              url,
              publishedAt,
              description,
              slug,
              source.url,
            ]
          );
        }

        successes.push(source.url);
      } catch (error) {
        const errorMessage = `Error processing ${source.url}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(errorMessage);
        errors.push(errorMessage);
        // Continue with other sources even if one fails
      }
    }

    // If we have any successes, consider it a partial success
    if (successes.length > 0) {
      return NextResponse.json({
        success: true,
        successes,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // If all failed, return an error
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process any feeds",
          errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in scrape-all:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape feeds",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
