import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  // More targeted build detection
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json(
      { message: "Not available during build" },
      { status: 503 }
    );
  }

  try {
    const { auth } = await import("@clerk/nextjs");

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cache refresh logic would go here
    console.log(`Cache refresh initiated by user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Cache refreshed successfully",
    });
  } catch (error) {
    console.error("Error refreshing cache:", error);
    return NextResponse.json(
      { error: "Failed to refresh cache" },
      { status: 500 }
    );
  }
}
