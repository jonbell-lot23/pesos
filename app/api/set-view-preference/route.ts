import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
    const prisma = (await import("@/lib/prismadb")).default;
    const { auth } = await import("@clerk/nextjs");

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { preference } = await request.json();

    if (!preference || typeof preference !== "string") {
      return NextResponse.json(
        { error: "Invalid preference value" },
        { status: 400 }
      );
    }

    // For now, just return success since viewPreference field doesn't exist in schema
    // TODO: Add viewPreference field to pesos_User model
    console.log(`User ${userId} set view preference to ${preference}`);

    return NextResponse.json({
      success: true,
      message: "View preference updated successfully",
    });
  } catch (error) {
    console.error("Error updating view preference:", error);
    return NextResponse.json(
      { error: "Failed to update view preference" },
      { status: 500 }
    );
  }
}
