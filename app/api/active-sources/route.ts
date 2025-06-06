import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ sources: [] });
  }

  // Only proceed if we're definitely in runtime (not build)
  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const sources = await prisma.$queryRaw`
      WITH latest_posts AS (
        SELECT 
          "sourceId",
          MAX("postdate") as latest_post_date
        FROM "pesos_items"
        GROUP BY "sourceId"
      )
      SELECT 
        s.id,
        s.url,
        lp.latest_post_date as "lastPost",
        CASE 
          WHEN us."userId" IS NOT NULL THEN true
          ELSE false
        END as "isUserSource"
      FROM "pesos_Sources" s
      LEFT JOIN latest_posts lp ON s.id = lp."sourceId"
      LEFT JOIN "pesos_UserSources" us ON s.id = us."sourceId" AND us."userId" = ${userId}::text
      WHERE s.active = 'Y'
      ORDER BY lp.latest_post_date DESC NULLS LAST
    `;

    return NextResponse.json({ sources });
  } catch (error) {
    // If anything fails, just return empty sources
    return NextResponse.json({ sources: [] });
  }
}
