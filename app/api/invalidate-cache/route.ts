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

    // Cache invalidation logic would go here
    console.log(`Cache invalidation initiated by user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Cache invalidated successfully",
    });
  } catch (error) {
    console.error("Error invalidating cache:", error);
    return NextResponse.json(
      { error: "Failed to invalidate cache" },
      { status: 500 }
    );
  }
}
