import { NextResponse } from "next/server";
import { ActivityLogger } from "@/lib/activity-logger";

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
    return NextResponse.json({ sources: [] });
  }

  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("../../../lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sources = await prisma.pesos_Sources.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json({ sources: [] });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // First try to find an existing source
    const existingSource = await prisma.pesos_Sources.findUnique({
      where: { url },
    });

    let source;
    if (existingSource) {
      source = existingSource;
    } else {
      source = await prisma.pesos_Sources.create({
        data: { url },
      });
    }

    // Handle the user-source relationship
    const existingRelation = await prisma.pesos_UserSources.findUnique({
      where: {
        userId_sourceId: {
          userId,
          sourceId: source.id,
        },
      },
    });

    if (!existingRelation) {
      await prisma.pesos_UserSources.create({
        data: {
          userId,
          sourceId: source.id,
        },
      });

      const { ipAddress, userAgent } = ActivityLogger.getClientInfo(request);
      await ActivityLogger.log({
        eventType: "source_added",
        userId,
        metadata: { sourceId: source.id, url },
        ipAddress,
        userAgent,
        source: "api",
      });
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Error in sources POST:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}
