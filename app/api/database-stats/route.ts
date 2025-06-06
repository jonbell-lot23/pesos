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
    return NextResponse.json({
      stats: {
        totalUsers: 0,
        totalSources: 0,
        totalItems: 0,
        lastUpdate: new Date().toISOString(),
      },
    });
  }

  try {
    const { auth } = await import("@clerk/nextjs");
    const prisma = (await import("@/lib/prismadb")).default;

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalUsers, totalSources, totalItems] = await Promise.all([
      prisma.pesos_User.count(),
      prisma.pesos_Sources.count(),
      prisma.pesos_items.count(),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalSources,
        totalItems,
        lastUpdate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching database stats:", error);
    return NextResponse.json({
      stats: {
        totalUsers: 0,
        totalSources: 0,
        totalItems: 0,
        lastUpdate: new Date().toISOString(),
      },
    });
  }
}
