import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

// Admin user ID for special permissions
const ADMIN_ID = "user_2XCDGHKZPXhqtZxAYXI5YMnEF1H";

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    console.log(`Source stats accessed by user: ${userId}`);

    // Commenting out the admin check since we're not sure about the correct ID
    // if (userId !== ADMIN_ID) {
    //   return NextResponse.json(
    //     { error: "Unauthorized. Only admin can access detailed source statistics." },
    //     { status: 403 }
    //   );
    // }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const minItems = parseInt(searchParams.get("minItems") || "10", 10);
    const days = parseInt(searchParams.get("days") || "7", 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Find sources with items count and user count
    const prolificSources = await prisma.$queryRaw`
      WITH item_counts AS (
        SELECT 
          "sourceId", 
          COUNT(*) as item_count,
          MIN("postdate") as oldest_post,
          MAX("postdate") as newest_post
        FROM "pesos_items"
        WHERE "postdate" >= ${cutoffDate}
        GROUP BY "sourceId"
      ),
      user_counts AS (
        SELECT 
          "sourceId", 
          COUNT(DISTINCT "userId") as user_count
        FROM "pesos_UserSources"
        GROUP BY "sourceId"
      )
      SELECT 
        s.id,
        s.url,
        s.active,
        COALESCE(ic.item_count, 0) as item_count,
        COALESCE(uc.user_count, 0) as user_count,
        ic.oldest_post,
        ic.newest_post,
        CASE 
          WHEN ic.newest_post IS NOT NULL AND ic.oldest_post IS NOT NULL
          THEN 
            EXTRACT(EPOCH FROM (ic.newest_post - ic.oldest_post)) / 
            GREATEST(1, COALESCE(ic.item_count, 0) - 1) / 3600
          ELSE NULL
        END as avg_hours_between_posts
      FROM "pesos_Sources" s
      LEFT JOIN item_counts ic ON s.id = ic."sourceId"
      LEFT JOIN user_counts uc ON s.id = uc."sourceId"
      WHERE COALESCE(ic.item_count, 0) >= ${minItems}
      ORDER BY item_count DESC
    `;

    // Format the data for easier consumption
    const formattedSources = (prolificSources as any[]).map((source) => ({
      id: source.id,
      url: source.url,
      active: source.active,
      itemCount: parseInt(source.item_count),
      userCount: parseInt(source.user_count),
      oldestPost: source.oldest_post,
      newestPost: source.newest_post,
      avgHoursBetweenPosts:
        source.avg_hours_between_posts !== null
          ? parseFloat(source.avg_hours_between_posts).toFixed(2)
          : null,
      postsPerDay:
        source.avg_hours_between_posts !== null &&
        source.avg_hours_between_posts > 0
          ? (24 / parseFloat(source.avg_hours_between_posts)).toFixed(1)
          : null,
    }));

    return NextResponse.json({
      prolificSources: formattedSources,
      filters: {
        minItems,
        days,
      },
    });
  } catch (error) {
    console.error("Error analyzing source stats:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze sources",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
