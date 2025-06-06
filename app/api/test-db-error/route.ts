import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test database error (for testing error handling)
    console.log(`Database error test initiated by user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Database error test completed",
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json({ error: "Test database error" }, { status: 500 });
  }
}
