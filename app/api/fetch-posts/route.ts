import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json(
      { error: "sourceId is required" },
      { status: 400 }
    );
  }

  try {
    const pool = (await import("@/lib/dbPool")).default;

    const queryText = `
      SELECT id, title, url 
      FROM public.pesos_items 
      WHERE "sourceId" = $1;
    `;
    const { rows } = await pool.query(queryText, [sourceId]);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error fetching posts for source", sourceId, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
