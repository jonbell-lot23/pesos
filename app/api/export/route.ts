import { NextResponse } from "next/server";
import { ActivityLogger } from "@/lib/activity-logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    // Fetch all data related to the user
    const userData = await prisma.pesos_User.findUnique({
      where: { id: userId },
      include: {
        sources: {
          include: {
            source: true,
          },
        },
        pesos_items: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { ipAddress, userAgent } = ActivityLogger.getClientInfo(request);

    await ActivityLogger.log({
      eventType: "export_requested",
      userId,
      metadata: {
        exportType: "JSON",
        itemCount: userData.pesos_items.length,
      },
      ipAddress,
      userAgent,
      source: "api",
    });

    // Create a JSON response with the appropriate headers for download
    return new NextResponse(JSON.stringify(userData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=backup.json",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
