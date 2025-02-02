import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/dbPool";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json(
      { error: "sourceId is required" },
      { status: 400 }
    );
  }

  try {
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
