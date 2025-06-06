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
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { feeds } = await request.json();

    if (!Array.isArray(feeds)) {
      return NextResponse.json(
        { error: "Invalid feeds format" },
        { status: 400 }
      );
    }

    // Process feeds in batches
    const results = [];
    for (const feedUrl of feeds) {
      try {
        const source = await prisma.pesos_Sources.upsert({
          where: { url: feedUrl },
          update: {},
          create: { url: feedUrl },
        });

        await prisma.pesos_UserSources.upsert({
          where: {
            userId_sourceId: {
              userId,
              sourceId: source.id,
            },
          },
          update: {},
          create: {
            userId,
            sourceId: source.id,
          },
        });

        results.push(source);
      } catch (feedError) {
        console.error(`Error processing feed ${feedUrl}:`, feedError);
      }
    }

    return NextResponse.json({
      success: true,
      sources: results,
      processedCount: results.length,
      totalFeeds: feeds.length,
    });
  } catch (error) {
    console.error("Error migrating feeds:", error);
    return NextResponse.json(
      { error: "Failed to migrate feeds" },
      { status: 500 }
    );
  }
}
