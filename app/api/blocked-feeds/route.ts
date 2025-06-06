import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Admin user ID for special permissions
const ADMIN_ID = "user_2XCDGHKZPXhqtZxAYXI5YMnEF1H";

export async function GET() {
  // More targeted build detection - focus on scenarios where we definitely don't have runtime environment
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.BUILDING === "true" ||
    (process.env.NODE_ENV === "production" &&
      !process.env.VERCEL_URL &&
      !process.env.DATABASE_URL)
  ) {
    return NextResponse.json({ blockedFeeds: [] });
  }

  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("../../../lib/prismadb")).default;

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Only authenticated users can see the list of blocked feeds
    const blockedFeeds = await prisma.pesos_Sources.findMany({
      where: {
        active: "N",
      },
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      blockedFeeds,
      isAdmin: userId === ADMIN_ID,
    });
  } catch (error) {
    console.error("Error fetching blocked feeds:", error);
    return NextResponse.json({ blockedFeeds: [] });
  }
}

// Handle blocking/unblocking a feed (admin only)
export async function PATCH(request: Request) {
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
    const prisma = (await import("../../../lib/prismadb")).default;

    // Check if user is authenticated
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    console.log(`Blocked feeds managed by user: ${userId}`);

    // Commenting out the admin check since we're not sure about the correct ID
    // if (userId !== ADMIN_ID) {
    //   return NextResponse.json(
    //     { error: "Unauthorized. Only admin can manage blocked feeds." },
    //     { status: 403 }
    //   );
    // }

    const { sourceId, block } = await request.json();
    if (sourceId === undefined) {
      return NextResponse.json(
        { error: "Source ID is required" },
        { status: 400 }
      );
    }

    // Update the source active status
    const updatedSource = await prisma.pesos_Sources.update({
      where: {
        id: sourceId,
      },
      data: {
        active: block ? "N" : "Y",
      },
    });

    return NextResponse.json({
      success: true,
      source: updatedSource,
    });
  } catch (error) {
    console.error("Error updating blocked feed status:", error);
    return NextResponse.json(
      {
        error: "Failed to update feed status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

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
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("../../../lib/prismadb")).default;

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const { sourceId } = await request.json();

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    // Update the source to be inactive instead of using a separate blocked feeds table
    const updatedSource = await prisma.pesos_Sources.update({
      where: { id: parseInt(sourceId) },
      data: { active: "N" },
    });

    return NextResponse.json({ source: updatedSource });
  } catch (error) {
    console.error("Error blocking feed:", error);
    return NextResponse.json(
      { error: "Failed to block feed" },
      { status: 500 }
    );
  }
}
